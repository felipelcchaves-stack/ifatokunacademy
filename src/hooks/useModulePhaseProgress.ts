import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PhaseProgress {
  moduleId: string;
  phase1CompletedAt: string | null;
  phase2CompletedAt: string | null;
}

interface ModulePhaseStats {
  phase1Total: number;
  phase1Completed: number;
  phase2Total: number;
  phase2Completed: number;
  phase1Progress: number;
  phase2Progress: number;
  phase1Complete: boolean;
  phase2Complete: boolean;
}

// Helper to determine phase from exercise title
const getExercisePhase = (title: string): 1 | 2 => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('fase 2') || 
      lowerTitle.includes('proficiência') || 
      lowerTitle.includes('completo')) {
    return 2;
  }
  return 1;
};

/**
 * Hook para gerenciar o progresso por fase dos módulos.
 * 
 * - Fase 1: Exercícios básicos (contexto, resumo)
 * - Fase 2: Exercícios de proficiência (texto completo)
 * 
 * Completar Fase 1 desbloqueia o próximo módulo.
 * Completar Fase 2 + Quiz 90% = proficiência/certificação.
 */
export const useModulePhaseProgress = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [phaseProgress, setPhaseProgress] = useState<PhaseProgress[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * Busca o progresso de todas as fases do usuário
   */
  const fetchPhaseProgress = useCallback(async (): Promise<PhaseProgress[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('module_phase_progress')
        .select('module_id, phase1_completed_at, phase2_completed_at')
        .eq('user_id', user.id);

      if (error) throw error;

      const progress = (data || []).map(p => ({
        moduleId: p.module_id,
        phase1CompletedAt: p.phase1_completed_at,
        phase2CompletedAt: p.phase2_completed_at,
      }));

      setPhaseProgress(progress);
      return progress;
    } catch (error) {
      console.error('Error fetching phase progress:', error);
      return [];
    }
  }, [user]);

  /**
   * Calcula as estatísticas de fase para um módulo específico
   */
  const calculateModulePhaseStats = useCallback(async (
    moduleId: string
  ): Promise<ModulePhaseStats | null> => {
    if (!user) return null;

    try {
      // Fetch all exercises for the module
      const { data: exercises, error: exError } = await supabase
        .from('exercises')
        .select(`
          id,
          title,
          lesson_id,
          lessons!inner(module_id)
        `)
        .eq('lessons.module_id', moduleId)
        .eq('is_published', true);

      if (exError) throw exError;

      // Fetch user's completed exercises
      const { data: completedData, error: progressError } = await supabase
        .from('user_progress')
        .select('exercise_id')
        .eq('user_id', user.id)
        .eq('module_id', moduleId);

      if (progressError) throw progressError;

      const completedIds = new Set((completedData || []).map(p => p.exercise_id));

      // Separate by phase
      const phase1Exercises = (exercises || []).filter(e => getExercisePhase(e.title) === 1);
      const phase2Exercises = (exercises || []).filter(e => getExercisePhase(e.title) === 2);

      const phase1Completed = phase1Exercises.filter(e => completedIds.has(e.id)).length;
      const phase2Completed = phase2Exercises.filter(e => completedIds.has(e.id)).length;

      const phase1Total = phase1Exercises.length;
      const phase2Total = phase2Exercises.length;

      return {
        phase1Total,
        phase1Completed,
        phase2Total,
        phase2Completed,
        phase1Progress: phase1Total > 0 ? Math.round((phase1Completed / phase1Total) * 100) : 0,
        phase2Progress: phase2Total > 0 ? Math.round((phase2Completed / phase2Total) * 100) : 0,
        phase1Complete: phase1Total > 0 && phase1Completed >= phase1Total,
        phase2Complete: phase2Total > 0 && phase2Completed >= phase2Total,
      };
    } catch (error) {
      console.error('Error calculating phase stats:', error);
      return null;
    }
  }, [user]);

  /**
   * Marca uma fase como concluída
   */
  const markPhaseComplete = useCallback(async (
    moduleId: string,
    phase: 1 | 2
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const now = new Date().toISOString();
      const updateData = phase === 1 
        ? { phase1_completed_at: now }
        : { phase2_completed_at: now };

      const { error } = await supabase
        .from('module_phase_progress')
        .upsert({
          user_id: user.id,
          module_id: moduleId,
          ...updateData,
        }, { 
          onConflict: 'user_id,module_id',
        });

      if (error) throw error;

      // Refresh local state
      await fetchPhaseProgress();
      return true;
    } catch (error) {
      console.error('Error marking phase complete:', error);
      return false;
    }
  }, [user, fetchPhaseProgress]);

  /**
   * Verifica e registra conclusão de fase automaticamente
   */
  const checkAndMarkPhaseComplete = useCallback(async (
    moduleId: string
  ): Promise<{ phase1JustCompleted: boolean; phase2JustCompleted: boolean }> => {
    if (!user) return { phase1JustCompleted: false, phase2JustCompleted: false };

    const result = { phase1JustCompleted: false, phase2JustCompleted: false };

    try {
      // Get current stats
      const stats = await calculateModulePhaseStats(moduleId);
      if (!stats) return result;

      // Get current phase progress
      const { data: currentProgress } = await supabase
        .from('module_phase_progress')
        .select('phase1_completed_at, phase2_completed_at')
        .eq('user_id', user.id)
        .eq('module_id', moduleId)
        .maybeSingle();

      // Check Phase 1
      if (stats.phase1Complete && !currentProgress?.phase1_completed_at) {
        await markPhaseComplete(moduleId, 1);
        result.phase1JustCompleted = true;
      }

      // Check Phase 2
      if (stats.phase2Complete && !currentProgress?.phase2_completed_at) {
        await markPhaseComplete(moduleId, 2);
        result.phase2JustCompleted = true;
      }

      return result;
    } catch (error) {
      console.error('Error checking phase completion:', error);
      return result;
    }
  }, [user, calculateModulePhaseStats, markPhaseComplete]);

  /**
   * Retorna lista de módulos com Fase 1 completa mas Fase 2 pendente
   */
  const getModulesWithPendingPhase2 = useCallback(async (): Promise<string[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('module_phase_progress')
        .select('module_id')
        .eq('user_id', user.id)
        .not('phase1_completed_at', 'is', null)
        .is('phase2_completed_at', null);

      if (error) throw error;
      return (data || []).map(p => p.module_id);
    } catch (error) {
      console.error('Error getting pending phase 2 modules:', error);
      return [];
    }
  }, [user]);

  /**
   * Verifica se a Fase 1 de um módulo está completa
   */
  const isPhase1Complete = useCallback((moduleId: string): boolean => {
    const progress = phaseProgress.find(p => p.moduleId === moduleId);
    return progress?.phase1CompletedAt !== null && progress?.phase1CompletedAt !== undefined;
  }, [phaseProgress]);

  /**
   * Verifica se a Fase 2 de um módulo está completa
   */
  const isPhase2Complete = useCallback((moduleId: string): boolean => {
    const progress = phaseProgress.find(p => p.moduleId === moduleId);
    return progress?.phase2CompletedAt !== null && progress?.phase2CompletedAt !== undefined;
  }, [phaseProgress]);

  return {
    phaseProgress,
    loading,
    fetchPhaseProgress,
    calculateModulePhaseStats,
    markPhaseComplete,
    checkAndMarkPhaseComplete,
    getModulesWithPendingPhase2,
    isPhase1Complete,
    isPhase2Complete,
  };
};
