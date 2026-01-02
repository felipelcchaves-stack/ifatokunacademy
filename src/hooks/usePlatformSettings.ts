import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PlatformSettings {
  platformName: string | null;
  platformDescription: string | null;
  loading: boolean;
}

// Cache to avoid multiple fetches
let cachedSettings: { name: string | null; description: string | null } | null = null;

export const usePlatformSettings = (): PlatformSettings => {
  const [platformName, setPlatformName] = useState<string | null>(cachedSettings?.name || null);
  const [platformDescription, setPlatformDescription] = useState<string | null>(cachedSettings?.description || null);
  const [loading, setLoading] = useState(!cachedSettings);

  useEffect(() => {
    if (cachedSettings) {
      setPlatformName(cachedSettings.name);
      setPlatformDescription(cachedSettings.description);
      setLoading(false);
      return;
    }

    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('platform_settings')
          .select('key, value')
          .eq('key', 'general')
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        let name: string | null = null;
        let description: string | null = null;

        if (data?.value) {
          const value = data.value as { name?: string; description?: string };
          name = value.name || null;
          description = value.description || null;
        }

        cachedSettings = { name, description };
        setPlatformName(name);
        setPlatformDescription(description);
      } catch (error) {
        console.error('Error fetching platform settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { platformName, platformDescription, loading };
};

// Helper to clear cache (useful after admin updates settings)
export const clearPlatformSettingsCache = () => {
  cachedSettings = null;
};
