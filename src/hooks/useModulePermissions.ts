import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ModulePermission {
  module_id: string;
  granted_at: string;
}

export const useModulePermissions = () => {
  const { user, isAdmin } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [userOrgId, setUserOrgId] = useState<string | null>(null);
  const [adminOrgIds, setAdminOrgIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setUserOrgId(null);
      setAdminOrgIds([]);
      setLoading(false);
      return;
    }

    if (isAdmin) {
      setLoading(false);
      return;
    }

    try {
      const [permsRes, profileRes, orgAdminRes] = await Promise.all([
        supabase.from('user_module_permissions').select('module_id').eq('user_id', user.id),
        supabase.from('profiles').select('organization_id').eq('id', user.id).maybeSingle(),
        supabase.from('organization_admins').select('organization_id').eq('user_id', user.id),
      ]);

      setPermissions((permsRes.data || []).map((p: ModulePermission) => p.module_id));
      setUserOrgId(profileRes.data?.organization_id || null);
      setAdminOrgIds((orgAdminRes.data || []).map((r: any) => r.organization_id));
    } catch (error) {
      console.error('Erro ao buscar permissões:', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasAccess = useCallback(
    (moduleId: string, isPublished?: boolean, moduleOrgId?: string | null): boolean => {
      // Global admin: tudo
      if (isAdmin) return true;

      // Admin da organização do módulo
      if (moduleOrgId && adminOrgIds.includes(moduleOrgId)) return true;

      // Módulo publicado e pertence à organização do usuário (ou é global)
      if (isPublished) {
        if (moduleOrgId == null) return true;
        if (userOrgId && moduleOrgId === userOrgId) return true;
      }

      // Permissão explícita (para previews de módulos despublicados)
      return permissions.includes(moduleId);
    },
    [isAdmin, permissions, userOrgId, adminOrgIds]
  );

  const refetch = useCallback(() => {
    setLoading(true);
    fetchPermissions();
  }, [fetchPermissions]);

  return {
    permissions,
    hasAccess,
    loading,
    refetch,
    isAdmin,
  };
};
