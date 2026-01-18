import React, { createContext, useContext, ReactNode } from 'react';
import { useParams } from 'react-router-dom';

interface OrgRouteContextType {
  orgSlug: string | null;
  isOrgRoute: boolean;
  getOrgPath: (path: string) => string;
}

const OrgRouteContext = createContext<OrgRouteContextType | undefined>(undefined);

/**
 * Provider que detecta se estamos em uma rota de organização (/org/:orgSlug/...)
 * e fornece métodos para construir paths corretamente
 */
export const OrgRouteProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  
  const isOrgRoute = !!orgSlug;
  
  const getOrgPath = (path: string): string => {
    if (!isOrgRoute || !orgSlug) {
      return path;
    }
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `/org/${orgSlug}/${cleanPath}`;
  };

  return (
    <OrgRouteContext.Provider value={{ orgSlug: orgSlug || null, isOrgRoute, getOrgPath }}>
      {children}
    </OrgRouteContext.Provider>
  );
};

export const useOrgRoute = (): OrgRouteContextType => {
  const context = useContext(OrgRouteContext);
  if (!context) {
    // Fallback para quando não estamos dentro do provider
    return {
      orgSlug: null,
      isOrgRoute: false,
      getOrgPath: (path: string) => path,
    };
  }
  return context;
};
