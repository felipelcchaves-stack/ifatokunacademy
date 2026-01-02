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
  return;
});
Footer.displayName = 'Footer';
export default Footer;