import React, { useEffect, useState, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { hubSso } from '@/lib/hubSsoProject';
import { currentSessionStatus } from '@/lib/hubSsoSession';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  // Se true, permite acesso também para org admins (não apenas global admins)
  allowOrgAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = false,
  allowOrgAdmin = false 
}) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const { isOrgAdmin, loading: orgLoading } = useOrganization();
  const location = useLocation();
  // Start as false to avoid unnecessary loading state for users without MFA
  const [mfaChecking, setMfaChecking] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const mfaCheckedOnce = useRef(false);

  useEffect(() => {
    console.log('[ProtectedRoute] Effect:', { loading, isAuthenticated, mfaCheckedOnce: mfaCheckedOnce.current });
    
    // Skip MFA check entirely if still loading auth or not authenticated
    if (loading) {
      console.log('[ProtectedRoute] Still loading, waiting...');
      return;
    }
    
    if (!isAuthenticated) {
      console.log('[ProtectedRoute] Not authenticated, will redirect to login');
      mfaCheckedOnce.current = false; // Reset for next login
      setMfaChecking(false);
      return;
    }
    
    // Only check MFA once per session
    if (!mfaCheckedOnce.current) {
      console.log('[ProtectedRoute] Checking MFA level...');
      mfaCheckedOnce.current = true;
      setMfaChecking(true);
      checkMFALevel();
    }
  }, [isAuthenticated, loading]);

  const checkMFALevel = async () => {
    try {
      // A session opened through the hub already passed the hub's second factor (TOTP):
      // asking for the Supabase MFA code again would be a second 2FA (deploy/HUB-SSO.md).
      if (hubSso.enabled) {
        const hub = await currentSessionStatus();
        if (hub !== 'unknown' && hub.status === 'active') {
          setMfaRequired(false);
          return;
        }
      }
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      console.log('[ProtectedRoute] MFA level check:', { data, error: error?.message });
      if (error) throw error;
      
      // If user has MFA enrolled (nextLevel is aal2) but current session is only aal1
      // They need to verify MFA
      if (data.currentLevel === 'aal1' && data.nextLevel === 'aal2') {
        console.log('[ProtectedRoute] MFA required');
        setMfaRequired(true);
      } else {
        console.log('[ProtectedRoute] No MFA required');
        setMfaRequired(false);
      }
    } catch (error) {
      console.error('Error checking MFA level:', error);
      setMfaRequired(false);
    } finally {
      setMfaChecking(false);
    }
  };

  if (loading || mfaChecking || orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('[ProtectedRoute] Redirecting to /login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If MFA is required but not verified, redirect to MFA verification
  if (mfaRequired) {
    console.log('[ProtectedRoute] MFA required, redirecting to /mfa-verify');
    return <Navigate to="/mfa-verify" state={{ from: location }} replace />;
  }

  // Verificar permissões de admin
  if (requireAdmin) {
    // Se allowOrgAdmin é true, aceitar tanto admin global quanto org admin
    const hasAccess = allowOrgAdmin ? (isAdmin || isOrgAdmin) : isAdmin;
    
    if (!hasAccess) {
      console.log('[ProtectedRoute] Admin required but not authorized, redirecting to /dashboard');
      return <Navigate to="/dashboard" replace />;
    }
  }

  console.log('[ProtectedRoute] Access granted');
  return <>{children}</>;
};

export default ProtectedRoute;
