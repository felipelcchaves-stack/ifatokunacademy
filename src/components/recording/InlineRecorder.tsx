import React, { useState, useRef } from 'react';
import { Mic, Square, Play, Pause, Save, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { getBestRecordingFormat, type AudioFormat } from '@/lib/audioFormatUtils';

interface InlineRecorderProps {
  text: string;
  title?: string;
  exerciseId?: string;
  lessonId?: string;
  moduleId?: string;
  onSaved?: () => void;
  className?: string;
}

const InlineRecorder: React.FC<InlineRecorderProps> = ({
  text,
  title = 'Gravação de Leitura',
  exerciseId,
  lessonId,
  moduleId,
  onSaved,
  className
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioFormatRef = useRef<AudioFormat | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Detect best format for this browser (Safari = mp4, Chrome = webm)
      const format = getBestRecordingFormat();
      audioFormatRef.current = format;
      
      const options = format.mimeType ? { mimeType: format.mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = format.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Erro ao iniciar gravação",
        description: "Verifique as permissões do microfone.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const resetRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSave = async () => {
    if (!user || !audioBlob) return;

    setIsUploading(true);
    try {
      // Use the format that was detected when recording started
      const format = audioFormatRef.current || { extension: 'webm', contentType: 'audio/webm' };
      const fileName = `${user.id}/${Date.now()}_reading.${format.extension}`;
      
      const { error: uploadError } = await supabase.storage
        .from('user-recordings')
        .upload(fileName, audioBlob, {
          contentType: format.contentType,
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-recordings')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('user_recordings')
        .insert({
          user_id: user.id,
          title,
          text_content: text,
          audio_url: publicUrl,
          duration_seconds: recordingTime,
          exercise_id: exerciseId || null,
          lesson_id: lessonId || null,
          module_id: moduleId || null
        });

      if (dbError) throw dbError;

      toast({
        title: "Gravação salva!",
        description: "Sua leitura foi salva com sucesso."
      });

      resetRecording();
      onSaved?.();
    } catch (error) {
      console.error('Error saving recording:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a gravação.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={cn("bg-accent/30 rounded-xl p-4 border border-border", className)}>
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Mic className={cn(
            "w-4 h-4",
            isRecording && !isPaused ? "text-red-500 animate-pulse" : "text-muted-foreground"
          )} />
          <span className="text-sm font-medium">
            {isRecording ? 'Gravando...' : audioUrl ? 'Gravação pronta' : 'Grave sua leitura'}
          </span>
          {(isRecording || audioUrl) && (
            <span className="text-sm text-muted-foreground font-mono">
              {formatTime(recordingTime)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isRecording && !audioUrl && (
            <Button
              size="sm"
              variant="default"
              onClick={startRecording}
              className="gap-1.5"
            >
              <Mic className="w-3.5 h-3.5" />
              Gravar
            </Button>
          )}

          {isRecording && (
            <>
              {isPaused ? (
                <Button size="sm" variant="outline" onClick={resumeRecording}>
                  Continuar
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={pauseRecording}>
                  Pausar
                </Button>
              )}
              <Button size="sm" variant="destructive" onClick={stopRecording}>
                <Square className="w-3.5 h-3.5" />
              </Button>
            </>
          )}

          {audioUrl && !isRecording && (
            <>
              <Button size="sm" variant="outline" onClick={togglePlayback}>
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
              </Button>
              <Button size="sm" variant="ghost" onClick={resetRecording}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={handleSave}
                disabled={isUploading}
                className="gap-1.5"
              >
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Salvar
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InlineRecorder;
