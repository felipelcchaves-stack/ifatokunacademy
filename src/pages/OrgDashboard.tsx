import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Dashboard from './Dashboard';

/**
 * Wrapper component for organization-specific dashboard
 * Sets the organization context based on URL parameter
 */
const OrgDashboard: React.FC = () => {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [loading, setLoading] = useState(true);
  const [orgExists, setOrgExists] = useState(false);

  useEffect(() => {
    const validateOrg = async () => {
      if (!orgSlug) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, is_active')
          .eq('slug', orgSlug)
          .single();

        if (!error && data?.is_active) {
          setOrgExists(true);
        }
      } catch (err) {
        console.error('Error validating org:', err);
      } finally {
        setLoading(false);
      }
    };

    validateOrg();
  }, [orgSlug]);

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

  return <Dashboard />;
};

export default OrgDashboard;
