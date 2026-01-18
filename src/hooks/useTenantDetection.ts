import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Organization, OrganizationBranding, OrganizationSettings, detectTenantFromHostname } from '@/contexts/OrganizationContext';

interface TenantInfo {
  organization: Organization | null;
  loading: boolean;
  error: string | null;
  isMainDomain: boolean;
}

const defaultBranding: OrganizationBranding = {
  logo_url: null,
  favicon_url: null,
  primary_color: '263 70% 50%',
  secondary_color: '263 30% 25%',
  accent_color: '45 93% 47%',
  font_family: 'Inter',
  login_background_url: null,
};

/**
 * Hook para detectar e carregar informações do tenant baseado no hostname
 * Útil para páginas públicas como Login que precisam do branding antes da autenticação
 */
export const useTenantDetection = (): TenantInfo => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMainDomain, setIsMainDomain] = useState(true);

  useEffect(() => {
    const detectTenant = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { slug, customDomain } = detectTenantFromHostname();
        
        // Se detectou um slug diferente de 'ifatokun' ou um domínio customizado,
        // não é o domínio principal
        setIsMainDomain(slug === 'ifatokun' && !customDomain);
        
        let query = supabase
          .from('organizations')
          .select('*');
        
        if (customDomain) {
          query = query.eq('custom_domain', customDomain);
        } else if (slug) {
          query = query.eq('slug', slug);
        } else {
          // Fallback para organização padrão
          query = query.eq('slug', 'ifatokun');
        }
        
        const { data, error: fetchError } = await query.single();
        
        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            setError('Organização não encontrada');
          } else {
            setError(fetchError.message);
          }
          setOrganization(null);
          return;
        }
        
        // Fazer merge com valores padrão
        const rawBranding = data.branding as Record<string, unknown> | null;
        const rawSettings = data.settings as Record<string, unknown> | null;
        const branding: OrganizationBranding = { 
          ...defaultBranding, 
          ...(rawBranding || {}) as Partial<OrganizationBranding>
        };
        const settings: OrganizationSettings = {
          max_users: (rawSettings?.max_users as number) ?? 100,
          max_modules: (rawSettings?.max_modules as number) ?? 50,
          plan_type: (rawSettings?.plan_type as 'free' | 'pro' | 'enterprise') ?? 'free',
          features: (rawSettings?.features as string[]) ?? [],
        };
        setOrganization({
          ...data,
          branding,
          settings,
        });
      } catch (err) {
        console.error('Error detecting tenant:', err);
        setError('Erro ao detectar organização');
        setOrganization(null);
      } finally {
        setLoading(false);
      }
    };

    detectTenant();
  }, []);

  return { organization, loading, error, isMainDomain };
};

/**
 * Hook para verificar se a URL atual corresponde a um tenant válido
 */
export const useValidateTenant = () => {
  const { organization, loading, error } = useTenantDetection();
  
  return {
    isValid: !loading && !error && organization !== null && organization.is_active,
    isLoading: loading,
    error,
    organization,
  };
};
