import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserOrganization {
  id: string;
  organization_id: string;
  role: 'member' | 'admin' | 'owner';
  is_primary: boolean;
  joined_at: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    branding: Record<string, unknown> | null;
  };
}

interface UseUserOrganizationsReturn {
  organizations: UserOrganization[];
  loading: boolean;
  error: string | null;
  currentOrg: UserOrganization | null;
  switchOrganization: (orgId: string) => Promise<void>;
  setPrimaryOrganization: (orgId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export const useUserOrganizations = (): UseUserOrganizationsReturn => {
  const { user, isAdmin } = useAuth();
  const [organizations, setOrganizations] = useState<UserOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);

  const fetchOrganizations = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let orgs: UserOrganization[] = [];

      if (isAdmin) {
        // Admin global: buscar TODAS as organizações ativas
        const { data, error: fetchError } = await supabase
          .from('organizations')
          .select('id, name, slug, branding')
          .eq('is_active', true)
          .order('name');

        if (fetchError) throw fetchError;

        // Buscar memberships do admin para saber quais são primárias
        const { data: memberships } = await supabase
          .from('organization_members')
          .select('organization_id, is_primary, role')
          .eq('user_id', user.id);

        const membershipMap = new Map(
          (memberships || []).map(m => [m.organization_id, m])
        );

        orgs = (data || []).map(org => {
          const membership = membershipMap.get(org.id);
          return {
            id: membership?.organization_id || org.id,
            organization_id: org.id,
            role: (membership?.role as 'member' | 'admin' | 'owner') || 'admin',
            is_primary: membership?.is_primary || false,
            joined_at: new Date().toISOString(),
            organization: {
              id: org.id,
              name: org.name,
              slug: org.slug,
              branding: org.branding as Record<string, unknown> | null,
            },
          };
        });

        // Ordenar: primária primeiro
        orgs.sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
      } else {
        // Usuário normal: buscar via organization_members
        const { data, error: fetchError } = await supabase
          .from('organization_members')
          .select(`
            id,
            organization_id,
            role,
            is_primary,
            joined_at,
            organizations:organization_id (
              id,
              name,
              slug,
              branding
            )
          `)
          .eq('user_id', user.id)
          .order('is_primary', { ascending: false });

        if (fetchError) throw fetchError;

        orgs = (data || [])
          .filter(item => item.organizations)
          .map(item => ({
            id: item.id,
            organization_id: item.organization_id,
            role: item.role as 'member' | 'admin' | 'owner',
            is_primary: item.is_primary,
            joined_at: item.joined_at,
            organization: item.organizations as unknown as UserOrganization['organization'],
          }));
      }

      setOrganizations(orgs);

      // Se não tem org atual selecionada, usar a primária
      if (!currentOrgId && orgs.length > 0) {
        const primary = orgs.find(o => o.is_primary) || orgs[0];
        setCurrentOrgId(primary.organization_id);
      }
    } catch (err) {
      console.error('Error fetching user organizations:', err);
      setError('Erro ao carregar organizações');
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, currentOrgId]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const switchOrganization = useCallback(async (orgId: string) => {
    setCurrentOrgId(orgId);
    // Redirecionar para o dashboard da organização
    const org = organizations.find(o => o.organization_id === orgId);
    if (org) {
      window.location.href = `/org/${org.organization.slug}/dashboard`;
    }
  }, [organizations]);

  const setPrimaryOrganization = useCallback(async (orgId: string) => {
    if (!user) return;

    try {
      // Remover is_primary de todas as outras orgs
      await supabase
        .from('organization_members')
        .update({ is_primary: false })
        .eq('user_id', user.id);

      // Definir a nova org como primária
      await supabase
        .from('organization_members')
        .update({ is_primary: true })
        .eq('user_id', user.id)
        .eq('organization_id', orgId);

      // Atualizar o organization_id no perfil também
      await supabase
        .from('profiles')
        .update({ organization_id: orgId })
        .eq('id', user.id);

      // Refetch para atualizar estado
      await fetchOrganizations();
    } catch (err) {
      console.error('Error setting primary organization:', err);
    }
  }, [user, fetchOrganizations]);

  const currentOrg = organizations.find(o => o.organization_id === currentOrgId) || 
                     organizations.find(o => o.is_primary) || 
                     organizations[0] || 
                     null;

  return {
    organizations,
    loading,
    error,
    currentOrg,
    switchOrganization,
    setPrimaryOrganization,
    refetch: fetchOrganizations,
  };
};
