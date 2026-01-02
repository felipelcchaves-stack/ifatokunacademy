import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Achievement {
  key: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
  type: 'streak' | 'reviews' | 'items';
}

export interface UnlockedAchievement {
  id: string;
  user_id: string;
  achievement_key: string;
  unlocked_at: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  // Streak achievements
  { key: 'streak_3', name: 'Primeiro Passo', description: '3 dias consecutivos de revisão', icon: '🌱', requirement: 3, type: 'streak' },
  { key: 'streak_7', name: 'Uma Semana', description: '7 dias consecutivos de revisão', icon: '🔥', requirement: 7, type: 'streak' },
  { key: 'streak_14', name: 'Duas Semanas', description: '14 dias consecutivos de revisão', icon: '⚡', requirement: 14, type: 'streak' },
  { key: 'streak_30', name: 'Um Mês', description: '30 dias consecutivos de revisão', icon: '🏆', requirement: 30, type: 'streak' },
  { key: 'streak_60', name: 'Dois Meses', description: '60 dias consecutivos de revisão', icon: '💎', requirement: 60, type: 'streak' },
  { key: 'streak_100', name: 'Centenário', description: '100 dias consecutivos de revisão', icon: '👑', requirement: 100, type: 'streak' },
  { key: 'streak_365', name: 'Mestre do Ano', description: '365 dias consecutivos de revisão', icon: '🌟', requirement: 365, type: 'streak' },
  // Total review days achievements
  { key: 'days_10', name: 'Dedicação Inicial', description: '10 dias totais de revisão', icon: '📚', requirement: 10, type: 'reviews' },
  { key: 'days_50', name: 'Estudante Aplicado', description: '50 dias totais de revisão', icon: '🎓', requirement: 50, type: 'reviews' },
  { key: 'days_100', name: 'Estudioso', description: '100 dias totais de revisão', icon: '📖', requirement: 100, type: 'reviews' },
];

export const useAchievements = () => {
  const { user } = useAuth();
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAchievements = useCallback(async () => {
    if (!user) {
      setUnlockedAchievements([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setUnlockedAchievements(data || []);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  const checkAndUnlockAchievements = async (currentStreak: number, totalDays: number): Promise<Achievement[]> => {
    if (!user) return [];

    const newlyUnlocked: Achievement[] = [];
    const unlockedKeys = new Set(unlockedAchievements.map(a => a.achievement_key));

    for (const achievement of ACHIEVEMENTS) {
      if (unlockedKeys.has(achievement.key)) continue;

      let shouldUnlock = false;
      if (achievement.type === 'streak' && currentStreak >= achievement.requirement) {
        shouldUnlock = true;
      } else if (achievement.type === 'reviews' && totalDays >= achievement.requirement) {
        shouldUnlock = true;
      }

      if (shouldUnlock) {
        try {
          const { error } = await supabase
            .from('user_achievements')
            .insert({
              user_id: user.id,
              achievement_key: achievement.key,
            });

          if (!error) {
            newlyUnlocked.push(achievement);
          }
        } catch (err) {
          console.error('Error unlocking achievement:', err);
        }
      }
    }

    if (newlyUnlocked.length > 0) {
      await fetchAchievements();
    }

    return newlyUnlocked;
  };

  const isUnlocked = (key: string): boolean => {
    return unlockedAchievements.some(a => a.achievement_key === key);
  };

  const getUnlockDate = (key: string): string | null => {
    const achievement = unlockedAchievements.find(a => a.achievement_key === key);
    return achievement?.unlocked_at || null;
  };

  return {
    achievements: ACHIEVEMENTS,
    unlockedAchievements,
    loading,
    checkAndUnlockAchievements,
    isUnlocked,
    getUnlockDate,
    refreshAchievements: fetchAchievements,
  };
};
