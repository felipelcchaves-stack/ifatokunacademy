import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';

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
  syncFromTenantContext: (orgId: string) => void;
}

const ADMIN_ACTIVE_ORG_KEY = 'admin_active_org';

export const useAdminOrganization = (): UseAdminOrganizationReturn => {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const [organizations, setOrganizations] = useState<AdminOrganization[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(() => {
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

      let orgs: AdminOrganization[] = [];

      if (isAdmin) {
        // Admin global: buscar TODAS as organizações ativas
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, slug, branding')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;

        orgs = (data || []).map(org => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          branding: org.branding as Record<string, unknown> | null,
        }));
      } else {
        // Org admin: buscar apenas organizações onde é membro
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

        orgs = (membershipData || [])
          .filter(item => item.organizations)
          .map(item => ({
            id: (item.organizations as any).id,
            name: (item.organizations as any).name,
            slug: (item.organizations as any).slug,
            branding: (item.organizations as any).branding,
          }));
      }

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
  }, [user, isAdmin]);

  // Sincronizar org do contexto tenant (quando vem de /org/:slug)
  const syncFromTenantContext = useCallback((orgId: string) => {
    if (orgId) {
      setActiveOrgId(orgId);
      localStorage.setItem(ADMIN_ACTIVE_ORG_KEY, orgId);
    }
  }, []);

  // Fetch organizations on mount
  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  // Auto-sync quando navegando de /org/:slug para /admin
  useEffect(() => {
    const match = location.pathname.match(/^\/org\/([^/]+)/);
    if (match) {
      const orgSlug = match[1];
      // Buscar org por slug e sincronizar
      supabase
        .from('organizations')
        .select('id')
        .eq('slug', orgSlug)
        .single()
        .then(({ data }) => {
          if (data?.id) {
            syncFromTenantContext(data.id);
          }
        });
    }
  }, [location.pathname, syncFromTenantContext]);

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
    syncFromTenantContext,
  };
};
