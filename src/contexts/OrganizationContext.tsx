import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export interface OrganizationBranding {
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
  login_background_url: string | null;
}

export interface OrganizationSettings {
  max_users: number;
  max_modules: number;
  plan_type: 'free' | 'pro' | 'enterprise';
  features: string[];
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  custom_domain: string | null;
  branding: OrganizationBranding;
  settings: OrganizationSettings;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface OrganizationContextType {
  organization: Organization | null;
  loading: boolean;
  isOrgAdmin: boolean;
  refreshOrganization: () => Promise<void>;
  updateBranding: (branding: Partial<OrganizationBranding>) => Promise<void>;
  updateSettings: (settings: Partial<OrganizationSettings>) => Promise<void>;
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

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

/**
 * Detecta a organização a partir do hostname atual
 */
export const detectTenantFromHostname = (): { slug: string | null; customDomain: string | null } => {
  const hostname = window.location.hostname;
  
  // Lista de hostnames que são considerados "principais" (sem tenant)
  const mainHosts = [
    'localhost',
    '127.0.0.1',
    'ifatokunacademy.lovable.app',
    'id-preview--96033c3a-2c4e-4768-bdba-4809fc4199fd.lovable.app'
  ];
  
  // Se for um dos hosts principais, retornar o tenant padrão
  if (mainHosts.some(h => hostname.includes(h))) {
    return { slug: 'ifatokun', customDomain: null };
  }
  
  // Verificar se é um subdomínio do ifatokunacademy.com
  const subdomainMatch = hostname.match(/^([^.]+)\.ifatokunacademy\.(com|app)$/);
  if (subdomainMatch) {
    return { slug: subdomainMatch[1], customDomain: null };
  }
  
  // Caso contrário, é um domínio customizado
  return { slug: null, customDomain: hostname };
};

export const OrganizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);

  const fetchOrganization = async () => {
    try {
      setLoading(true);
      
      // Primeiro, tentar detectar pelo hostname
      const { slug, customDomain } = detectTenantFromHostname();
      
      let query = supabase.from('organizations').select('*');
      
      if (customDomain) {
        query = query.eq('custom_domain', customDomain);
      } else if (slug) {
        query = query.eq('slug', slug);
      } else if (user) {
        // Fallback: buscar pela organização do usuário
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();
        
        if (profile?.organization_id) {
          query = query.eq('id', profile.organization_id);
        } else {
          // Usar organização padrão
          query = query.eq('slug', 'ifatokun');
        }
      } else {
        // Usar organização padrão
        query = query.eq('slug', 'ifatokun');
      }
      
      const { data, error } = await query.single();
      
      if (error) {
        console.error('Error fetching organization:', error);
        // Em caso de erro, usar branding padrão
        setOrganization(null);
      } else {
        // Fazer merge com valores padrão para garantir que todos os campos existam
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
      }
    } catch (error) {
      console.error('Error in fetchOrganization:', error);
      setOrganization(null);
    } finally {
      setLoading(false);
    }
  };

  const checkOrgAdminStatus = async () => {
    if (!user || !organization) {
      setIsOrgAdmin(false);
      return;
    }
    
    try {
      const { data, error } = await supabase.rpc('is_organization_admin', {
        p_user_id: user.id,
        p_organization_id: organization.id,
      });
      
      if (error) {
        console.error('Error checking org admin status:', error);
        setIsOrgAdmin(false);
        return;
      }
      
      setIsOrgAdmin(data === true || isAdmin);
    } catch (error) {
      console.error('Error in checkOrgAdminStatus:', error);
      setIsOrgAdmin(false);
    }
  };

  useEffect(() => {
    fetchOrganization();
  }, [user]);

  useEffect(() => {
    if (organization && user) {
      checkOrgAdminStatus();
    }
  }, [organization, user, isAdmin]);

  // Aplicar branding dinamicamente via CSS variables
  useEffect(() => {
    if (organization?.branding) {
      const root = document.documentElement;
      const { branding } = organization;
      
      if (branding.primary_color) {
        root.style.setProperty('--primary', branding.primary_color);
      }
      if (branding.secondary_color) {
        root.style.setProperty('--secondary', branding.secondary_color);
      }
      if (branding.accent_color) {
        root.style.setProperty('--accent', branding.accent_color);
      }
      if (branding.font_family) {
        root.style.setProperty('--font-family', branding.font_family);
      }
    }
  }, [organization?.branding]);

  // Aplicar favicon dinâmico
  useEffect(() => {
    if (organization?.branding?.favicon_url) {
      const faviconUrl = organization.branding.favicon_url;
      
      // Atualizar ou criar link do favicon
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = faviconUrl;
      
      // Também atualizar apple-touch-icon se existir
      let appleLink: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']");
      if (!appleLink) {
        appleLink = document.createElement('link');
        appleLink.rel = 'apple-touch-icon';
        document.head.appendChild(appleLink);
      }
      appleLink.href = faviconUrl;
    }
  }, [organization?.branding?.favicon_url]);

  // Aplicar título dinâmico da página
  useEffect(() => {
    if (organization?.name) {
      document.title = organization.name;
    }
  }, [organization?.name]);

  const refreshOrganization = async () => {
    await fetchOrganization();
  };

  const updateBranding = async (newBranding: Partial<OrganizationBranding>) => {
    if (!organization) return;
    
    const updatedBranding = { ...organization.branding, ...newBranding };
    
    const { error } = await supabase
      .from('organizations')
      .update({ branding: updatedBranding })
      .eq('id', organization.id);
    
    if (error) {
      console.error('Error updating branding:', error);
      throw error;
    }
    
    setOrganization(prev => prev ? { ...prev, branding: updatedBranding } : null);
  };

  const updateSettings = async (newSettings: Partial<OrganizationSettings>) => {
    if (!organization) return;
    
    const updatedSettings = { ...organization.settings, ...newSettings };
    
    const { error } = await supabase
      .from('organizations')
      .update({ settings: updatedSettings })
      .eq('id', organization.id);
    
    if (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
    
    setOrganization(prev => prev ? { ...prev, settings: updatedSettings } : null);
  };

  return (
    <OrganizationContext.Provider
      value={{
        organization,
        loading,
        isOrgAdmin,
        refreshOrganization,
        updateBranding,
        updateSettings,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};
