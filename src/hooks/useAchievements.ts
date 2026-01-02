import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Achievement {
  key: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
  type: 'streak' | 'reviews' | 'items' | 'modules' | 'accuracy' | 'mastery' | 'time' | 'retention' | 'challenge' | 'journey' | 'xp' | 'level' | 'exploration' | 'secret';
  secret?: boolean; // Hidden until unlocked
}

export interface UnlockedAchievement {
  id: string;
  user_id: string;
  achievement_key: string;
  unlocked_at: string;
}

export interface AchievementStats {
  currentStreak?: number;
  totalDays?: number;
  itemsCount?: number;
  modulesCompleted?: number;
  accuracy?: number;
  totalReviews?: number;
  // New stats
  totalXP?: number;
  currentLevel?: number;
  levelName?: string;
  challengesCompleted?: number;
  highestChallengeScore?: number;
  dailyGoalsCompleted?: number;
  retentionModules90Plus?: number;
  perfectReviewCount?: number;
  exerciseTypesUsed?: number;
  thematicModulesCompleted?: number;
  proficiencyModulesCompleted?: number;
  currentHour?: number;
  isWeekend?: boolean;
  studiedBothWeekendDays?: boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  // ============ STREAK ACHIEVEMENTS ============
  { key: 'streak_3', name: 'Primeiro Passo', description: '3 dias consecutivos de revisão', icon: '🌱', requirement: 3, type: 'streak' },
  { key: 'streak_7', name: 'Uma Semana', description: '7 dias consecutivos de revisão', icon: '🔥', requirement: 7, type: 'streak' },
  { key: 'streak_14', name: 'Duas Semanas', description: '14 dias consecutivos de revisão', icon: '⚡', requirement: 14, type: 'streak' },
  { key: 'streak_30', name: 'Um Mês', description: '30 dias consecutivos de revisão', icon: '🏆', requirement: 30, type: 'streak' },
  { key: 'streak_60', name: 'Dois Meses', description: '60 dias consecutivos de revisão', icon: '💎', requirement: 60, type: 'streak' },
  { key: 'streak_100', name: 'Centenário', description: '100 dias consecutivos de revisão', icon: '👑', requirement: 100, type: 'streak' },
  { key: 'streak_365', name: 'Mestre do Ano', description: '365 dias consecutivos de revisão', icon: '🌟', requirement: 365, type: 'streak' },
  
  // ============ REVIEW DAYS ACHIEVEMENTS ============
  { key: 'days_10', name: 'Dedicação Inicial', description: '10 dias totais de revisão', icon: '📚', requirement: 10, type: 'reviews' },
  { key: 'days_50', name: 'Estudante Aplicado', description: '50 dias totais de revisão', icon: '🎓', requirement: 50, type: 'reviews' },
  { key: 'days_100', name: 'Estudioso', description: '100 dias totais de revisão', icon: '📖', requirement: 100, type: 'reviews' },
  
  // ============ ITEMS ACHIEVEMENTS ============
  { key: 'items_5', name: 'Primeiras Memórias', description: '5 itens adicionados para revisão', icon: '🧠', requirement: 5, type: 'items' },
  { key: 'items_25', name: 'Colecionador', description: '25 itens adicionados para revisão', icon: '📝', requirement: 25, type: 'items' },
  { key: 'items_50', name: 'Biblioteca Pessoal', description: '50 itens adicionados para revisão', icon: '📚', requirement: 50, type: 'items' },
  { key: 'items_100', name: 'Memória Prodigiosa', description: '100 itens adicionados para revisão', icon: '🧩', requirement: 100, type: 'items' },
  { key: 'items_256', name: 'Todos os Odus', description: '256 itens memorizados (todos os Odus)', icon: '✨', requirement: 256, type: 'items' },
  { key: 'items_500', name: 'Enciclopédia Viva', description: '500 itens adicionados para revisão', icon: '📖', requirement: 500, type: 'items' },
  
