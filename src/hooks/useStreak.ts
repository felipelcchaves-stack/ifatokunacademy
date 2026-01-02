import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface StreakData {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_review_date: string | null;
  total_review_days: number;
  created_at: string;
  updated_at: string;
}

export interface UseStreakReturn {
  streak: StreakData | null;
  loading: boolean;
  recordDailyReview: () => Promise<boolean>;
  refreshStreak: () => Promise<void>;
}

export const useStreak = (): UseStreakReturn => {
  const { user } = useAuth();
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStreak = useCallback(async () => {
    if (!user) {
      setStreak(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setStreak(data);
    } catch (error) {
      console.error('Error fetching streak:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStreak();
  }, [fetchStreak]);

  const recordDailyReview = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const today = new Date().toISOString().split('T')[0];

      if (!streak) {
        // First time - create streak record
        const { data, error } = await supabase
          .from('user_streaks')
          .insert({
            user_id: user.id,
            current_streak: 1,
            longest_streak: 1,
            last_review_date: today,
            total_review_days: 1,
          })
          .select()
          .single();

        if (error) throw error;
        setStreak(data);
        return true;
      }

      // Already reviewed today
      if (streak.last_review_date === today) {
        return false;
      }

      const lastDate = streak.last_review_date ? new Date(streak.last_review_date) : null;
      const todayDate = new Date(today);
      
      let newStreak = 1;
      let isConsecutive = false;

      if (lastDate) {
        const diffTime = todayDate.getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          // Consecutive day
          newStreak = streak.current_streak + 1;
          isConsecutive = true;
        }
        // If diffDays > 1, streak resets to 1
      }

      const newLongest = Math.max(streak.longest_streak, newStreak);
      const newTotal = streak.total_review_days + 1;

      const { data, error } = await supabase
        .from('user_streaks')
        .update({
          current_streak: newStreak,
          longest_streak: newLongest,
          last_review_date: today,
          total_review_days: newTotal,
        })
        .eq('id', streak.id)
        .select()
        .single();

      if (error) throw error;
      setStreak(data);
      return true;
    } catch (error) {
      console.error('Error recording daily review:', error);
      return false;
    }
  };

  return {
    streak,
    loading,
    recordDailyReview,
    refreshStreak: fetchStreak,
  };
};
