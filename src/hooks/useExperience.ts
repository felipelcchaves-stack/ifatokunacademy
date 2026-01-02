import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SPIRITUAL_LEVELS, XP_VALUES } from '@/data/yorubaProverbs';

export interface ExperienceData {
  id: string;
  user_id: string;
  total_xp: number;
  current_level: number;
  level_name: string;
  xp_multiplier: number;
  created_at: string;
  updated_at: string;
}

export interface UseExperienceReturn {
  experience: ExperienceData | null;
  loading: boolean;
  addXP: (amount: number, type: keyof typeof XP_VALUES) => Promise<{ xpGained: number; leveledUp: boolean; newLevel?: typeof SPIRITUAL_LEVELS[0] }>;
  refreshExperience: () => Promise<void>;
  getXPForNextLevel: () => number;
  getProgressToNextLevel: () => number;
}

const calculateLevel = (totalXP: number): typeof SPIRITUAL_LEVELS[0] => {
  let currentLevel = SPIRITUAL_LEVELS[0];
  for (const level of SPIRITUAL_LEVELS) {
    if (totalXP >= level.xpRequired) {
      currentLevel = level;
    } else {
      break;
    }
  }
  return currentLevel;
};

export const useExperience = (): UseExperienceReturn => {
  const { user } = useAuth();
  const [experience, setExperience] = useState<ExperienceData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchExperience = useCallback(async () => {
    if (!user) {
      setExperience(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_experience')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        // Create initial experience record
        const { data: newData, error: insertError } = await supabase
          .from('user_experience')
          .insert({
            user_id: user.id,
            total_xp: 0,
            current_level: 1,
            level_name: 'Kékeré',
            xp_multiplier: 1.0,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setExperience(newData);
      } else {
        setExperience(data);
      }
    } catch (error) {
      console.error('Error fetching experience:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchExperience();
  }, [fetchExperience]);

  const addXP = async (amount: number, type: keyof typeof XP_VALUES) => {
    if (!user || !experience) {
      return { xpGained: 0, leveledUp: false };
    }

    try {
      // Get streak for multiplier
      const { data: streakData } = await supabase
        .from('user_streaks')
        .select('current_streak')
        .eq('user_id', user.id)
        .maybeSingle();

      let multiplier = experience.xp_multiplier;
      if (streakData) {
        if (streakData.current_streak >= 30) {
          multiplier = XP_VALUES.streak_bonus_30;
        } else if (streakData.current_streak >= 7) {
          multiplier = XP_VALUES.streak_bonus_7;
        }
      }

      const baseXP = XP_VALUES[type] || amount;
      const xpGained = Math.round(baseXP * multiplier);
      const newTotalXP = experience.total_xp + xpGained;
      
      const oldLevel = calculateLevel(experience.total_xp);
      const newLevel = calculateLevel(newTotalXP);
      const leveledUp = newLevel.level > oldLevel.level;

      const { data, error } = await supabase
        .from('user_experience')
        .update({
          total_xp: newTotalXP,
          current_level: newLevel.level,
          level_name: newLevel.name,
          xp_multiplier: multiplier,
        })
        .eq('id', experience.id)
        .select()
        .single();

      if (error) throw error;
      setExperience(data);

      return { xpGained, leveledUp, newLevel: leveledUp ? newLevel : undefined };
    } catch (error) {
      console.error('Error adding XP:', error);
      return { xpGained: 0, leveledUp: false };
    }
  };

  const getXPForNextLevel = () => {
    if (!experience) return 500;
    const currentLevelIndex = SPIRITUAL_LEVELS.findIndex(l => l.level === experience.current_level);
    if (currentLevelIndex === SPIRITUAL_LEVELS.length - 1) {
      return experience.total_xp; // Max level
    }
    return SPIRITUAL_LEVELS[currentLevelIndex + 1].xpRequired;
  };

  const getProgressToNextLevel = () => {
    if (!experience) return 0;
    const currentLevelIndex = SPIRITUAL_LEVELS.findIndex(l => l.level === experience.current_level);
    if (currentLevelIndex === SPIRITUAL_LEVELS.length - 1) {
      return 100; // Max level
    }
    
    const currentLevelXP = SPIRITUAL_LEVELS[currentLevelIndex].xpRequired;
    const nextLevelXP = SPIRITUAL_LEVELS[currentLevelIndex + 1].xpRequired;
    const progressXP = experience.total_xp - currentLevelXP;
    const requiredXP = nextLevelXP - currentLevelXP;
    
    return Math.round((progressXP / requiredXP) * 100);
  };

  return {
    experience,
    loading,
    addXP,
    refreshExperience: fetchExperience,
    getXPForNextLevel,
    getProgressToNextLevel,
  };
};