  // ============ MODULES ACHIEVEMENTS ============
  { key: 'modules_1', name: 'Primeiro Módulo', description: 'Complete seu primeiro módulo', icon: '🎯', requirement: 1, type: 'modules' },
  { key: 'modules_3', name: 'Trilha Iniciada', description: 'Complete 3 módulos', icon: '🛤️', requirement: 3, type: 'modules' },
  { key: 'modules_5', name: 'Explorador', description: 'Complete 5 módulos', icon: '🗺️', requirement: 5, type: 'modules' },
  { key: 'modules_10', name: 'Mestre dos Módulos', description: 'Complete 10 módulos', icon: '🏅', requirement: 10, type: 'modules' },
  
  // ============ ACCURACY ACHIEVEMENTS ============
  { key: 'accuracy_80', name: 'Boa Precisão', description: 'Alcance 80% de precisão em 10+ revisões', icon: '🎯', requirement: 80, type: 'accuracy' },
  { key: 'accuracy_90', name: 'Precisão Alta', description: 'Alcance 90% de precisão em 20+ revisões', icon: '🎯', requirement: 90, type: 'accuracy' },
  { key: 'accuracy_95', name: 'Quase Perfeito', description: 'Alcance 95% de precisão em 50+ revisões', icon: '💯', requirement: 95, type: 'accuracy' },
  { key: 'accuracy_100', name: 'Perfeição Absoluta', description: '100% de precisão em 25+ revisões', icon: '🌟', requirement: 100, type: 'accuracy' },

  // ============ XP ACHIEVEMENTS ============
  { key: 'xp_100', name: 'Centelha de Axé', description: 'Acumule 100 XP', icon: '✨', requirement: 100, type: 'xp' },
  { key: 'xp_500', name: 'Axé Crescente', description: 'Acumule 500 XP', icon: '🌙', requirement: 500, type: 'xp' },
  { key: 'xp_1000', name: 'Axé Abundante', description: 'Acumule 1000 XP', icon: '☀️', requirement: 1000, type: 'xp' },
  { key: 'xp_2500', name: 'Força de Orí', description: 'Acumule 2500 XP', icon: '💫', requirement: 2500, type: 'xp' },
  { key: 'xp_5000', name: 'Orí Iluminado', description: 'Acumule 5000 XP', icon: '🔆', requirement: 5000, type: 'xp' },
  { key: 'xp_10000', name: 'Mestre do Axé', description: 'Acumule 10000 XP', icon: '👑', requirement: 10000, type: 'xp' },

  // ============ LEVEL ACHIEVEMENTS ============
  { key: 'level_5', name: 'Aprendiz', description: 'Alcance o nível 5', icon: '📿', requirement: 5, type: 'level' },
  { key: 'level_10', name: 'Iniciado', description: 'Alcance o nível 10', icon: '🎭', requirement: 10, type: 'level' },
  { key: 'level_20', name: 'Conhecedor', description: 'Alcance o nível 20', icon: '📚', requirement: 20, type: 'level' },
  { key: 'level_akapo', name: 'Akapo', description: 'Alcance o nível Akapo', icon: '📿', requirement: 1, type: 'level' },
  { key: 'level_awo', name: 'Awo', description: 'Alcance o nível Awo', icon: '🎭', requirement: 1, type: 'level' },
  { key: 'level_oluwo', name: 'Oluwo', description: 'Alcance o nível Oluwo', icon: '👑', requirement: 1, type: 'level' },

