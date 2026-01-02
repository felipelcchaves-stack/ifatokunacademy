import { useCallback } from 'react';
import { useAchievements, AchievementStats } from './useAchievements';

/**
 * Hook for triggering achievement checks in real-time
 * Use this after specific user actions like completing exercises, reviews, etc.
 */
export const useAchievementTriggers = () => {
  const { checkAndUnlockAchievements, unlockAchievement, isUnlocked } = useAchievements();

  /**
   * Trigger after completing an exercise
   */
  const onExerciseComplete = useCallback(async (exerciseType: string, score: number) => {
    const achievementMap: Record<string, string> = {
      'flashcard': 'exploration_first_flashcard',
      'reading': 'exploration_first_reading',
      'drag_drop': 'exploration_first_drag',
      'quiz': 'exploration_first_quiz',
    };

    const achievementKey = achievementMap[exerciseType];
    if (achievementKey && !isUnlocked(achievementKey)) {
      await unlockAchievement(achievementKey);
    }

    // Check for mastery achievements
    if (score === 100) {
      if (!isUnlocked('mastery_first_verse')) {
        await unlockAchievement('mastery_first_verse');
      }
    }
  }, [isUnlocked, unlockAchievement]);

  /**
   * Trigger after completing a review session
   */
  const onReviewComplete = useCallback(async (stats: Partial<AchievementStats>) => {
    const currentHour = new Date().getHours();
    
    await checkAndUnlockAchievements({
      ...stats,
      currentHour,
    });
  }, [checkAndUnlockAchievements]);

  /**
   * Trigger after completing a challenge
   */
  const onChallengeComplete = useCallback(async (score: number, itemsCorrect: number, timeMs: number) => {
    const stats: Partial<AchievementStats> = {
      challengesCompleted: 1, // Will be added to existing count in checkAllAchievements
      highestChallengeScore: score,
    };

    // Check for speed demon achievement (10 items in less than 2 minutes)
    if (itemsCorrect >= 10 && timeMs < 120000 && !isUnlocked('mastery_speed_demon')) {
      await unlockAchievement('mastery_speed_demon');
    }

    await checkAndUnlockAchievements(stats);
  }, [checkAndUnlockAchievements, isUnlocked, unlockAchievement]);

  /**
   * Trigger after XP is added
   */
  const onXPGained = useCallback(async (totalXP: number, currentLevel: number, levelName: string) => {
    await checkAndUnlockAchievements({
      totalXP,
      currentLevel,
      levelName,
    });
  }, [checkAndUnlockAchievements]);

  /**
   * Trigger after daily goal is completed
   */
  const onDailyGoalComplete = useCallback(async (totalCompleted: number) => {
    await checkAndUnlockAchievements({
      dailyGoalsCompleted: totalCompleted,
    });
  }, [checkAndUnlockAchievements]);

  /**
   * Trigger after module retention review
   */
  const onRetentionReviewComplete = useCallback(async (retentionScore: number, isPerfect: boolean) => {
    if (!isUnlocked('retention_first_review')) {
      await unlockAchievement('retention_first_review');
    }

    if (isPerfect && !isUnlocked('retention_perfect_recall')) {
      await unlockAchievement('retention_perfect_recall');
    }
  }, [isUnlocked, unlockAchievement]);

  /**
   * Trigger on study session start (for time-based achievements)
   */
  const onStudySessionStart = useCallback(async () => {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

    // Early bird (before 6am)
    if (hour < 6 && !isUnlocked('time_early_bird')) {
      await unlockAchievement('time_early_bird');
    }

    // Night owl (after 10pm)
    if (hour >= 22 && !isUnlocked('time_night_owl')) {
      await unlockAchievement('time_night_owl');
    }

    // Midnight (exactly midnight hour)
    if (hour === 0 && !isUnlocked('secret_midnight')) {
      await unlockAchievement('secret_midnight');
    }

    // Ifá Day (June 4th)
    if (now.getMonth() === 5 && now.getDate() === 4 && !isUnlocked('secret_ifa_day')) {
      await unlockAchievement('secret_ifa_day');
    }

    // Weekend warrior - check if it's weekend
    if ((dayOfWeek === 0 || dayOfWeek === 6) && !isUnlocked('time_weekend_warrior')) {
      // We'll need to track this separately - for now, unlock on weekend study
      // A more complete implementation would track Saturday + Sunday
    }
  }, [isUnlocked, unlockAchievement]);

  return {
    onExerciseComplete,
    onReviewComplete,
    onChallengeComplete,
    onXPGained,
    onDailyGoalComplete,
    onRetentionReviewComplete,
    onStudySessionStart,
  };
};
