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
    // Skip MFA check entirely if still loading auth or not authenticated
    if (loading) return;
    
    if (!isAuthenticated) {
      mfaCheckedOnce.current = false; // Reset for next login
      setMfaChecking(false);
      return;
    }
    
    // Only check MFA once per session
    if (!mfaCheckedOnce.current) {
      mfaCheckedOnce.current = true;
      setMfaChecking(true);
      checkMFALevel();
    }
  }, [isAuthenticated, loading]);

  const checkMFALevel = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) throw error;
      
      // If user has MFA enrolled (nextLevel is aal2) but current session is only aal1
      // They need to verify MFA
      if (data.currentLevel === 'aal1' && data.nextLevel === 'aal2') {
        setMfaRequired(true);
      } else {
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
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If MFA is required but not verified, redirect to MFA verification
  if (mfaRequired) {
    return <Navigate to="/mfa-verify" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