  // ============ MASTERY ACHIEVEMENTS ============
  { key: 'mastery_first_verse', name: 'Primeiro Verso', description: 'Complete sua primeira memorização com 100%', icon: '📜', requirement: 1, type: 'mastery' },
  { key: 'mastery_perfect_lesson', name: 'Lição Perfeita', description: 'Complete uma lição inteira sem erros', icon: '✅', requirement: 1, type: 'mastery' },
  { key: 'mastery_speed_demon', name: 'Velocidade Sagrada', description: 'Complete 10 itens em menos de 2 min no Desafio', icon: '⚡', requirement: 1, type: 'mastery' },
  { key: 'mastery_perfect_5', name: 'Série Perfeita', description: '5 exercícios seguidos com 100%', icon: '🎯', requirement: 5, type: 'mastery' },

  // ============ TIME-BASED ACHIEVEMENTS ============
  { key: 'time_early_bird', name: 'Madrugador', description: 'Estude antes das 6h da manhã', icon: '🌅', requirement: 1, type: 'time' },
  { key: 'time_night_owl', name: 'Coruja Noturna', description: 'Estude depois das 22h', icon: '🦉', requirement: 1, type: 'time' },
  { key: 'time_weekend_warrior', name: 'Guerreiro de Fim de Semana', description: 'Estude sábado e domingo', icon: '⚔️', requirement: 1, type: 'time' },

  // ============ RETENTION ACHIEVEMENTS ============
  { key: 'retention_first_review', name: 'Primeira Revisão', description: 'Complete sua primeira revisão de módulo', icon: '🔄', requirement: 1, type: 'retention' },
  { key: 'retention_memory_keeper', name: 'Guardião da Memória', description: 'Mantenha 90%+ de retenção em 3 módulos', icon: '🛡️', requirement: 3, type: 'retention' },
  { key: 'retention_perfect_recall', name: 'Memória Perfeita', description: '100% de acerto em uma revisão de módulo', icon: '💫', requirement: 1, type: 'retention' },

  // ============ CHALLENGE ACHIEVEMENTS ============
  { key: 'challenge_first_win', name: 'Primeiro Desafio', description: 'Complete seu primeiro Modo Desafio', icon: '🎮', requirement: 1, type: 'challenge' },
  { key: 'challenge_high_score', name: 'Pontuação Alta', description: 'Alcance 500+ pontos em um desafio', icon: '🏅', requirement: 500, type: 'challenge' },
  { key: 'challenge_combo_master', name: 'Mestre dos Combos', description: 'Alcance 1000+ pontos em um desafio', icon: '🔥', requirement: 1000, type: 'challenge' },
  { key: 'challenge_5', name: 'Competidor', description: 'Complete 5 desafios', icon: '🎯', requirement: 5, type: 'challenge' },
  { key: 'challenge_10', name: 'Campeão', description: 'Complete 10 desafios', icon: '🏆', requirement: 10, type: 'challenge' },

  // ============ JOURNEY ACHIEVEMENTS ============
  { key: 'journey_first_module', name: 'Jornada Iniciada', description: 'Complete seu primeiro módulo', icon: '🚀', requirement: 1, type: 'journey' },
  { key: 'journey_proficiency_complete', name: 'Trilha de Proficiência', description: 'Complete toda a trilha Akapo → Awo → Oluwo', icon: '🏛️', requirement: 1, type: 'journey' },
  { key: 'journey_thematic_explorer', name: 'Explorador Temático', description: 'Complete 3 módulos temáticos', icon: '🧭', requirement: 3, type: 'journey' },
  { key: 'journey_thematic_master', name: 'Mestre Temático', description: 'Complete 5 módulos temáticos', icon: '🌟', requirement: 5, type: 'journey' },

  // ============ EXPLORATION ACHIEVEMENTS ============
  { key: 'exploration_first_flashcard', name: 'Primeiro Flash', description: 'Complete seu primeiro flash card', icon: '⚡', requirement: 1, type: 'exploration' },
  { key: 'exploration_first_reading', name: 'Primeira Leitura', description: 'Complete sua primeira leitura guiada', icon: '📖', requirement: 1, type: 'exploration' },
  { key: 'exploration_first_drag', name: 'Primeiro Encaixe', description: 'Complete seu primeiro arrastar e soltar', icon: '🧩', requirement: 1, type: 'exploration' },
  { key: 'exploration_first_quiz', name: 'Primeiro Quiz', description: 'Complete seu primeiro quiz', icon: '❓', requirement: 1, type: 'exploration' },
  { key: 'exploration_all_types', name: 'Explorador Completo', description: 'Use todos os tipos de exercício', icon: '🗺️', requirement: 4, type: 'exploration' },

