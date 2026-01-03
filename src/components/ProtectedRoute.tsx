import React, { useEffect, useState, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
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

  if (loading || mfaChecking) {
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

  if (requireAdmin && !isAdmin) {
    console.log('[ProtectedRoute] Admin required but not admin, redirecting to /dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  console.log('[ProtectedRoute] Access granted');
  return <>{children}</>;
};

export default ProtectedRoute;
