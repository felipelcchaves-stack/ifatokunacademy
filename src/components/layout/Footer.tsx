import React, { forwardRef } from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import { useOrganization } from '@/contexts/OrganizationContext';

const Footer = forwardRef<HTMLElement>((_, ref) => {
  const { organization } = useOrganization();
  
  const branding = organization?.branding;
  const orgName = organization?.name || 'Offe Orunmila Learning';
  const displayPlatformName = orgName.split(' ').slice(0, 2).join(' ') || 'Offe Orunmila';
  const displayPlatformSuffix = orgName.split(' ').slice(2).join(' ') || 'Learning';
  const fullPlatformName = orgName;
  const logoUrl = branding?.logo_url;
  const footerDescription = branding?.footer_description || 'Plataforma de estudos sagrados para aprofundamento nos conhecimentos tradicionais.';
  const contactEmail = branding?.contact_email || `contato@${fullPlatformName.toLowerCase().replace(/\s/g, '')}.com`;
  const contactPhone = branding?.contact_phone || '(11) 99999-9999';
  const contactAddress = branding?.contact_address || 'São Paulo, Brasil';
  return (
    <footer ref={ref} className="bg-card border-t border-border py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={fullPlatformName} 
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ 
                    background: branding?.primary_color 
                      ? `hsl(${branding.primary_color})` 
                      : 'hsl(var(--primary))'
                  }}
                >
                  <span className="font-serif text-lg font-bold text-white">
                    {displayPlatformName.charAt(0)}
                  </span>
                </div>
              )}
              <h3 className="text-lg font-serif font-bold text-primary">
                {displayPlatformName} <span className="text-foreground">{displayPlatformSuffix}</span>
              </h3>
            </div>
            <p className="text-muted-foreground text-sm">
              {footerDescription}
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Contato</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>{contactEmail}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>{contactPhone}</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{contactAddress}</span>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Termos de Uso</li>
              <li>Política de Privacidade</li>
              <li>LGPD</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border mt-8 pt-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {fullPlatformName}. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
});
Footer.displayName = 'Footer';
export default Footer;