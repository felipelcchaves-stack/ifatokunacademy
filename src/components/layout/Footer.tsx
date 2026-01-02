import React, { forwardRef } from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

const Footer = forwardRef<HTMLElement>((_, ref) => {
  const { platformName } = usePlatformSettings();
  
  const displayPlatformName = platformName?.split(' ').slice(0, 2).join(' ') || 'Offe Orunmila';
  const displayPlatformSuffix = platformName?.split(' ').slice(2).join(' ') || 'Learning';
  const fullPlatformName = platformName || 'Offe Orunmila Learning';

  return (
    <footer ref={ref} className="bg-secondary text-secondary-foreground">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center">
                <span className="font-serif text-lg font-bold text-secondary">{displayPlatformName.charAt(0)}</span>
              </div>
              <div>
                <h2 className="font-serif text-lg font-semibold">{displayPlatformName}</h2>
                <p className="text-xs text-secondary-foreground/70">{displayPlatformSuffix}</p>
              </div>
            </div>
            <p className="text-sm text-secondary-foreground/80 leading-relaxed">
              Plataforma de aprendizado dedicada à preservação e transmissão do conhecimento tradicional Yorubá.
            </p>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="font-serif text-lg font-semibold">Contato</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm text-secondary-foreground/80">
                <Mail className="w-4 h-4 text-primary" />
                contato@offeorunmila.com
              </li>
              <li className="flex items-center gap-2 text-sm text-secondary-foreground/80">
                <Phone className="w-4 h-4 text-primary" />
                +55 (11) 99999-9999
              </li>
              <li className="flex items-start gap-2 text-sm text-secondary-foreground/80">
                <MapPin className="w-4 h-4 text-primary mt-0.5" />
                São Paulo, Brasil
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-secondary-foreground/20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-secondary-foreground/60">
              © {new Date().getFullYear()} {fullPlatformName}. Todos os direitos reservados.
            </p>
            <p className="text-sm text-secondary-foreground/60">
              Desenvolvido com 🤍 para a preservação da tradição
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';

export default Footer;
