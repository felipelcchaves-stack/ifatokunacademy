import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { analyzeErrors, ErrorAnalysis } from '@/lib/errorAnalysis';

export interface ErrorStatsRecord {
  id: string;
  user_id: string;
  spaced_item_id: string | null;
  exercise_id: string | null;
  module_id: string | null;
  accent_errors: number;
  word_swap_errors: number;
  omission_errors: number;
  insertion_errors: number;
  other_errors: number;
  review_count: number;
  last_review_at: string | null;
  original_text: string | null;
  last_typed_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface AggregatedErrorStats {
  totalErrors: number;
  accentErrors: number;
  wordSwapErrors: number;
  omissionErrors: number;
  insertionErrors: number;
  otherErrors: number;
  reviewCount: number;
  errorsByModule: Record<string, {
    moduleId: string;
    accentErrors: number;
    wordSwapErrors: number;
    omissionErrors: number;
    insertionErrors: number;
    otherErrors: number;
  }>;
}

interface UseErrorStatsReturn {
  errorStats: ErrorStatsRecord[];
  aggregatedStats: AggregatedErrorStats;
  loading: boolean;
  recordError: (params: {
    spacedItemId?: string;
    exerciseId?: string;
    moduleId?: string;
    originalText: string;
    typedText: string;
  }) => Promise<void>;
  refreshStats: () => Promise<void>;
}

export function useErrorStats(): UseErrorStatsReturn {
  const { user } = useAuth();
  const [errorStats, setErrorStats] = useState<ErrorStatsRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user?.id) {
      setErrorStats([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('review_error_stats')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setErrorStats((data || []) as ErrorStatsRecord[]);
    } catch (error) {
      console.error('Error fetching error stats:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const recordError = async (params: {
    spacedItemId?: string;
    exerciseId?: string;
    moduleId?: string;
    originalText: string;
    typedText: string;
  }): Promise<void> => {
    if (!user?.id) return;

    const analysis = analyzeErrors(params.originalText, params.typedText);
    
    // Skip if no errors detected
    const totalErrors = analysis.accentErrors + analysis.wordSwapErrors + 
      analysis.omissionErrors + analysis.insertionErrors + analysis.otherErrors;
    if (totalErrors === 0) return;

    try {
      // Check if record exists for this spaced item
      if (params.spacedItemId) {
        const { data: existing } = await supabase
          .from('review_error_stats')
          .select('*')
          .eq('user_id', user.id)
          .eq('spaced_item_id', params.spacedItemId)
          .maybeSingle();

        if (existing) {
          // Update existing record
          const { error } = await supabase
            .from('review_error_stats')
            .update({
              accent_errors: (existing as ErrorStatsRecord).accent_errors + analysis.accentErrors,
              word_swap_errors: (existing as ErrorStatsRecord).word_swap_errors + analysis.wordSwapErrors,
              omission_errors: (existing as ErrorStatsRecord).omission_errors + analysis.omissionErrors,
              insertion_errors: (existing as ErrorStatsRecord).insertion_errors + analysis.insertionErrors,
              other_errors: (existing as ErrorStatsRecord).other_errors + analysis.otherErrors,
              review_count: (existing as ErrorStatsRecord).review_count + 1,
              last_review_at: new Date().toISOString(),
              last_typed_text: params.typedText,
              updated_at: new Date().toISOString()
            })
            .eq('id', (existing as ErrorStatsRecord).id);

          if (error) throw error;
        } else {
          // Create new record
          await createNewRecord(params, analysis);
        }
      } else {
        // Create new record without spaced item reference
        await createNewRecord(params, analysis);
      }

      await fetchStats();
    } catch (error) {
      console.error('Error recording error stats:', error);
    }
  };

  const createNewRecord = async (
    params: {
      spacedItemId?: string;
      exerciseId?: string;
      moduleId?: string;
      originalText: string;
      typedText: string;
    },
    analysis: ErrorAnalysis
  ) => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('review_error_stats')
      .insert({
        user_id: user.id,
        spaced_item_id: params.spacedItemId || null,
        exercise_id: params.exerciseId || null,
        module_id: params.moduleId || null,
        accent_errors: analysis.accentErrors,
        word_swap_errors: analysis.wordSwapErrors,
        omission_errors: analysis.omissionErrors,
        insertion_errors: analysis.insertionErrors,
        other_errors: analysis.otherErrors,
        review_count: 1,
        last_review_at: new Date().toISOString(),
        original_text: params.originalText,
        last_typed_text: params.typedText
      });

    if (error) throw error;
  };

  // Calculate aggregated statistics
  const aggregatedStats: AggregatedErrorStats = errorStats.reduce((acc, stat) => {
    acc.accentErrors += stat.accent_errors;
    acc.wordSwapErrors += stat.word_swap_errors;
    acc.omissionErrors += stat.omission_errors;
    acc.insertionErrors += stat.insertion_errors;
    acc.otherErrors += stat.other_errors;
    acc.reviewCount += stat.review_count;

    if (stat.module_id) {
      if (!acc.errorsByModule[stat.module_id]) {
        acc.errorsByModule[stat.module_id] = {
          moduleId: stat.module_id,
          accentErrors: 0,
          wordSwapErrors: 0,
          omissionErrors: 0,
          insertionErrors: 0,
          otherErrors: 0
        };
      }
      acc.errorsByModule[stat.module_id].accentErrors += stat.accent_errors;
      acc.errorsByModule[stat.module_id].wordSwapErrors += stat.word_swap_errors;
      acc.errorsByModule[stat.module_id].omissionErrors += stat.omission_errors;
      acc.errorsByModule[stat.module_id].insertionErrors += stat.insertion_errors;
      acc.errorsByModule[stat.module_id].otherErrors += stat.other_errors;
    }

    return acc;
  }, {
    totalErrors: 0,
    accentErrors: 0,
    wordSwapErrors: 0,
    omissionErrors: 0,
    insertionErrors: 0,
    otherErrors: 0,
    reviewCount: 0,
    errorsByModule: {} as AggregatedErrorStats['errorsByModule']
  });

  aggregatedStats.totalErrors = aggregatedStats.accentErrors + aggregatedStats.wordSwapErrors +
    aggregatedStats.omissionErrors + aggregatedStats.insertionErrors + aggregatedStats.otherErrors;

  return {
    errorStats,
    aggregatedStats,
    loading,
    recordError,
    refreshStats: fetchStats
  };
}
