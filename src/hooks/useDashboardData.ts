import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useCohortFilter } from './useCohortFilter';

interface Module {
  id: string;
  title: string;
  description: string | null;
  type: 'proficiency' | 'thematic';
  level: string | null;
  theme: string | null;
  image_url: string | null;
  color: string | null;
  display_order: number;
  is_published: boolean;
  unlock_rule: string;
  unlock_date: string | null;
  totalLessons?: number;
  progress?: number;
}

interface ModuleCompletion {
  module_id: string;
  quiz_score: number;
}

interface DashboardData {
  modules: Module[];
  completions: ModuleCompletion[];
  userProgress: Record<string, number>;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export const useDashboardData = (user: User | null, organizationId?: string | null): DashboardData => {
  const [modules, setModules] = useState<Module[]>([]);
  const [completions, setCompletions] = useState<ModuleCompletion[]>([]);
  const [userProgress, setUserProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { hasCohorts, allowedModuleIds, cohortModuleOrder, loading: cohortLoading } = useCohortFilter(user, organizationId);

  const fetchData = useCallback(async () => {
    if (cohortLoading) return;
    try {
      setLoading(true);
      setError(null);

      // Query 1: Fetch published modules with lesson count, filtered by organization if specified
      let modulesQuery = supabase
        .from('modules')
        .select(`*, lessons:lessons(count)`)
        .eq('is_published', true);

      // Filter by organization if organizationId is provided
      if (organizationId) {
        modulesQuery = modulesQuery.eq('organization_id', organizationId);
      }

      const { data: modulesData, error: modulesError } = await modulesQuery.order('display_order', { ascending: true });

      if (modulesError) throw modulesError;

      console.log('[useDashboardData] Modules fetched:', modulesData?.length, modulesData);

      const modulesWithCount: Module[] = (modulesData || []).map((m: any) => ({
        ...m,
        type: m.type as 'proficiency' | 'thematic',
        totalLessons: m.lessons?.[0]?.count || 0,
        progress: 0,
      }));

      setModules(modulesWithCount);

      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch all data in parallel using Promise.all
      const [
        completionsResult,
        lessonsResult,
        exercisesResult,
        progressResult,
      ] = await Promise.all([
        // Query 2: User's module completions
        supabase
          .from('module_completions')
          .select('module_id, quiz_score')
          .eq('user_id', user.id),
        
        // Query 3: All published lessons
        supabase
          .from('lessons')
          .select('id, module_id')
          .eq('is_published', true),
        
        // Query 4: All published exercises
        supabase
          .from('exercises')
          .select('id, lesson_id')
          .eq('is_published', true),
        
        // Query 5: User's progress on all exercises
        supabase
          .from('user_progress')
          .select('exercise_id, module_id')
          .eq('user_id', user.id),
      ]);

      setCompletions(completionsResult.data || []);

      // Process data locally to calculate progress per module
      const lessons = lessonsResult.data || [];
      const exercises = exercisesResult.data || [];
      const completed = progressResult.data || [];

      // Create maps for efficient lookups
      const lessonsByModule = new Map<string, string[]>();
      lessons.forEach((lesson) => {
        const existing = lessonsByModule.get(lesson.module_id) || [];
        existing.push(lesson.id);
        lessonsByModule.set(lesson.module_id, existing);
      });

      const exercisesByLesson = new Map<string, string[]>();
      exercises.forEach((exercise) => {
        const existing = exercisesByLesson.get(exercise.lesson_id) || [];
        existing.push(exercise.id);
        exercisesByLesson.set(exercise.lesson_id, existing);
      });

      const completedExerciseIds = new Set(completed.map((c) => c.exercise_id));

      // Calculate progress per module
      const progressByModule: Record<string, number> = {};

      modulesWithCount.forEach((mod) => {
        const moduleLessonIds = lessonsByModule.get(mod.id) || [];
        
        // Get all exercises for this module's lessons
        let totalExercises = 0;
        let completedExercises = 0;

        moduleLessonIds.forEach((lessonId) => {
          const lessonExercises = exercisesByLesson.get(lessonId) || [];
          totalExercises += lessonExercises.length;
          
          lessonExercises.forEach((exerciseId) => {
            if (completedExerciseIds.has(exerciseId)) {
              completedExercises++;
            }
          });
        });

        progressByModule[mod.id] = totalExercises > 0
          ? Math.round((completedExercises / totalExercises) * 100)
          : 0;
      });

      setUserProgress(progressByModule);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [user, organizationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    modules,
    completions,
    userProgress,
    loading,
    error,
    refetch: fetchData,
  };
};
