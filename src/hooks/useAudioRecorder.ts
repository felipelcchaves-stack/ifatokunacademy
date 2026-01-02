import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseAudioRecorderProps {
  onRecordingComplete?: (audioUrl: string, duration: number) => void;
}

export function useAudioRecorder({ onRecordingComplete }: UseAudioRecorderProps = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        if (onRecordingComplete) {
          onRecordingComplete(url, recordingTime);
        }
      };
      
      mediaRecorder.start(100);
      setIsRecording(true);
      setIsPaused(false);
      startTimeRef.current = Date.now();
      
      timerRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Erro ao iniciar gravação",
        description: "Verifique as permissões do microfone.",
        variant: "destructive"
      });
    }
  }, [onRecordingComplete, recordingTime, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording, isPaused]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      const pausedTime = recordingTime;
      startTimeRef.current = Date.now() - (pausedTime * 1000);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);
    }
  }, [isRecording, isPaused, recordingTime]);

  const resetRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
  }, [audioUrl]);

  const uploadRecording = useCallback(async (
    userId: string,
    title: string,
    textContent: string,
    exerciseId?: string,
    lessonId?: string,
    moduleId?: string
  ): Promise<string | null> => {
    if (!audioBlob) {
      toast({
        title: "Nenhuma gravação",
        description: "Grave um áudio primeiro.",
        variant: "destructive"
      });
      return null;
    }

    setIsUploading(true);
    
    try {
      const fileName = `${userId}/${Date.now()}-${title.replace(/\s+/g, '-')}.webm`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('user-recordings')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('user-recordings')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('user_recordings')
        .insert({
          user_id: userId,
          exercise_id: exerciseId || null,
          lesson_id: lessonId || null,
          module_id: moduleId || null,
          title,
          text_content: textContent,
          audio_url: publicUrl,
          duration_seconds: recordingTime
        });

      if (dbError) throw dbError;

      toast({
        title: "Gravação salva!",
        description: "Seu áudio foi salvo com sucesso."
      });

      return publicUrl;
    } catch (error) {
      console.error('Error uploading recording:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a gravação.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [audioBlob, recordingTime, toast]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    isRecording,
    isPaused,
    recordingTime,
    formattedTime: formatTime(recordingTime),
    audioBlob,
    audioUrl,
    isUploading,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    uploadRecording
  };
}
