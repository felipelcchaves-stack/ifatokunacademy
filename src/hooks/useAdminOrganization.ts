import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AdminOrganization {
  id: string;
  name: string;
  slug: string;
  branding: Record<string, unknown> | null;
}

interface UseAdminOrganizationReturn {
  activeOrg: AdminOrganization | null;
  organizations: AdminOrganization[];
  loading: boolean;
  switchOrganization: (orgId: string) => void;
  refetch: () => Promise<void>;
}

const ADMIN_ACTIVE_ORG_KEY = 'admin_active_org';

export const useAdminOrganization = (): UseAdminOrganizationReturn => {
  const { user, isAdmin } = useAuth();
  const [organizations, setOrganizations] = useState<AdminOrganization[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(() => {
    // Recuperar do localStorage se existir
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ADMIN_ACTIVE_ORG_KEY);
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  const fetchOrganizations = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Buscar organizações do usuário via organization_members
      const { data: membershipData, error: membershipError } = await supabase
        .from('organization_members')
        .select(`
          organization_id,
          is_primary,
          role,
          organizations:organization_id (
            id,
            name,
            slug,
            branding
          )
        `)
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false });

      if (membershipError) throw membershipError;

      // Transformar dados
      const orgs: AdminOrganization[] = (membershipData || [])
        .filter(item => item.organizations)
        .map(item => ({
          id: (item.organizations as any).id,
          name: (item.organizations as any).name,
          slug: (item.organizations as any).slug,
          branding: (item.organizations as any).branding,
        }));

      setOrganizations(orgs);

      // Determinar org ativa
      const savedOrgId = localStorage.getItem(ADMIN_ACTIVE_ORG_KEY);
      
      if (savedOrgId && orgs.find(o => o.id === savedOrgId)) {
        // Usar a org salva se ainda existir
        setActiveOrgId(savedOrgId);
      } else if (orgs.length > 0) {
        // Caso contrário, usar a primeira (que é a primária devido ao order)
        const primaryOrg = orgs[0];
        setActiveOrgId(primaryOrg.id);
        localStorage.setItem(ADMIN_ACTIVE_ORG_KEY, primaryOrg.id);
      }
    } catch (err) {
      console.error('Error fetching admin organizations:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const switchOrganization = useCallback((orgId: string) => {
    setActiveOrgId(orgId);
    localStorage.setItem(ADMIN_ACTIVE_ORG_KEY, orgId);
    // Recarregar a página para garantir que todos os dados sejam atualizados
    window.location.reload();
  }, []);

  const activeOrg = organizations.find(o => o.id === activeOrgId) || organizations[0] || null;

  return {
    activeOrg,
    organizations,
    loading,
    switchOrganization,
    refetch: fetchOrganizations,
  };
};
