import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ModuleProgress {
  moduleId: string;
  totalExercises: number;
  completedExercises: number;
  progress: number;
  isCompleted: boolean;
  quizScore: number | null;
}

interface LessonProgress {
  lessonId: string;
  totalExercises: number;
  completedExercises: number;
  progress: number;
  isCompleted: boolean;
  phase1Complete: boolean;
  phase1Total: number;
  phase1Completed: number;
}

// Helper to determine phase from exercise title with display_order fallback
const getExercisePhase = (title: string, displayOrder?: number): 1 | 2 => {
  const lowerTitle = title.toLowerCase();
  
  // Phase 2 explicit markers
  if (lowerTitle.includes('fase 2') || lowerTitle.includes('proficiência')) {
    return 2;
  }
  
  // Phase 1 explicit markers
  if (lowerTitle.includes('fase 1') || lowerTitle.includes('contexto')) {
    return 1;
  }
  
  // Fallback by display_order if available (positions 6-10 are Phase 2)
  if (displayOrder !== undefined && displayOrder >= 6 && displayOrder <= 10) {
    return 2;
  }
  
  return 1;
};

interface ModuleCompletion {
  moduleId: string;
  userId: string;
  completedAt: string;
  quizScore: number;
  isCertified: boolean;
}

export const useModuleProgress = () => {
  const { user } = useAuth();

  const getModuleProgress = async (moduleId: string): Promise<ModuleProgress | null> => {
    if (!user) return null;

    try {
      // Get lessons for this module first
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .eq('module_id', moduleId)
        .eq('is_published', true);

      const lessonIds = lessons?.map(l => l.id) || [];

      // Get total exercises for this module
      const { data: exercises } = await supabase
        .from('exercises')
        .select('id')
        .eq('is_published', true)
        .in('lesson_id', lessonIds.length > 0 ? lessonIds : ['none']);

      // Get completed exercises for this user
      const { data: completed } = await supabase
        .from('user_progress')
        .select('exercise_id')
        .eq('user_id', user.id)
        .eq('module_id', moduleId);

      // Get module completion if exists
      const { data: completion } = await supabase
        .from('module_completions')
        .select('*')
        .eq('user_id', user.id)
        .eq('module_id', moduleId)
        .maybeSingle();

      const totalExercises = exercises?.length || 0;
      const completedExercises = completed?.length || 0;
      const progress = totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;

      return {
        moduleId,
        totalExercises,
        completedExercises,
        progress,
        isCompleted: !!completion,
        quizScore: completion?.quiz_score || null,
      };
    } catch (error) {
      console.error('Error getting module progress:', error);
      return null;
    }
  };

  const getLessonProgress = async (lessonId: string): Promise<LessonProgress | null> => {
    if (!user) return null;

    try {
      // Get total exercises for this lesson with titles for phase detection
      const { data: exercises } = await supabase
        .from('exercises')
        .select('id, title')
        .eq('lesson_id', lessonId)
        .eq('is_published', true);

      // Get completed exercises for this user in this lesson
      const { data: completed } = await supabase
        .from('user_progress')
        .select('exercise_id')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId);

      const completedIds = new Set((completed || []).map(p => p.exercise_id));
      
      // Separate exercises by phase
      const phase1Exercises = (exercises || []).filter(e => getExercisePhase(e.title) === 1);
      const phase1CompletedCount = phase1Exercises.filter(e => completedIds.has(e.id)).length;
      const phase1Complete = phase1Exercises.length > 0 && phase1CompletedCount === phase1Exercises.length;

      const totalExercises = exercises?.length || 0;
      const completedExercises = completed?.length || 0;
      const progress = totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;

      return {
        lessonId,
        totalExercises,
        completedExercises,
        progress,
        isCompleted: progress === 100,
        phase1Complete,
        phase1Total: phase1Exercises.length,
        phase1Completed: phase1CompletedCount,
      };
    } catch (error) {
      console.error('Error getting lesson progress:', error);
      return null;
    }
  };

  const markExerciseComplete = async (
    exerciseId: string, 
    lessonId: string, 
    moduleId: string,
    score?: number
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          exercise_id: exerciseId,
          lesson_id: lessonId,
          module_id: moduleId,
          score: score || null,
          completed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,exercise_id',
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking exercise complete:', error);
      return false;
    }
  };

  const completeModule = async (
    moduleId: string,
    quizScore: number
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('module_completions')
        .upsert({
          user_id: user.id,
          module_id: moduleId,
          quiz_score: quizScore,
          is_certified: quizScore >= 90,
          completed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,module_id',
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error completing module:', error);
      return false;
    }
  };

  const getModuleCompletions = async (): Promise<ModuleCompletion[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('module_completions')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      return (data || []).map(c => ({
        moduleId: c.module_id,
        userId: c.user_id,
        completedAt: c.completed_at,
        quizScore: c.quiz_score,
        isCertified: c.is_certified,
      }));
    } catch (error) {
      console.error('Error getting module completions:', error);
      return [];
    }
  };

  const isModuleUnlocked = (
    moduleLevel: string | null,
    completedModules: ModuleCompletion[],
    allModules: Array<{ id: string; level: string | null; type: string }>
  ): boolean => {
    // Thematic modules are always unlocked
    if (!moduleLevel) return true;

    const levelOrder = ['akapo', 'awo', 'oluwo'];
    const currentLevelIndex = levelOrder.indexOf(moduleLevel.toLowerCase());

    // First level is always unlocked
    if (currentLevelIndex === 0) return true;

    // Check if previous level is completed
    const previousLevel = levelOrder[currentLevelIndex - 1];
    const previousModules = allModules.filter(
      m => m.type === 'proficiency' && m.level?.toLowerCase() === previousLevel
    );

    // All previous level modules must be completed with 90%+ quiz score
    return previousModules.every(m => 
      completedModules.some(c => c.moduleId === m.id && c.quizScore >= 90)
    );
  };

  return {
    getModuleProgress,
    getLessonProgress,
    markExerciseComplete,
    completeModule,
    getModuleCompletions,
    isModuleUnlocked,
  };
};
