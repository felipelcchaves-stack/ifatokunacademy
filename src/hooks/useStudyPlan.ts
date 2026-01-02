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

export interface StudyPlanCalculation {
  estimatedCompletionDate: string;
  weeksToComplete: number;
  sessionsPerWeek: number;
  hoursPerWeek: number;
  totalPendingHours: number;
  totalPendingLessons: number;
  aiInsights: string;
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
        // Parse availability from Json to DayAvailability[]
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
      // Buscar dados de módulos e progresso do usuário
      const [modulesResult, lessonsResult, progressResult] = await Promise.all([
        supabase.from('modules').select('id, title').eq('is_published', true),
        supabase.from('lessons').select('id, module_id, duration_minutes').eq('is_published', true),
        supabase.from('user_progress').select('lesson_id').eq('user_id', user.id),
      ]);

      const modules = modulesResult.data || [];
      const lessons = lessonsResult.data || [];
      const completedLessonIds = new Set((progressResult.data || []).map(p => p.lesson_id));

      // Calcular lições pendentes
      const pendingLessons = lessons.filter(l => !completedLessonIds.has(l.id));
      const totalPendingMinutes = pendingLessons.reduce(
        (sum, l) => sum + (l.duration_minutes || 30),
        0
      );
      const totalPendingHours = totalPendingMinutes / 60;

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
      const hoursPerWeek = weeklyMinutes / 60;
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

      // Chamar edge function para insights da IA
      let aiInsights = '';
      try {
        const { data: aiData, error: aiError } = await supabase.functions.invoke('calculate-study-plan', {
          body: {
            availability: studyPlan.availability,
            totalPendingHours,
            pendingLessonsCount: pendingLessons.length,
            hoursPerWeek,
            weeksToComplete,
            sessionDurationMinutes: studyPlan.session_duration_minutes,
          },
        });

        if (!aiError && aiData?.insights) {
          aiInsights = aiData.insights;
        }
      } catch (e) {
        console.error('Error getting AI insights:', e);
        aiInsights = `Com ${hoursPerWeek.toFixed(1)} horas de estudo por semana, você completará o curso em aproximadamente ${weeksToComplete} semanas. Continue firme nos estudos!`;
      }

      const calc: StudyPlanCalculation = {
        estimatedCompletionDate,
        weeksToComplete,
        sessionsPerWeek,
        hoursPerWeek,
        totalPendingHours,
        totalPendingLessons: pendingLessons.length,
        aiInsights,
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
