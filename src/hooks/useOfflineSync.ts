import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getPendingReviews, clearPendingReviews, getPendingCount } from '@/lib/offlineDb';
import { toast } from 'sonner';

interface UseOfflineSyncReturn {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  syncPendingReviews: () => Promise<void>;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Update pending count
  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch {
      // IndexedDB not available
    }
  }, []);

  // Sync pending reviews to backend
  const syncPendingReviews = useCallback(async () => {
    const pending = await getPendingReviews();
    if (pending.length === 0) return;

    setIsSyncing(true);
    try {
      let synced = 0;
      for (const review of pending) {
        const { error } = await supabase
          .from('spaced_repetition_items')
          .update({
            next_review_at: review.calculatedUpdate.next_review_at,
            interval_days: review.calculatedUpdate.interval_days,
            ease_factor: review.calculatedUpdate.ease_factor,
            repetitions: review.calculatedUpdate.repetitions,
            total_reviews: review.calculatedUpdate.total_reviews,
            correct_reviews: review.calculatedUpdate.correct_reviews,
          })
          .eq('id', review.itemId);

        if (!error) synced++;
      }

      await clearPendingReviews();
      setPendingCount(0);

      if (synced > 0) {
        toast.success(`${synced} ${synced === 1 ? 'revisão sincronizada' : 'revisões sincronizadas'} com sucesso!`);
      }
    } catch (err) {
      console.error('Sync failed:', err);
      toast.error('Erro ao sincronizar revisões. Tentaremos novamente.');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      syncPendingReviews();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check pending count on mount
    refreshPendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingReviews, refreshPendingCount]);

  return { isOnline, isSyncing, pendingCount, syncPendingReviews };
}