  // ============ DAILY GOAL ACHIEVEMENTS ============
  { key: 'daily_goal_first', name: 'Meta Cumprida', description: 'Complete sua primeira meta diária', icon: '🎯', requirement: 1, type: 'mastery' },
  { key: 'daily_goal_7', name: 'Meta Semanal', description: 'Complete a meta diária 7 vezes', icon: '📅', requirement: 7, type: 'mastery' },
  { key: 'daily_goal_30', name: 'Meta Mensal', description: 'Complete a meta diária 30 vezes', icon: '🏆', requirement: 30, type: 'mastery' },

  // ============ SECRET ACHIEVEMENTS ============
  { key: 'secret_ifa_day', name: 'Dia de Ifá', description: 'Estude no dia 4 de junho (Dia de Ifá)', icon: '🎂', requirement: 1, type: 'secret', secret: true },
  { key: 'secret_midnight', name: 'Meia-Noite Sagrada', description: 'Estude exatamente à meia-noite', icon: '🌑', requirement: 1, type: 'secret', secret: true },
  { key: 'secret_perfect_week', name: 'Semana Perfeita', description: '100% de acerto durante 7 dias seguidos', icon: '💎', requirement: 7, type: 'secret', secret: true },
  { key: 'secret_odu_16', name: 'Meji Sagrado', description: 'Memorize os 16 Odus principais', icon: '🔯', requirement: 16, type: 'secret', secret: true },
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

