import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ChallengeRecord {
  id: string;
  user_id: string;
  score: number;
  items_answered: number;
  correct_count: number;
  time_seconds: number;
  created_at: string;
}

export interface ChallengeState {
  isActive: boolean;
  timeRemaining: number;
  score: number;
  itemsAnswered: number;
  correctCount: number;
  currentMultiplier: number;
}

const CHALLENGE_DURATION = 300; // 5 minutes in seconds

export const useChallenge = () => {
  const { user } = useAuth();
  const [bestRecord, setBestRecord] = useState<ChallengeRecord | null>(null);
  const [recentRecords, setRecentRecords] = useState<ChallengeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    if (!user) {
      setBestRecord(null);
      setRecentRecords([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch best record
      const { data: best, error: bestError } = await supabase
        .from('challenge_records')
        .select('*')
        .eq('user_id', user.id)
        .order('score', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (bestError) throw bestError;
      setBestRecord(best);

      // Fetch recent records
      const { data: recent, error: recentError } = await supabase
        .from('challenge_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentError) throw recentError;
      setRecentRecords(recent || []);
    } catch (error) {
      console.error('Error fetching challenge records:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const saveRecord = async (score: number, itemsAnswered: number, correctCount: number, timeSeconds: number) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('challenge_records')
        .insert({
          user_id: user.id,
          score,
          items_answered: itemsAnswered,
          correct_count: correctCount,
          time_seconds: timeSeconds,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      await fetchRecords();

      return data;
    } catch (error) {
      console.error('Error saving challenge record:', error);
      return null;
    }
  };

  const calculateMultiplier = (responseTimeMs: number): number => {
    if (responseTimeMs < 3000) return 3;
    if (responseTimeMs < 5000) return 2;
    if (responseTimeMs < 10000) return 1.5;
    return 1;
  };

  const calculatePoints = (correct: boolean, responseTimeMs: number): number => {
    if (!correct) return 0;
    const basePoints = 10;
    const multiplier = calculateMultiplier(responseTimeMs);
    return Math.round(basePoints * multiplier);
  };

  return {
    bestRecord,
    recentRecords,
    loading,
    saveRecord,
    calculateMultiplier,
    calculatePoints,
    CHALLENGE_DURATION,
    refreshRecords: fetchRecords,
  };
};
