import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface UserRecording {
  id: string;
  title: string;
  text_content: string;
  audio_url: string;
  duration_seconds: number | null;
  exercise_id: string | null;
  lesson_id: string | null;
  module_id: string | null;
  created_at: string;
  module_title?: string | null;
  lesson_title?: string | null;
}

interface UseUserRecordingsProps {
  exerciseId?: string;
  lessonId?: string;
  moduleId?: string;
  phase?: 'phase1' | 'phase2';
}

export function useUserRecordings(props: UseUserRecordingsProps = {}) {
  const { exerciseId, lessonId, moduleId, phase } = props;
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [recordings, setRecordings] = useState<UserRecording[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecordings = useCallback(async () => {
    if (!user) {
      setRecordings([]);
      setIsLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('user_recordings')
        .select(`
          *,
          modules:module_id(title),
          lessons:lesson_id(title)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Apply filters if provided
      if (exerciseId) {
        query = query.eq('exercise_id', exerciseId);
      }
      if (lessonId) {
        query = query.eq('lesson_id', lessonId);
      }
      if (moduleId) {
        query = query.eq('module_id', moduleId);
      }
      if (phase) {
        query = query.eq('phase', phase);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Map the joined data to flat structure
      const mappedData = (data || []).map((rec: any) => ({
        ...rec,
        module_title: rec.modules?.title || null,
        lesson_title: rec.lessons?.title || null,
      }));
      
      setRecordings(mappedData);
    } catch (error) {
      console.error('Error fetching recordings:', error);
      toast({
        title: "Erro ao carregar gravações",
        description: "Não foi possível carregar suas gravações.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, exerciseId, lessonId, moduleId, phase, toast]);

  const deleteRecording = useCallback(async (recordingId: string, audioUrl: string) => {
    if (!user) return false;

    try {
      // Extract file path from URL
      const urlParts = audioUrl.split('/user-recordings/');
      const filePath = urlParts[1];
      
      // Delete from storage
      if (filePath) {
        await supabase.storage
          .from('user-recordings')
          .remove([filePath]);
      }

      // Delete from database
      const { error } = await supabase
        .from('user_recordings')
        .delete()
        .eq('id', recordingId)
        .eq('user_id', user.id);

      if (error) throw error;

      setRecordings(prev => prev.filter(r => r.id !== recordingId));
      
      toast({
        title: "Gravação excluída",
        description: "A gravação foi removida com sucesso."
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting recording:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a gravação.",
        variant: "destructive"
      });
      return false;
    }
  }, [user, toast]);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  return {
    recordings,
    isLoading,
    refetch: fetchRecordings,
    deleteRecording
  };
}
