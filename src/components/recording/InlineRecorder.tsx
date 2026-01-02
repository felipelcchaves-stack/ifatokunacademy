import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  
  const [isPreparing, setIsPreparing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioFormatRef = useRef<AudioFormat | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup audio context and animation frame
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // VU Meter - analyze audio level
  const startAudioAnalysis = useCallback((stream: MediaStream) => {
    try {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      const updateLevel = () => {
        if (!analyserRef.current || !isRecording) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const normalized = Math.min(100, (average / 128) * 100);
        setAudioLevel(normalized);
        
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
    } catch (error) {
      console.warn('Audio analysis not supported:', error);
    }
  }, [isRecording]);

  const stopAudioAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  const startRecording = async () => {
    setIsPreparing(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;
      
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
        stopAudioAnalysis();
      };

      mediaRecorder.start();
      setIsPreparing(false);
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start audio level analysis
      startAudioAnalysis(stream);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsPreparing(false);
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
      stopAudioAnalysis();
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

  // Determine border color based on state
  const getBorderClass = () => {
    if (isRecording && !isPaused) return 'border-red-500/50 bg-red-500/5';
    if (isPaused) return 'border-yellow-500/50 bg-yellow-500/5';
    if (audioUrl) return 'border-green-500/50 bg-green-500/5';
    return 'border-border bg-accent/30';
  };

  return (
    <div className={cn(
      "rounded-xl p-4 border-2 transition-all duration-300",
      getBorderClass(),
      className
    )}>
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Recording indicator with VU meter */}
          <div className="relative flex items-center justify-center">
            {isRecording && !isPaused ? (
              <div className="relative">
                {/* Pulsing red dot */}
                <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
                {/* VU meter bars */}
                <div className="absolute -right-6 top-1/2 -translate-y-1/2 flex items-end gap-0.5 h-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-1 bg-red-500 rounded-full transition-all duration-75"
                      style={{
                        height: `${Math.max(4, audioLevel * (0.5 + i * 0.15))}%`,
                        opacity: audioLevel > i * 20 ? 1 : 0.3
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : isPaused ? (
              <div className="w-4 h-4 rounded-full bg-yellow-500" />
            ) : isPreparing ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            ) : (
              <Mic className={cn(
                "w-4 h-4",
                audioUrl ? "text-green-500" : "text-muted-foreground"
              )} />
            )}
          </div>
          
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {isPreparing ? 'Conectando microfone...' :
               isRecording ? (isPaused ? 'Pausado' : 'Gravando...') : 
               audioUrl ? 'Gravação pronta' : 'Grave sua leitura'}
            </span>
            {(isRecording || audioUrl) && (
              <span className={cn(
                "text-lg font-mono font-bold",
                isRecording && !isPaused ? "text-red-500" : "text-muted-foreground"
              )}>
                {formatTime(recordingTime)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isRecording && !audioUrl && !isPreparing && (
            <Button
              size="default"
              variant="default"
              onClick={startRecording}
              className="gap-2 bg-red-500 hover:bg-red-600 text-white"
            >
              <Mic className="w-4 h-4" />
              Gravar
            </Button>
          )}

          {isPreparing && (
            <Button size="default" variant="outline" disabled className="gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Preparando...
            </Button>
          )}

          {isRecording && (
            <>
              {isPaused ? (
                <Button size="sm" variant="outline" onClick={resumeRecording} className="gap-1.5">
                  <Play className="w-3.5 h-3.5" />
                  Continuar
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={pauseRecording} className="gap-1.5">
                  <Pause className="w-3.5 h-3.5" />
                  Pausar
                </Button>
              )}
              <Button size="sm" variant="destructive" onClick={stopRecording} className="gap-1.5">
                <Square className="w-3.5 h-3.5" />
                Parar
              </Button>
            </>
          )}

          {audioUrl && !isRecording && (
            <>
              <Button size="sm" variant="outline" onClick={togglePlayback} className="gap-1.5">
                {isPlaying ? (
                  <><Pause className="w-3.5 h-3.5" /> Pausar</>
                ) : (
                  <><Play className="w-3.5 h-3.5" /> Ouvir</>
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
                className="gap-1.5 bg-green-600 hover:bg-green-700"
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