  const unlockAchievement = async (achievementKey: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from('user_achievements')
        .insert({
          user_id: user.id,
          achievement_key: achievementKey,
        });

      if (error) {
        // Already exists - not an error
        if (error.code === '23505') return false;
        throw error;
      }
      
      await fetchAchievements();
      return true;
    } catch (err) {
      console.error('Error unlocking achievement:', err);
      return false;
    }
  };

  const checkAndUnlockAchievements = async (stats: AchievementStats): Promise<Achievement[]> => {
    if (!user) return [];

    const newlyUnlocked: Achievement[] = [];
    const unlockedKeys = new Set(unlockedAchievements.map(a => a.achievement_key));
    const now = new Date();
    const currentHour = stats.currentHour ?? now.getHours();

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
          const minReviewsMap: Record<number, number> = { 80: 10, 90: 20, 95: 50, 100: 25 };
          const minReviews = minReviewsMap[achievement.requirement] || 20;
          if (stats.accuracy && stats.totalReviews && 
              stats.accuracy >= achievement.requirement && 
              stats.totalReviews >= minReviews) {
            shouldUnlock = true;
          }
          break;

        case 'xp':
          if (stats.totalXP && stats.totalXP >= achievement.requirement) {
            shouldUnlock = true;
          }
          break;

        case 'level':
          // Numeric level achievements
          if (achievement.key.startsWith('level_') && !isNaN(Number(achievement.key.split('_')[1]))) {
            if (stats.currentLevel && stats.currentLevel >= achievement.requirement) {
              shouldUnlock = true;
            }
          }
          // Named level achievements (Akapo, Awo, Oluwo)
          if (achievement.key === 'level_akapo' && stats.levelName?.toLowerCase().includes('akapo')) {
            shouldUnlock = true;
          }
          if (achievement.key === 'level_awo' && stats.levelName?.toLowerCase().includes('awo')) {
            shouldUnlock = true;
          }
          if (achievement.key === 'level_oluwo' && stats.levelName?.toLowerCase().includes('oluwo')) {
            shouldUnlock = true;
          }
          break;

        case 'mastery':
          if (achievement.key === 'mastery_first_verse' && stats.perfectReviewCount && stats.perfectReviewCount >= 1) {
            shouldUnlock = true;
          }
          if (achievement.key === 'mastery_perfect_5' && stats.perfectReviewCount && stats.perfectReviewCount >= 5) {
            shouldUnlock = true;
          }
          if (achievement.key === 'daily_goal_first' && stats.dailyGoalsCompleted && stats.dailyGoalsCompleted >= 1) {
            shouldUnlock = true;
          }
          if (achievement.key === 'daily_goal_7' && stats.dailyGoalsCompleted && stats.dailyGoalsCompleted >= 7) {
            shouldUnlock = true;
          }
          if (achievement.key === 'daily_goal_30' && stats.dailyGoalsCompleted && stats.dailyGoalsCompleted >= 30) {
            shouldUnlock = true;
          }
          break;

        case 'time':
          if (achievement.key === 'time_early_bird' && currentHour < 6) {
            shouldUnlock = true;
          }
          if (achievement.key === 'time_night_owl' && currentHour >= 22) {
            shouldUnlock = true;
          }
          if (achievement.key === 'time_weekend_warrior' && stats.studiedBothWeekendDays) {
            shouldUnlock = true;
          }
          break;

        case 'retention':
          if (achievement.key === 'retention_first_review' && stats.retentionModules90Plus && stats.retentionModules90Plus >= 1) {
            shouldUnlock = true;
          }
          if (achievement.key === 'retention_memory_keeper' && stats.retentionModules90Plus && stats.retentionModules90Plus >= 3) {
            shouldUnlock = true;
          }
          break;

        case 'challenge':
          if (achievement.key === 'challenge_first_win' && stats.challengesCompleted && stats.challengesCompleted >= 1) {
            shouldUnlock = true;
          }
          if (achievement.key === 'challenge_5' && stats.challengesCompleted && stats.challengesCompleted >= 5) {
            shouldUnlock = true;
          }
          if (achievement.key === 'challenge_10' && stats.challengesCompleted && stats.challengesCompleted >= 10) {
            shouldUnlock = true;
          }
          if (achievement.key === 'challenge_high_score' && stats.highestChallengeScore && stats.highestChallengeScore >= 500) {
            shouldUnlock = true;
          }
          if (achievement.key === 'challenge_combo_master' && stats.highestChallengeScore && stats.highestChallengeScore >= 1000) {
            shouldUnlock = true;
          }
          break;

        case 'journey':
          if (achievement.key === 'journey_first_module' && stats.modulesCompleted && stats.modulesCompleted >= 1) {
            shouldUnlock = true;
          }
          if (achievement.key === 'journey_thematic_explorer' && stats.thematicModulesCompleted && stats.thematicModulesCompleted >= 3) {
            shouldUnlock = true;
          }
          if (achievement.key === 'journey_thematic_master' && stats.thematicModulesCompleted && stats.thematicModulesCompleted >= 5) {
            shouldUnlock = true;
          }
          if (achievement.key === 'journey_proficiency_complete' && stats.proficiencyModulesCompleted && stats.proficiencyModulesCompleted >= 3) {
            shouldUnlock = true;
          }
          break;

        case 'exploration':
          if (achievement.key === 'exploration_all_types' && stats.exerciseTypesUsed && stats.exerciseTypesUsed >= 4) {
            shouldUnlock = true;
          }
          // Individual exercise type achievements are unlocked via triggers
          break;

        case 'secret':
          // Dia de Ifá (June 4th)
          if (achievement.key === 'secret_ifa_day' && now.getMonth() === 5 && now.getDate() === 4) {
            shouldUnlock = true;
          }
          // Midnight study
          if (achievement.key === 'secret_midnight' && currentHour === 0) {
            shouldUnlock = true;
          }
          // 16 Odus memorized
          if (achievement.key === 'secret_odu_16' && stats.itemsCount && stats.itemsCount >= 16) {
            shouldUnlock = true;
          }
          break;
      }

      if (shouldUnlock) {
        const unlocked = await unlockAchievement(achievement.key);
        if (unlocked) {
          newlyUnlocked.push(achievement);
        }
      }
    }

    return newlyUnlocked;
  };

  const checkAllAchievements = async (): Promise<Achievement[]> => {
    if (!user) return [];

    try {
      // Fetch all stats in parallel
      const [
        streakRes, 
        itemsRes, 
        modulesRes, 
        experienceRes, 
        challengesRes, 
        dailyGoalsRes,
        retentionRes,
        progressRes
      ] = await Promise.all([
        supabase.from('user_streaks').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('spaced_repetition_items').select('id, correct_reviews, total_reviews').eq('user_id', user.id),
        supabase.from('module_completions').select('id, module_id').eq('user_id', user.id),
        supabase.from('user_experience').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('challenge_records').select('id, score').eq('user_id', user.id),
        supabase.from('daily_goals').select('id').eq('user_id', user.id).not('completed_at', 'is', null),
        supabase.from('module_retention_schedule').select('retention_score').eq('user_id', user.id),
        supabase.from('user_progress').select('exercise_id, score').eq('user_id', user.id),
      ]);

      const streak = streakRes.data;
      const items = itemsRes.data || [];
      const modules = modulesRes.data || [];
      const experience = experienceRes.data;
      const challenges = challengesRes.data || [];
      const dailyGoals = dailyGoalsRes.data || [];
      const retentions = retentionRes.data || [];
      const progress = progressRes.data || [];

      const totalReviews = items.reduce((acc, item) => acc + item.total_reviews, 0);
      const correctReviews = items.reduce((acc, item) => acc + item.correct_reviews, 0);
      const accuracy = totalReviews > 0 ? Math.round((correctReviews / totalReviews) * 100) : 0;
      
      const highestChallengeScore = challenges.length > 0 
        ? Math.max(...challenges.map(c => c.score)) 
        : 0;
      
      const retentionModules90Plus = retentions.filter(r => (r.retention_score ?? 0) >= 90).length;
      const perfectReviewCount = progress.filter(p => p.score === 100).length;

      // Get unique exercise types used
      const exerciseTypesUsed = new Set(progress.filter(p => p.exercise_id).map(p => p.exercise_id)).size;

      return checkAndUnlockAchievements({
        currentStreak: streak?.current_streak || 0,
        totalDays: streak?.total_review_days || 0,
        itemsCount: items.length,
        modulesCompleted: modules.length,
        accuracy,
        totalReviews,
        totalXP: experience?.total_xp || 0,
        currentLevel: experience?.current_level || 1,
        levelName: experience?.level_name || '',
        challengesCompleted: challenges.length,
        highestChallengeScore,
        dailyGoalsCompleted: dailyGoals.length,
        retentionModules90Plus,
        perfectReviewCount,
        exerciseTypesUsed,
        currentHour: new Date().getHours(),
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

  // Check if achievement is visible (non-secret or already unlocked)
  const isVisible = (achievement: Achievement): boolean => {
    return !achievement.secret || isUnlocked(achievement.key);
  };

  // Get visible achievements (hides secret ones until unlocked)
  const getVisibleAchievements = (): Achievement[] => {
    return ACHIEVEMENTS.filter(a => isVisible(a));
  };

  return {
    achievements: ACHIEVEMENTS,
    visibleAchievements: getVisibleAchievements(),
    unlockedAchievements,
    loading,
    checkAndUnlockAchievements,
    checkAllAchievements,
    unlockAchievement,
    isUnlocked,
    getUnlockDate,
    isVisible,
    refreshAchievements: fetchAchievements,
  };
};
