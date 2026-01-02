import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Achievement {
  key: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
  type: 'streak' | 'reviews' | 'items' | 'modules' | 'accuracy' | 'mastery' | 'time' | 'retention' | 'challenge' | 'journey';
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
  
  // Items memorized achievements
  { key: 'items_5', name: 'Primeiras Memórias', description: '5 itens adicionados para revisão', icon: '🧠', requirement: 5, type: 'items' },
  { key: 'items_25', name: 'Colecionador', description: '25 itens adicionados para revisão', icon: '📝', requirement: 25, type: 'items' },
  { key: 'items_50', name: 'Biblioteca Pessoal', description: '50 itens adicionados para revisão', icon: '📚', requirement: 50, type: 'items' },
  { key: 'items_100', name: 'Memória Prodigiosa', description: '100 itens adicionados para revisão', icon: '🧩', requirement: 100, type: 'items' },
  { key: 'items_256', name: 'Todos os Odus', description: '256 itens memorizados (todos os Odus)', icon: '✨', requirement: 256, type: 'items' },
  
  // Modules completed achievements
  { key: 'modules_1', name: 'Primeiro Módulo', description: 'Complete seu primeiro módulo', icon: '🎯', requirement: 1, type: 'modules' },
  { key: 'modules_3', name: 'Trilha Iniciada', description: 'Complete 3 módulos', icon: '🛤️', requirement: 3, type: 'modules' },
  { key: 'modules_5', name: 'Explorador', description: 'Complete 5 módulos', icon: '🗺️', requirement: 5, type: 'modules' },
  { key: 'modules_10', name: 'Mestre dos Módulos', description: 'Complete 10 módulos', icon: '🏅', requirement: 10, type: 'modules' },
  
  // Accuracy achievements
  { key: 'accuracy_90', name: 'Precisão Alta', description: 'Alcance 90% de precisão em 20+ revisões', icon: '🎯', requirement: 90, type: 'accuracy' },
  { key: 'accuracy_95', name: 'Quase Perfeito', description: 'Alcance 95% de precisão em 50+ revisões', icon: '💯', requirement: 95, type: 'accuracy' },

  // Mastery achievements (NEW)
  { key: 'mastery_first_verse', name: 'Primeiro Verso', description: 'Complete sua primeira memorização com 100%', icon: '📜', requirement: 1, type: 'mastery' },
  { key: 'mastery_perfect_lesson', name: 'Lição Perfeita', description: 'Complete uma lição inteira sem erros', icon: '✅', requirement: 1, type: 'mastery' },
  { key: 'mastery_speed_demon', name: 'Velocidade Sagrada', description: 'Complete 10 itens em menos de 2 min no Desafio', icon: '⚡', requirement: 1, type: 'mastery' },

  // Time-based achievements (NEW)
  { key: 'time_early_bird', name: 'Madrugador', description: 'Estude antes das 6h da manhã', icon: '🌅', requirement: 1, type: 'time' },
  { key: 'time_night_owl', name: 'Coruja Noturna', description: 'Estude depois das 22h', icon: '🦉', requirement: 1, type: 'time' },
  { key: 'time_weekend_warrior', name: 'Guerreiro de Fim de Semana', description: 'Estude todos os dias de um fim de semana', icon: '⚔️', requirement: 1, type: 'time' },

  // Retention achievements (NEW)
  { key: 'retention_first_review', name: 'Primeira Revisão', description: 'Complete sua primeira revisão de módulo', icon: '🔄', requirement: 1, type: 'retention' },
  { key: 'retention_memory_keeper', name: 'Guardião da Memória', description: 'Mantenha 90%+ de retenção em 3 módulos', icon: '🛡️', requirement: 3, type: 'retention' },
  { key: 'retention_perfect_recall', name: 'Memória Perfeita', description: '100% de acerto em uma revisão de módulo', icon: '💫', requirement: 1, type: 'retention' },

  // Challenge achievements (NEW)
  { key: 'challenge_first_win', name: 'Primeiro Desafio', description: 'Complete seu primeiro Modo Desafio', icon: '🎮', requirement: 1, type: 'challenge' },
  { key: 'challenge_high_score', name: 'Pontuação Alta', description: 'Alcance 500+ pontos em um desafio', icon: '🏅', requirement: 500, type: 'challenge' },
  { key: 'challenge_combo_master', name: 'Mestre dos Combos', description: 'Acerte 15 itens consecutivos', icon: '🔥', requirement: 15, type: 'challenge' },

  // Journey achievements (NEW)
  { key: 'journey_first_module', name: 'Jornada Iniciada', description: 'Complete seu primeiro módulo', icon: '🚀', requirement: 1, type: 'journey' },
  { key: 'journey_proficiency_complete', name: 'Trilha de Proficiência', description: 'Complete toda a trilha Akapo → Awo → Oluwo', icon: '🏛️', requirement: 1, type: 'journey' },
  { key: 'journey_thematic_explorer', name: 'Explorador Temático', description: 'Complete 3 módulos temáticos', icon: '🧭', requirement: 3, type: 'journey' },
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

  const checkAndUnlockAchievements = async (stats: {
    currentStreak?: number;
    totalDays?: number;
    itemsCount?: number;
    modulesCompleted?: number;
    accuracy?: number;
    totalReviews?: number;
  }): Promise<Achievement[]> => {
    if (!user) return [];

    const newlyUnlocked: Achievement[] = [];
    const unlockedKeys = new Set(unlockedAchievements.map(a => a.achievement_key));

    for (const achievement of ACHIEVEMENTS) {
      if (unlockedKeys.has(achievement.key)) continue;

      let shouldUnlock = false;
      
      switch (achievement.type) {
        case 'streak':
          if (stats.currentStreak && stats.currentStreak >= achievement.requirement) {
            shouldUnlock = true;
          }
          break;
        case 'reviews':
          if (stats.totalDays && stats.totalDays >= achievement.requirement) {
            shouldUnlock = true;
          }
          break;
        case 'items':
          if (stats.itemsCount && stats.itemsCount >= achievement.requirement) {
            shouldUnlock = true;
          }
          break;
        case 'modules':
          if (stats.modulesCompleted && stats.modulesCompleted >= achievement.requirement) {
            shouldUnlock = true;
          }
          break;
        case 'accuracy':
          const minReviews = achievement.requirement === 90 ? 20 : 50;
          if (stats.accuracy && stats.totalReviews && 
              stats.accuracy >= achievement.requirement && 
              stats.totalReviews >= minReviews) {
            shouldUnlock = true;
          }
          break;
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

  const checkAllAchievements = async (): Promise<Achievement[]> => {
    if (!user) return [];

    try {
      // Fetch all stats
      const [streakRes, itemsRes, modulesRes] = await Promise.all([
        supabase.from('user_streaks').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('spaced_repetition_items').select('id, correct_reviews, total_reviews').eq('user_id', user.id),
        supabase.from('module_completions').select('id').eq('user_id', user.id),
      ]);

      const streak = streakRes.data;
      const items = itemsRes.data || [];
      const modules = modulesRes.data || [];

      const totalReviews = items.reduce((acc, item) => acc + item.total_reviews, 0);
      const correctReviews = items.reduce((acc, item) => acc + item.correct_reviews, 0);
      const accuracy = totalReviews > 0 ? Math.round((correctReviews / totalReviews) * 100) : 0;

      return checkAndUnlockAchievements({
        currentStreak: streak?.current_streak || 0,
        totalDays: streak?.total_review_days || 0,
        itemsCount: items.length,
        modulesCompleted: modules.length,
        accuracy,
        totalReviews,
      });
    } catch (error) {
      console.error('Error checking all achievements:', error);
      return [];
    }
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
    checkAllAchievements,
    isUnlocked,
    getUnlockDate,
    refreshAchievements: fetchAchievements,
  };
};
