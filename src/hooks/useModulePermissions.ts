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
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    // Admins têm acesso a todos os módulos
    if (isAdmin) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_module_permissions')
        .select('module_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Erro ao buscar permissões:', error);
        setPermissions([]);
      } else {
        setPermissions(data?.map((p: ModulePermission) => p.module_id) || []);
      }
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

  const hasAccess = useCallback((moduleId: string): boolean => {
    // Admins têm acesso a tudo
    if (isAdmin) return true;
    return permissions.includes(moduleId);
  }, [isAdmin, permissions]);

  const refetch = useCallback(() => {
    setLoading(true);
    fetchPermissions();
  }, [fetchPermissions]);

  return { 
    permissions, 
    hasAccess, 
    loading, 
    refetch,
    isAdmin 
  };
};
