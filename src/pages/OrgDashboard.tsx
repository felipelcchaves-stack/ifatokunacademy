import React, { useEffect, useState } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import Dashboard from './Dashboard';

/**
 * Wrapper component for organization-specific dashboard
 * Sets the organization context based on URL parameter
 * Also validates that the current user has access to this organization
 */
const OrgDashboard: React.FC = () => {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orgExists, setOrgExists] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    const validateOrgAndAccess = async () => {
      if (!orgSlug) {
        setLoading(false);
        return;
      }

      try {
        // First, validate the organization exists
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, name, is_active')
          .eq('slug', orgSlug)
          .single();

        if (orgError || !orgData?.is_active) {
          setOrgExists(false);
          setLoading(false);
          return;
        }

        setOrgExists(true);
        setOrgName(orgData.name);
        setOrgId(orgData.id);

        // If no user, redirect to login
        if (!user) {
          setLoading(false);
          return;
        }

        // Global admins have access to everything
        if (isAdmin) {
          setHasAccess(true);
          setLoading(false);
          return;
        }

        // Check if user belongs to this organization via membership table
        const { data: membership } = await supabase
          .from('organization_members')
          .select('id')
          .eq('user_id', user.id)
          .eq('organization_id', orgData.id)
          .maybeSingle();

        if (membership) {
          setHasAccess(true);
          setLoading(false);
          return;
        }

        // Fallback: Check if user belongs via profile.organization_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (profile?.organization_id === orgData.id) {
          setHasAccess(true);
          setLoading(false);
          return;
        }

        // Check if user is an org admin for this organization
        const { data: orgAdminCheck } = await supabase
          .from('organization_admins')
          .select('id')
          .eq('organization_id', orgData.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (orgAdminCheck) {
          setHasAccess(true);
        } else {
          setHasAccess(false);
        }
      } catch (err) {
        console.error('Error validating org:', err);
      } finally {
        setLoading(false);
      }
    };

    validateOrgAndAccess();
  }, [orgSlug, user, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!orgExists) {
    return <Navigate to="/login" replace />;
  }

  // User not logged in - redirect to org login
  if (!user) {
    return <Navigate to={`/org/${orgSlug}/login`} replace />;
  }

  // User logged in but doesn't have access to this org
  if (!hasAccess) {
    const handleLogout = async () => {
      await supabase.auth.signOut();
      navigate(`/org/${orgSlug}/login`);
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center max-w-md p-8">
          <AlertCircle className="w-16 h-16 text-amber-500" />
          <h1 className="text-2xl font-bold text-foreground">Acesso Restrito</h1>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar a organização "{orgName}".
          </p>
          <p className="text-muted-foreground text-sm">
            Sua conta está vinculada a outra organização.
          </p>
          <div className="flex gap-4 mt-4">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Ir para meu Dashboard
            </Button>
            <Button onClick={handleLogout}>
              Fazer Logout e Entrar Novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <Dashboard organizationId={orgId} orgName={orgName} />;
};

export default OrgDashboard;
