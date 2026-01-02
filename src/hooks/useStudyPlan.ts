import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Json } from '@/integrations/supabase/types';

export interface TimeSlot {
  start: string;
  end: string;
}

export interface DayAvailability {
  day: number; // 0 = Domingo, 1 = Segunda, etc.
  slots: TimeSlot[];
}

export interface StudyPlan {
  id: string;
  user_id: string;
  availability: DayAvailability[];
  session_duration_minutes: number;
  preferred_time: string;
  last_calculated_at: string | null;
  estimated_completion_date: string | null;
  total_study_hours: number | null;
  weekly_hours: number | null;
  created_at: string;
  updated_at: string;
}

export interface ExerciseBreakdown {
  type: string;
  count: number;
  firstExposureHours: number;
  reviewHours: number;
  totalHours: number;
}

export interface StudyPlanCalculation {
  estimatedCompletionDate: string;
  weeksToComplete: number;
  sessionsPerWeek: number;
  hoursPerWeek: number;
  totalPendingHours: number;
  totalPendingLessons: number;
  aiInsights: string;
  // Novos campos para cálculo detalhado
  firstExposureHours: number;
  reviewHours: number;
  exerciseBreakdown: ExerciseBreakdown[];
  pendingExercisesCount: number;
  itemsInSpacedRepetition: number;
}

interface TimeEstimate {
  exercise_type: string;
  base_minutes: number;
  review_minutes: number;
  repetitions_to_master: number;
}

