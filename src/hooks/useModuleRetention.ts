import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ModuleRetentionSchedule {
  id: string;
  user_id: string;
  module_id: string;
  last_review_at: string;
  next_review_at: string;
  review_count: number;
  retention_score: number;
  items_reviewed: number;
  items_correct: number;
  created_at: string;
  updated_at: string;
}

export interface ModuleWithRetention {
  module_id: string;
  module_title: string;
  retention_score: number;
  next_review_at: string;
  last_review_at: string;
  days_since_review: number;
  status: 'fresh' | 'due_soon' | 'overdue';
  review_count: number;
}

interface UseModuleRetentionReturn {
  retentionSchedules: ModuleRetentionSchedule[];
  modulesNeedingReview: ModuleWithRetention[];
  loading: boolean;
  refreshSchedules: () => Promise<void>;
  createScheduleForModule: (moduleId: string) => Promise<void>;
  updateRetentionAfterReview: (moduleId: string, itemsReviewed: number, itemsCorrect: number) => Promise<void>;
  getRetentionStatus: (moduleId: string) => 'fresh' | 'due_soon' | 'overdue' | 'not_started';
}

/**
 * Calcula o próximo intervalo de revisão baseado no score de retenção
 * Score ≥90%: dobra o intervalo (máximo 90 dias)
 * Score <90%: reduz o intervalo pela metade
 */
function calculateNextInterval(currentInterval: number, retentionScore: number): number {
  if (retentionScore >= 90) {
    return Math.min(90, currentInterval * 2);
  } else if (retentionScore >= 70) {
    return currentInterval; // mantém o mesmo
  } else {
    return Math.max(3, Math.floor(currentInterval / 2));
  }
}

export function useModuleRetention(): UseModuleRetentionReturn {
  const { user } = useAuth();
  const [retentionSchedules, setRetentionSchedules] = useState<ModuleRetentionSchedule[]>([]);
  const [modulesNeedingReview, setModulesNeedingReview] = useState<ModuleWithRetention[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = useCallback(async () => {
    if (!user?.id) {
      setRetentionSchedules([]);
      setModulesNeedingReview([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch retention schedules
      const { data: schedules, error: schedulesError } = await supabase
        .from('module_retention_schedule')
        .select('*')
        .eq('user_id', user.id)
        .order('next_review_at', { ascending: true });

      if (schedulesError) throw schedulesError;

      // Fetch module titles
      const moduleIds = (schedules || []).map(s => s.module_id);
      
      let modulesData: { id: string; title: string }[] = [];
      if (moduleIds.length > 0) {
        const { data: modules, error: modulesError } = await supabase
          .from('modules')
          .select('id, title')
          .in('id', moduleIds);
        
        if (modulesError) throw modulesError;
        modulesData = modules || [];
      }

      const moduleMap = new Map(modulesData.map(m => [m.id, m.title]));
      const now = new Date();

      const modulesWithStatus: ModuleWithRetention[] = (schedules || []).map(schedule => {
        const nextReview = new Date(schedule.next_review_at);
        const lastReview = new Date(schedule.last_review_at);
        const daysSinceReview = Math.floor((now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24));
        
        let status: 'fresh' | 'due_soon' | 'overdue' = 'fresh';
        if (now > nextReview) {
          status = 'overdue';
        } else {
          const daysUntilDue = Math.floor((nextReview.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilDue <= 3) {
            status = 'due_soon';
          }
        }

        return {
          module_id: schedule.module_id,
          module_title: moduleMap.get(schedule.module_id) || 'Módulo',
          retention_score: schedule.retention_score,
          next_review_at: schedule.next_review_at,
          last_review_at: schedule.last_review_at,
          days_since_review: daysSinceReview,
          status,
          review_count: schedule.review_count,
        };
      });

      // Filter only modules needing review (due_soon or overdue)
      const needingReview = modulesWithStatus.filter(m => m.status !== 'fresh');

      setRetentionSchedules(schedules || []);
      setModulesNeedingReview(needingReview);
    } catch (error) {
      console.error('Error fetching retention schedules:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const createScheduleForModule = async (moduleId: string) => {
    if (!user?.id) return;

    try {
      const nextReviewAt = new Date();
      nextReviewAt.setDate(nextReviewAt.getDate() + 7); // First review in 7 days

      const { error } = await supabase
        .from('module_retention_schedule')
        .upsert({
          user_id: user.id,
          module_id: moduleId,
          next_review_at: nextReviewAt.toISOString(),
          retention_score: 100,
          review_count: 0,
          items_reviewed: 0,
          items_correct: 0,
        }, {
          onConflict: 'user_id,module_id'
        });

      if (error) throw error;
      await fetchSchedules();
    } catch (error) {
      console.error('Error creating retention schedule:', error);
    }
  };

  const updateRetentionAfterReview = async (moduleId: string, itemsReviewed: number, itemsCorrect: number) => {
    if (!user?.id) return;

    try {
      // Get current schedule
      const schedule = retentionSchedules.find(s => s.module_id === moduleId);
      if (!schedule) {
        await createScheduleForModule(moduleId);
        return;
      }

      // Calculate new retention score
      const newRetentionScore = itemsReviewed > 0 
        ? Math.round((itemsCorrect / itemsReviewed) * 100)
        : schedule.retention_score;

      // Calculate current interval from last review
      const lastReview = new Date(schedule.last_review_at);
      const now = new Date();
      const currentInterval = Math.max(7, Math.floor((now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Calculate next interval
      const nextInterval = calculateNextInterval(currentInterval, newRetentionScore);
      const nextReviewAt = new Date();
      nextReviewAt.setDate(nextReviewAt.getDate() + nextInterval);

      const { error } = await supabase
        .from('module_retention_schedule')
        .update({
          last_review_at: now.toISOString(),
          next_review_at: nextReviewAt.toISOString(),
          retention_score: newRetentionScore,
          review_count: schedule.review_count + 1,
          items_reviewed: schedule.items_reviewed + itemsReviewed,
          items_correct: schedule.items_correct + itemsCorrect,
        })
        .eq('id', schedule.id);

      if (error) throw error;
      await fetchSchedules();
    } catch (error) {
      console.error('Error updating retention schedule:', error);
    }
  };

  const getRetentionStatus = (moduleId: string): 'fresh' | 'due_soon' | 'overdue' | 'not_started' => {
    const moduleWithRetention = modulesNeedingReview.find(m => m.module_id === moduleId);
    if (!moduleWithRetention) {
      const hasSchedule = retentionSchedules.some(s => s.module_id === moduleId);
      return hasSchedule ? 'fresh' : 'not_started';
    }
    return moduleWithRetention.status;
  };

  return {
    retentionSchedules,
    modulesNeedingReview,
    loading,
    refreshSchedules: fetchSchedules,
    createScheduleForModule,
    updateRetentionAfterReview,
    getRetentionStatus,
  };
}
