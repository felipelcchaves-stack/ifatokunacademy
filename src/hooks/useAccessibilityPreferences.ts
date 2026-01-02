import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AccessibilityPreferences {
  fontSize: 'normal' | 'large' | 'xlarge';
  letterSpacing: 'normal' | 'wide' | 'wider';
  lineHeight: 'normal' | 'relaxed' | 'loose';
  dyslexiaFont: boolean;
  highContrast: boolean;
  autoPlayAudio: boolean;
  pauseBetweenChunks: number; // seconds
  preferredMode: 'classic' | 'microlearning' | 'tap' | 'karaoke' | 'visual' | 'listen';
  colorCoding: boolean;
  reducedMotion: boolean;
}

const defaultPreferences: AccessibilityPreferences = {
  fontSize: 'normal',
  letterSpacing: 'normal',
  lineHeight: 'normal',
  dyslexiaFont: false,
  highContrast: false,
  autoPlayAudio: false,
  pauseBetweenChunks: 5,
  preferredMode: 'classic',
  colorCoding: false,
  reducedMotion: false,
};

const STORAGE_KEY = 'accessibility_preferences';

export function useAccessibilityPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);

  // Load preferences from localStorage or database
  useEffect(() => {
    const loadPreferences = async () => {
      setLoading(true);
      try {
        // First try localStorage for immediate response
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setPreferences({ ...defaultPreferences, ...JSON.parse(stored) });
        }

        // If logged in, fetch from database (could be added later)
        // For now, just use localStorage
      } catch (error) {
        console.error('Error loading accessibility preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user]);

  // Save preferences
  const updatePreferences = useCallback((updates: Partial<AccessibilityPreferences>) => {
    setPreferences(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Reset to defaults
  const resetPreferences = useCallback(() => {
    setPreferences(defaultPreferences);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Get CSS classes based on preferences
  const getTextClasses = useCallback(() => {
    const classes: string[] = [];

    // Font size
    switch (preferences.fontSize) {
      case 'large':
        classes.push('text-xl');
        break;
      case 'xlarge':
        classes.push('text-2xl');
        break;
    }

    // Letter spacing
    switch (preferences.letterSpacing) {
      case 'wide':
        classes.push('tracking-wide');
        break;
      case 'wider':
        classes.push('tracking-wider');
        break;
    }

    // Line height
    switch (preferences.lineHeight) {
      case 'relaxed':
        classes.push('leading-relaxed');
        break;
      case 'loose':
        classes.push('leading-loose');
        break;
    }

    // Dyslexia font
    if (preferences.dyslexiaFont) {
      classes.push('font-sans'); // Could be OpenDyslexic if loaded
    }

    return classes.join(' ');
  }, [preferences]);

  // Get inline styles for more specific customizations
  const getTextStyles = useCallback((): React.CSSProperties => {
    const styles: React.CSSProperties = {};

    if (preferences.dyslexiaFont) {
      styles.fontFamily = "'OpenDyslexic', 'Comic Sans MS', sans-serif";
    }

    if (preferences.highContrast) {
      styles.fontWeight = 600;
    }

    return styles;
  }, [preferences]);

  return {
    preferences,
    loading,
    updatePreferences,
    resetPreferences,
    getTextClasses,
    getTextStyles,
  };
}