export const useStudyPlan = () => {
  const { user } = useAuth();
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [calculation, setCalculation] = useState<StudyPlanCalculation | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  const fetchStudyPlan = useCallback(async () => {
    if (!user) {
      setStudyPlan(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_study_plans')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching study plan:', error);
        return;
      }

      if (data) {
        const availability = Array.isArray(data.availability) 
          ? (data.availability as unknown as DayAvailability[])
          : [];
        
        setStudyPlan({
          ...data,
          availability,
          total_study_hours: data.total_study_hours ? Number(data.total_study_hours) : null,
          weekly_hours: data.weekly_hours ? Number(data.weekly_hours) : null,
        });
      }
    } catch (error) {
      console.error('Error fetching study plan:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStudyPlan();
  }, [fetchStudyPlan]);

  const saveStudyPlan = async (
    availability: DayAvailability[],
    sessionDurationMinutes: number,
    preferredTime: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const planData = {
        user_id: user.id,
        availability: availability as unknown as Json,
        session_duration_minutes: sessionDurationMinutes,
        preferred_time: preferredTime,
        updated_at: new Date().toISOString(),
      };

      if (studyPlan) {
        const { error } = await supabase
          .from('user_study_plans')
          .update(planData)
          .eq('id', studyPlan.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_study_plans')
          .insert(planData);

        if (error) throw error;
      }

      await fetchStudyPlan();
      return true;
    } catch (error) {
      console.error('Error saving study plan:', error);
      return false;
    }
  };

  const calculatePlan = async (): Promise<StudyPlanCalculation | null> => {
    if (!user || !studyPlan || studyPlan.availability.length === 0) {
      return null;
    }

    setCalculating(true);

    try {
      // Buscar dados em paralelo
      const [
        exercisesResult, 
        progressResult, 
        timeEstimatesResult,
        spacedRepResult,
        lessonsResult
      ] = await Promise.all([
        supabase.from('exercises').select('id, lesson_id, type').eq('is_published', true),
        supabase.from('user_progress').select('exercise_id, lesson_id').eq('user_id', user.id),
        supabase.from('exercise_time_estimates').select('*'),
        supabase.from('spaced_repetition_items').select('id, exercise_id, repetitions, ease_factor').eq('user_id', user.id),
        supabase.from('lessons').select('id, title').eq('is_published', true),
      ]);

      const exercises = exercisesResult.data || [];
      const completedExerciseIds = new Set((progressResult.data || []).filter(p => p.exercise_id).map(p => p.exercise_id));
      const completedLessonIds = new Set((progressResult.data || []).filter(p => p.lesson_id).map(p => p.lesson_id));
      const lessons = lessonsResult.data || [];
      const spacedItems = spacedRepResult.data || [];
      
      // Mapear itens de repetição espaçada por exercise_id
      const spacedItemsByExercise = new Map<string, { repetitions: number; easeFactor: number }>();
      spacedItems.forEach(item => {
        if (item.exercise_id) {
          spacedItemsByExercise.set(item.exercise_id, {
            repetitions: item.repetitions,
            easeFactor: Number(item.ease_factor) || 2.5,
          });
        }
      });

      // Criar mapa de estimativas de tempo por tipo
      const timeEstimates = (timeEstimatesResult.data || []) as TimeEstimate[];
      const timeEstimateMap = new Map<string, TimeEstimate>();
      timeEstimates.forEach(te => timeEstimateMap.set(te.exercise_type, te));

      // Valores padrão caso não exista configuração para o tipo
      const defaultEstimate: TimeEstimate = {
        exercise_type: 'default',
        base_minutes: 10,
        review_minutes: 5,
        repetitions_to_master: 3,
      };

      // Calcular tempo por exercício considerando:
      // 1. Tipo de exercício (base_minutes, review_minutes, repetitions_to_master)
      // 2. Se já está em spaced repetition (quantas repetições restam)
      // 3. Fator de facilidade do usuário

      let totalFirstExposureMinutes = 0;
      let totalReviewMinutes = 0;
      const exerciseBreakdownMap = new Map<string, ExerciseBreakdown>();

      for (const exercise of exercises) {
        const isCompleted = completedExerciseIds.has(exercise.id);
        const spacedData = spacedItemsByExercise.get(exercise.id);
        const estimate = timeEstimateMap.get(exercise.type) || defaultEstimate;
        
        let firstExposure = 0;
        let reviews = 0;

        if (!isCompleted) {
          // Primeira exposição
          firstExposure = estimate.base_minutes;
          
          // Revisões necessárias para domínio
          const repetitionsToMaster = estimate.repetitions_to_master;
          const completedReps = spacedData?.repetitions || 0;
          const remainingReps = Math.max(0, repetitionsToMaster - completedReps);
          
          // Ajustar tempo de revisão baseado no ease_factor do usuário
          // Ease factor menor = usuário tem mais dificuldade = mais tempo
          const easeFactor = spacedData?.easeFactor || 2.5;
          const difficultyMultiplier = easeFactor < 2.0 ? 1.5 : easeFactor < 2.5 ? 1.0 : 0.8;
          
          reviews = estimate.review_minutes * remainingReps * difficultyMultiplier;
        } else if (spacedData) {
          // Exercício já completado mas ainda em revisão
          const repetitionsToMaster = estimate.repetitions_to_master;
          const completedReps = spacedData.repetitions;
          const remainingReps = Math.max(0, repetitionsToMaster - completedReps);
          
          const easeFactor = spacedData.easeFactor;
          const difficultyMultiplier = easeFactor < 2.0 ? 1.5 : easeFactor < 2.5 ? 1.0 : 0.8;
          
          reviews = estimate.review_minutes * remainingReps * difficultyMultiplier;
        }

        totalFirstExposureMinutes += firstExposure;
        totalReviewMinutes += reviews;

        // Agregar por tipo
        const existing = exerciseBreakdownMap.get(exercise.type) || {
          type: exercise.type,
          count: 0,
          firstExposureHours: 0,
          reviewHours: 0,
          totalHours: 0,
        };
        existing.count++;
        existing.firstExposureHours += firstExposure / 60;
        existing.reviewHours += reviews / 60;
        existing.totalHours += (firstExposure + reviews) / 60;
        exerciseBreakdownMap.set(exercise.type, existing);
      }

      const firstExposureHours = totalFirstExposureMinutes / 60;
      const reviewHours = totalReviewMinutes / 60;
      const totalPendingHours = firstExposureHours + reviewHours;
      const exerciseBreakdown = Array.from(exerciseBreakdownMap.values()).sort((a, b) => b.totalHours - a.totalHours);

      // Calcular lições pendentes
      const pendingLessons = lessons.filter(l => !completedLessonIds.has(l.id));
      const pendingExercises = exercises.filter(e => !completedExerciseIds.has(e.id));

      // Calcular horas semanais disponíveis
      let weeklyMinutes = 0;
      for (const day of studyPlan.availability) {
        for (const slot of day.slots) {
          const [startH, startM] = slot.start.split(':').map(Number);
          const [endH, endM] = slot.end.split(':').map(Number);
          const slotMinutes = (endH * 60 + endM) - (startH * 60 + startM);
          weeklyMinutes += slotMinutes;
        }
      }
      
      // Fator de fadiga: não se estuda mais de 2.5h/dia com eficiência máxima
      const maxEffectiveMinutesPerDay = 150; // 2.5 horas
      const effectiveWeeklyMinutes = Math.min(weeklyMinutes, maxEffectiveMinutesPerDay * studyPlan.availability.length);
      
      const hoursPerWeek = effectiveWeeklyMinutes / 60;
      const sessionsPerWeek = studyPlan.availability.reduce(
        (sum, day) => sum + day.slots.length,
        0
      );

      // Calcular semanas necessárias
      const weeksToComplete = hoursPerWeek > 0 ? Math.ceil(totalPendingHours / hoursPerWeek) : 0;

      // Calcular data estimada de conclusão
      const completionDate = new Date();
      completionDate.setDate(completionDate.getDate() + weeksToComplete * 7);
      const estimatedCompletionDate = completionDate.toISOString().split('T')[0];

      // Chamar edge function para insights da IA com dados mais detalhados
      let aiInsights = `Com ${hoursPerWeek.toFixed(1)} horas de estudo efetivo por semana, você completará o conteúdo em aproximadamente ${weeksToComplete} semanas. O tempo inclui ${firstExposureHours.toFixed(0)}h de primeira exposição e ${reviewHours.toFixed(0)}h de revisões para memorização.`;
      
      try {
        const { data: aiData, error: aiError } = await supabase.functions.invoke('calculate-study-plan', {
          body: {
            availability: studyPlan.availability,
            totalPendingHours,
            firstExposureHours,
            reviewHours,
            pendingLessonsCount: pendingLessons.length,
            pendingExercisesCount: pendingExercises.length,
            hoursPerWeek,
            weeksToComplete,
            sessionDurationMinutes: studyPlan.session_duration_minutes,
            exercisesByType: Object.fromEntries(
              exerciseBreakdown.map(eb => [eb.type, { count: eb.count, hours: eb.totalHours }])
            ),
            itemsInSpacedRepetition: spacedItems.length,
            memorizationHours: exerciseBreakdown.find(e => e.type === 'memorization')?.totalHours || 0,
          },
        });

        if (!aiError && aiData?.insights) {
          aiInsights = aiData.insights;
        } else if (aiError) {
          console.warn('AI insights unavailable:', aiError);
        }
      } catch (e) {
        console.warn('Error getting AI insights, using fallback:', e);
      }

      const calc: StudyPlanCalculation = {
        estimatedCompletionDate,
        weeksToComplete,
        sessionsPerWeek,
        hoursPerWeek,
        totalPendingHours,
        totalPendingLessons: pendingLessons.length,
        aiInsights,
        firstExposureHours,
        reviewHours,
        exerciseBreakdown,
        pendingExercisesCount: pendingExercises.length,
        itemsInSpacedRepetition: spacedItems.length,
      };

      setCalculation(calc);

      // Atualizar no banco de dados
      await supabase
        .from('user_study_plans')
        .update({
          last_calculated_at: new Date().toISOString(),
          estimated_completion_date: estimatedCompletionDate,
          total_study_hours: totalPendingHours,
          weekly_hours: hoursPerWeek,
        })
        .eq('id', studyPlan.id);

      return calc;
    } catch (error) {
      console.error('Error calculating study plan:', error);
      return null;
    } finally {
      setCalculating(false);
    }
  };

  return {
    studyPlan,
    calculation,
    loading,
    calculating,
    saveStudyPlan,
    calculatePlan,
    refreshPlan: fetchStudyPlan,
  };
};
