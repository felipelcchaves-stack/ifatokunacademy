import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type StudyMode = 'complete' | 'express';

interface StudyModeConfig {
  mode: StudyMode;
  // Complete: all 7 exercises
  // Express: only essential 4 (reading, memorization, tap-complete OR drag-drop, flashcard)
}

// Exercise types to include per mode
const EXERCISE_TYPES_BY_MODE: Record<StudyMode, Set<string>> = {
  complete: new Set([
    'reading',
    'memorization', 
    'tap-complete',
    'drag-drop',
    'fill-blanks',
    'flashcard',
    'quiz',
    'video',
    'interpretation'
  ]),
  express: new Set([
    'reading',
    'memorization',
    'flashcard',
    // Either tap-complete OR drag-drop, not both (handled in filter logic)
  ])
};

// Max exercises per lesson in express mode
const EXPRESS_MAX_EXERCISES = 5;
// Max exercises per lesson in complete mode
const COMPLETE_MAX_EXERCISES = 9;

export function useStudyMode() {
  const { user } = useAuth();
  const [mode, setModeState] = useState<StudyMode>('complete');
  const [loading, setLoading] = useState(true);

  // Load user preference from localStorage (could be profiles table in future)
  useEffect(() => {
    const loadPreference = () => {
      try {
        const saved = localStorage.getItem(`study_mode_${user?.id}`);
        if (saved === 'express' || saved === 'complete') {
          setModeState(saved);
        }
      } catch (e) {
        console.error('Error loading study mode preference:', e);
      }
      setLoading(false);
    };

    if (user?.id) {
      loadPreference();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  // Save preference
  const setMode = useCallback((newMode: StudyMode) => {
    setModeState(newMode);
    if (user?.id) {
      localStorage.setItem(`study_mode_${user.id}`, newMode);
    }
  }, [user?.id]);

  // Filter exercises based on current mode
  const filterExercises = useCallback(<T extends { type: string; display_order: number }>(
    exercises: T[]
  ): T[] => {
    if (mode === 'complete') {
      // In complete mode, limit to COMPLETE_MAX_EXERCISES
      // Prioritize by display_order (earlier = more important)
      const sorted = [...exercises].sort((a, b) => a.display_order - b.display_order);
      return sorted.slice(0, COMPLETE_MAX_EXERCISES);
    }

    // Express mode: filter and limit
    const allowedTypes = EXERCISE_TYPES_BY_MODE.express;
    
    // First pass: group by type
    const byType: Record<string, T[]> = {};
    exercises.forEach(ex => {
      if (!byType[ex.type]) byType[ex.type] = [];
      byType[ex.type].push(ex);
    });

    const result: T[] = [];

    // Add 1 reading (first by display_order)
    if (byType['reading']?.length) {
      const sorted = [...byType['reading']].sort((a, b) => a.display_order - b.display_order);
      result.push(sorted[0]);
    }

    // Add 1 memorization (first by display_order)
    if (byType['memorization']?.length) {
      const sorted = [...byType['memorization']].sort((a, b) => a.display_order - b.display_order);
      result.push(sorted[0]);
    }

    // Add tap-complete OR drag-drop (prefer tap-complete)
    if (byType['tap-complete']?.length) {
      const sorted = [...byType['tap-complete']].sort((a, b) => a.display_order - b.display_order);
      result.push(sorted[0]);
    } else if (byType['drag-drop']?.length) {
      const sorted = [...byType['drag-drop']].sort((a, b) => a.display_order - b.display_order);
      result.push(sorted[0]);
    }

    // Add 1 flashcard
    if (byType['flashcard']?.length) {
      const sorted = [...byType['flashcard']].sort((a, b) => a.display_order - b.display_order);
      result.push(sorted[0]);
    }

    // Sort final result by display_order
    result.sort((a, b) => a.display_order - b.display_order);

    return result.slice(0, EXPRESS_MAX_EXERCISES);
  }, [mode]);

  // Get mode display info
  const getModeInfo = useCallback((modeType: StudyMode) => {
    if (modeType === 'express') {
      return {
        label: 'Express',
        description: '4-5 exercícios essenciais',
        icon: '⚡',
        estimatedMinutes: 5,
      };
    }
    return {
      label: 'Completo',
      description: '7-9 exercícios',
      icon: '📚',
      estimatedMinutes: 15,
    };
  }, []);

  return {
    mode,
    setMode,
    loading,
    filterExercises,
    getModeInfo,
    isExpress: mode === 'express',
    isComplete: mode === 'complete',
  };
}

export default useStudyMode;
