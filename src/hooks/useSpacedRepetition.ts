import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  cacheSpacedItems,
  getCachedSpacedItems,
  updateCachedItem,
  addPendingReview,
} from '@/lib/offlineDb';

export interface SpacedRepetitionItem {
  id: string;
  user_id: string;
  exercise_id: string | null;
  lesson_id: string | null;
  module_id: string | null;
  item_index: number;
  item_text: string;
  next_review_at: string;
  interval_days: number;
  ease_factor: number;
  repetitions: number;
  total_reviews: number;
  correct_reviews: number;
  created_at: string;
  updated_at: string;
}

interface UseSpacedRepetitionReturn {
  dueItems: SpacedRepetitionItem[];
  allItems: SpacedRepetitionItem[];
  loading: boolean;
  dueCount: number;
  addItem: (exerciseId: string, itemIndex: number, itemText: string, options?: { lessonId?: string; moduleId?: string; easeFactor?: number }) => Promise<void>;
  recordReview: (itemId: string, wasCorrect: boolean) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  refreshItems: () => Promise<void>;
}

/**
 * Algoritmo SM-2 simplificado para calcular o próximo intervalo
 */
export function calculateNextReview(
  currentInterval: number,
  easeFactor: number,
  repetitions: number,
  wasCorrect: boolean
): { intervalDays: number; easeFactor: number; repetitions: number } {
  if (wasCorrect) {
    let newInterval: number;
    const newRepetitions = repetitions + 1;

    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(currentInterval * easeFactor);
    }

    const newEaseFactor = Math.min(2.5, easeFactor + 0.1);

    return {
      intervalDays: newInterval,
      easeFactor: newEaseFactor,
      repetitions: newRepetitions,
    };
  } else {
    const newEaseFactor = Math.max(1.3, easeFactor - 0.2);
    return {
      intervalDays: 1,
      easeFactor: newEaseFactor,
      repetitions: 0,
    };
  }
}

export function useSpacedRepetition(exerciseId?: string): UseSpacedRepetitionReturn {
  const { user } = useAuth();
  const [dueItems, setDueItems] = useState<SpacedRepetitionItem[]>([]);
  const [allItems, setAllItems] = useState<SpacedRepetitionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const processItems = useCallback((items: SpacedRepetitionItem[]) => {
    const now = new Date();
    setAllItems(items);
    setDueItems(items.filter((item) => new Date(item.next_review_at) <= now));
  }, []);

  const fetchItems = useCallback(async () => {
    if (!user?.id) {
      setDueItems([]);
      setAllItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      if (navigator.onLine) {
        // Online: fetch from backend + cache locally
        let query = supabase
          .from('spaced_repetition_items')
          .select('*')
          .eq('user_id', user.id)
          .order('next_review_at', { ascending: true });

        if (exerciseId) {
          query = query.eq('exercise_id', exerciseId);
        }

        const { data, error } = await query;
        if (error) throw error;

        const items = (data || []) as SpacedRepetitionItem[];
        processItems(items);

        // Cache for offline use (fire-and-forget)
        cacheSpacedItems(items).catch(() => {});
      } else {
        // Offline: load from IndexedDB
        const cached = await getCachedSpacedItems();
        let items = cached as SpacedRepetitionItem[];
        if (exerciseId) {
          items = items.filter((i) => i.exercise_id === exerciseId);
        }
        processItems(items);
      }
    } catch (error) {
      console.error('Error fetching spaced repetition items:', error);
      // Fallback to cache on any error
      try {
        const cached = await getCachedSpacedItems();
        let items = cached as SpacedRepetitionItem[];
        if (exerciseId) {
          items = items.filter((i) => i.exercise_id === exerciseId);
        }
        processItems(items);
      } catch {
        // IndexedDB also failed
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, exerciseId, processItems]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = async (
    exerciseId: string,
    itemIndex: number,
    itemText: string,
    options?: { lessonId?: string; moduleId?: string; easeFactor?: number }
  ): Promise<void> => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('spaced_repetition_items')
        .upsert(
          {
            user_id: user.id,
            exercise_id: exerciseId,
            item_index: itemIndex,
            item_text: itemText.substring(0, 200),
            next_review_at: new Date().toISOString(),
            interval_days: 1,
            ease_factor: options?.easeFactor ?? 2.5,
            repetitions: 0,
            lesson_id: options?.lessonId || null,
            module_id: options?.moduleId || null,
          },
          { onConflict: 'user_id,exercise_id,item_index' }
        );

      if (error) {
        console.error('Error adding spaced repetition item:', error);
        throw error;
      }
      await fetchItems();
    } catch (error) {
      console.error('Error in addItem:', error);
    }
  };

  const recordReview = async (itemId: string, wasCorrect: boolean): Promise<void> => {
    if (!user?.id) return;

    try {
      const item = allItems.find((i) => i.id === itemId);
      if (!item) {
        console.warn('Item not found for review:', itemId);
        return;
      }

      const { intervalDays, easeFactor, repetitions } = calculateNextReview(
        item.interval_days,
        item.ease_factor,
        item.repetitions,
        wasCorrect
      );

      const nextReviewAt = new Date();
      nextReviewAt.setDate(nextReviewAt.getDate() + intervalDays);

      const updateData = {
        next_review_at: nextReviewAt.toISOString(),
        interval_days: intervalDays,
        ease_factor: easeFactor,
        repetitions: repetitions,
        total_reviews: item.total_reviews + 1,
        correct_reviews: wasCorrect ? item.correct_reviews + 1 : item.correct_reviews,
      };

      if (navigator.onLine) {
        // Online: send to backend + update cache
        const { error } = await supabase
          .from('spaced_repetition_items')
          .update(updateData)
          .eq('id', itemId);

        if (error) {
          console.error('Error recording review:', error);
          throw error;
        }

        // Update local cache too
        updateCachedItem(itemId, updateData).catch(() => {});
      } else {
        // Offline: update IndexedDB + queue for sync
        await updateCachedItem(itemId, updateData);
        await addPendingReview({
          itemId,
          wasCorrect,
          timestamp: Date.now(),
          calculatedUpdate: updateData,
        });
      }

      await fetchItems();
    } catch (error) {
      console.error('Error in recordReview:', error);
    }
  };

  const removeItem = async (itemId: string): Promise<void> => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('spaced_repetition_items')
        .delete()
        .eq('id', itemId);

      if (error) {
        console.error('Error removing item:', error);
        throw error;
      }
      await fetchItems();
    } catch (error) {
      console.error('Error in removeItem:', error);
    }
  };

  return {
    dueItems,
    allItems,
    loading,
    dueCount: dueItems.length,
    addItem,
    recordReview,
    removeItem,
    refreshItems: fetchItems,
  };
}
