import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DailyGoal {
  id: string;
  user_id: string;
  date: string;
  goal_type: string;
  target_value: number;
  current_value: number;
  completed_at: string | null;
  xp_reward: number;
  created_at: string;
}

export interface GoalPreset {
  type: 'light' | 'moderate' | 'intense';
  label: string;
  target: number;
  xpReward: number;
  description: string;
}

export const GOAL_PRESETS: GoalPreset[] = [
  { type: 'light', label: 'Leve', target: 5, xpReward: 20, description: '5 itens revisados' },
  { type: 'moderate', label: 'Moderado', target: 15, xpReward: 40, description: '15 itens revisados' },
  { type: 'intense', label: 'Intenso', target: 30, xpReward: 80, description: '30 itens revisados' },
];

export interface UseDailyGoalReturn {
  goal: DailyGoal | null;
  loading: boolean;
  setDailyGoal: (preset: GoalPreset) => Promise<void>;
  incrementProgress: (amount?: number) => Promise<{ completed: boolean; xpReward: number }>;
  refreshGoal: () => Promise<void>;
  getProgressPercentage: () => number;
}

export const useDailyGoal = (): UseDailyGoalReturn => {
  const { user } = useAuth();
  const [goal, setGoal] = useState<DailyGoal | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  const fetchGoal = useCallback(async () => {
    if (!user) {
      setGoal(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('daily_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (error) throw error;
      setGoal(data);
    } catch (error) {
      console.error('Error fetching daily goal:', error);
    } finally {
      setLoading(false);
    }
  }, [user, today]);

  useEffect(() => {
    fetchGoal();
  }, [fetchGoal]);

  const setDailyGoal = async (preset: GoalPreset) => {
    if (!user) return;

    try {
      // Check if goal exists for today
      const { data: existingGoal } = await supabase
        .from('daily_goals')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (existingGoal) {
        // Update existing goal
        const { data, error } = await supabase
          .from('daily_goals')
          .update({
            target_value: preset.target,
            xp_reward: preset.xpReward,
            current_value: 0,
            completed_at: null,
          })
          .eq('id', existingGoal.id)
          .select()
          .single();

        if (error) throw error;
        setGoal(data);
      } else {
        // Create new goal
        const { data, error } = await supabase
          .from('daily_goals')
          .insert({
            user_id: user.id,
            date: today,
            goal_type: 'items_reviewed',
            target_value: preset.target,
            xp_reward: preset.xpReward,
            current_value: 0,
          })
          .select()
          .single();

        if (error) throw error;
        setGoal(data);
      }
    } catch (error) {
      console.error('Error setting daily goal:', error);
    }
  };

  const incrementProgress = async (amount: number = 1) => {
    if (!user || !goal) {
      return { completed: false, xpReward: 0 };
    }

    // Already completed
    if (goal.completed_at) {
      return { completed: false, xpReward: 0 };
    }

    try {
      const newValue = goal.current_value + amount;
      const isCompleted = newValue >= goal.target_value;

      const { data, error } = await supabase
        .from('daily_goals')
        .update({
          current_value: newValue,
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .eq('id', goal.id)
        .select()
        .single();

      if (error) throw error;
      setGoal(data);

      return { 
        completed: isCompleted, 
        xpReward: isCompleted ? goal.xp_reward : 0 
      };
    } catch (error) {
      console.error('Error incrementing goal progress:', error);
      return { completed: false, xpReward: 0 };
    }
  };

  const getProgressPercentage = () => {
    if (!goal) return 0;
    return Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));
  };

  return {
    goal,
    loading,
    setDailyGoal,
    incrementProgress,
    refreshGoal: fetchGoal,
    getProgressPercentage,
  };
};
