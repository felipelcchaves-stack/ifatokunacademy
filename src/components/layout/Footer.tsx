import React, { forwardRef } from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
const Footer = forwardRef<HTMLElement>((_, ref) => {
  const {
    platformName
  } = usePlatformSettings();
  const displayPlatformName = platformName?.split(' ').slice(0, 2).join(' ') || 'Offe Orunmila';
  const displayPlatformSuffix = platformName?.split(' ').slice(2).join(' ') || 'Learning';
  const fullPlatformName = platformName || 'Offe Orunmila Learning';
  return (
    <footer ref={ref} className="bg-card border-t border-border py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-serif font-bold text-primary mb-4">
              {displayPlatformName} <span className="text-foreground">{displayPlatformSuffix}</span>
            </h3>
            <p className="text-muted-foreground text-sm">
              Plataforma de estudos sagrados para aprofundamento nos conhecimentos tradicionais.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Contato</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>contato@{fullPlatformName.toLowerCase().replace(/\s/g, '')}.com</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>(11) 99999-9999</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>São Paulo, Brasil</span>
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