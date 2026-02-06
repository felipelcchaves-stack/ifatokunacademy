import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';

/**
 * Hook que detecta se estamos numa rota /org/:slug e retorna
 * uma função para gerar paths com o prefixo correto.
 */
export const useOrgNavigate = () => {
  const location = useLocation();

  const orgSlug = useMemo(() => {
    const match = location.pathname.match(/^\/org\/([^/]+)/);
    return match ? match[1] : null;
  }, [location.pathname]);

  const isOrgRoute = !!orgSlug;

  /**
   * Gera um path com prefixo de org se estamos numa rota /org/:slug.
   * Ex: getOrgPath('/dashboard') => '/org/ijoifatokun/dashboard'
   */
  const getOrgPath = (path: string): string => {
    if (!isOrgRoute || !orgSlug) return path;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `/org/${orgSlug}/${cleanPath}`;
  };

  return { orgSlug, isOrgRoute, getOrgPath };
};
