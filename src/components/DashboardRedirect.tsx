import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Componente que redireciona /dashboard para /org/:slug/dashboard
 * baseado na organização primária do usuário.
 * 
 * IMPORTANTE: Em um sistema multi-tenant strict, não deve existir
 * dashboard "global" - todo usuário opera dentro de uma organização.
 */
const DashboardRedirect: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [targetSlug, setTargetSlug] = useState<string | null>(null);

  useEffect(() => {
    const findPrimaryOrg = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Buscar organização primária via organization_members
        const { data: membership } = await supabase
          .from('organization_members')
          .select(`
            organization_id,
            is_primary,
            organizations:organization_id (
              slug
            )
          `)
          .eq('user_id', user.id)
          .order('is_primary', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (membership?.organizations) {
          setTargetSlug((membership.organizations as any).slug);
          setLoading(false);
          return;
        }

        // Fallback: buscar via profile.organization_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (profile?.organization_id) {
          const { data: org } = await supabase
            .from('organizations')
            .select('slug')
            .eq('id', profile.organization_id)
            .single();
          
          if (org?.slug) {
            setTargetSlug(org.slug);
            setLoading(false);
            return;
          }
        }

        // Último fallback: usar organização padrão
        setTargetSlug('ifatokun');
      } catch (err) {
        console.error('Error finding primary org:', err);
        // Em caso de erro, usar organização padrão
        setTargetSlug('ifatokun');
      } finally {
        setLoading(false);
      }
    };

    findPrimaryOrg();
  }, [user, isAdmin]);

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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (targetSlug) {
    return <Navigate to={`/org/${targetSlug}/dashboard`} replace />;
  }

  // Fallback absoluto
  return <Navigate to="/org/ifatokun/dashboard" replace />;
};

export default DashboardRedirect;
