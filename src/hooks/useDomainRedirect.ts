import React, { useEffect } from 'react';

/**
 * Hook para gerenciar redirecionamentos de domínio
 * - HTTP para HTTPS
 * - www para non-www (ou vice-versa, configurável)
 * - Subdomínios para domínio principal se necessário
 */

interface DomainRedirectOptions {
  // Se true, redireciona www.example.com para example.com
  // Se false, redireciona example.com para www.example.com
  preferNonWww?: boolean;
  // Se true, força HTTPS (redirecionamento client-side como fallback)
  forceHttps?: boolean;
  // Domínios que não devem ser redirecionados (localhost, preview, etc)
  excludedDomains?: string[];
}

const defaultOptions: DomainRedirectOptions = {
  preferNonWww: true,
  forceHttps: true,
  excludedDomains: [
    'localhost',
    '127.0.0.1',
    'lovable.app',
    'lovableproject.com',
  ],
};

/**
 * Verifica se o hostname atual deve ser excluído dos redirecionamentos
 */
const isExcludedDomain = (hostname: string, excludedDomains: string[]): boolean => {
  return excludedDomains.some(excluded => 
    hostname === excluded || hostname.endsWith(`.${excluded}`)
  );
};

/**
 * Hook que executa redirecionamentos de domínio no lado do cliente
 * Nota: Redirecionamentos server-side são preferíveis, mas este hook
 * serve como fallback para casos onde o servidor não está configurado
 */
export const useDomainRedirect = (options: DomainRedirectOptions = {}) => {
  const mergedOptions = { ...defaultOptions, ...options };
  const { preferNonWww, forceHttps, excludedDomains } = mergedOptions;

  useEffect(() => {
    const { protocol, hostname, pathname, search, hash } = window.location;

    // Não fazer nada em domínios excluídos
    if (isExcludedDomain(hostname, excludedDomains || [])) {
      return;
    }

    let shouldRedirect = false;
    let newProtocol = protocol;
    let newHostname = hostname;

    // Verificar HTTPS
    if (forceHttps && protocol === 'http:') {
      newProtocol = 'https:';
      shouldRedirect = true;
    }

    // Verificar www
    const startsWithWww = hostname.startsWith('www.');
    const isLovableDomain = hostname.includes('.lovable');
    
    if (preferNonWww && startsWithWww) {
      newHostname = hostname.slice(4); // Remove 'www.'
      shouldRedirect = true;
    } else if (!preferNonWww && !startsWithWww && !isLovableDomain) {
      // Adicionar www apenas em domínios customizados, não em subdomínios do lovable
      newHostname = `www.${hostname}`;
      shouldRedirect = true;
    }

    // Executar redirecionamento se necessário
    if (shouldRedirect) {
      const newUrl = `${newProtocol}//${newHostname}${pathname}${search}${hash}`;
      console.log(`[DomainRedirect] Redirecionando de ${window.location.href} para ${newUrl}`);
      window.location.replace(newUrl);
    }
  }, [preferNonWww, forceHttps, excludedDomains]);
};

/**
 * Componente wrapper que aplica redirecionamentos de domínio
 * Use no nível mais alto da aplicação, antes de qualquer roteamento
 */
export const DomainRedirectProvider: React.FC<{
  children: React.ReactNode;
  options?: DomainRedirectOptions;
}> = ({ children, options }) => {
  useDomainRedirect(options);
  return React.createElement(React.Fragment, null, children);
};

export default useDomainRedirect;
