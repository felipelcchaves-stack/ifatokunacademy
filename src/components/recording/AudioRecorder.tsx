import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Square, Pause, Play, Trash2, Save, Volume2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getBestRecordingFormat, type AudioFormat } from '@/lib/audioFormatUtils';

interface AudioRecorderProps {
  title: string;
  textContent: string;
  exerciseId?: string;
  lessonId?: string;
  moduleId?: string;
  onSaved?: (audioUrl: string) => void;
  className?: string;
}

export function AudioRecorder({
  title,
  textContent,
  exerciseId,
  lessonId,
  moduleId,
  onSaved,
  className
}: AudioRecorderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isPreparing, setIsPreparing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioFormatRef = useRef<AudioFormat | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // VU Meter
  const startAudioAnalysis = useCallback((stream: MediaStream) => {
    try {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      const updateLevel = () => {
        if (!analyserRef.current) return;
        
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
  }, []);

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
      
      const format = getBestRecordingFormat();
      audioFormatRef.current = format;
      
      const options = format.mimeType ? { mimeType: format.mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const mimeType = format.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
        stopAudioAnalysis();
      };
      
      mediaRecorder.start(100);
      setIsPreparing(false);
      setIsRecording(true);
      setIsPaused(false);
      startTimeRef.current = Date.now();
      
      startAudioAnalysis(stream);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);
      
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
        timerRef.current = null;
      }
      stopAudioAnalysis();
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      const pausedTime = recordingTime;
      startTimeRef.current = Date.now() - (pausedTime * 1000);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);
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

  const handlePlayPause = () => {
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
      const format = audioFormatRef.current || { extension: 'webm', contentType: 'audio/webm' };
      const fileName = `${user.id}/${Date.now()}-${title.replace(/\s+/g, '-')}.${format.extension}`;
      
      const { error: uploadError } = await supabase.storage
        .from('user-recordings')
        .upload(fileName, audioBlob, {
          contentType: format.contentType,
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('user-recordings')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;

      const { error: dbError } = await supabase
        .from('user_recordings')
        .insert({
          user_id: user.id,
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

      if (onSaved) {
        onSaved(publicUrl);
      }
      resetRecording();
    } catch (error) {
      console.error('Error uploading recording:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a gravação.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Get card border color based on state
  const getCardClass = () => {
    if (isRecording && !isPaused) return 'border-red-500/50 bg-red-500/5';
    if (isPaused) return 'border-yellow-500/50 bg-yellow-500/5';
    if (audioUrl) return 'border-green-500/50 bg-green-500/5';
    return 'border-primary/20';
  };

  return (
    <Card className={cn("transition-all duration-300", getCardClass(), className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {isRecording && !isPaused ? (
            <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
          ) : isPaused ? (
            <div className="w-4 h-4 rounded-full bg-yellow-500" />
          ) : isPreparing ? (
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
          ) : (
            <Mic className={cn("h-4 w-4", audioUrl ? "text-green-500" : "text-primary")} />
          )}
          {isPreparing ? 'Conectando Microfone...' :
           isRecording ? (isPaused ? 'Gravação Pausada' : 'Gravando...') :
           audioUrl ? 'Gravação Pronta' : 'Gravar com Sua Voz'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recording indicator with VU meter */}
        {isRecording && (
          <div className="flex items-center justify-center gap-4 py-4">
            <div className={cn(
              "w-4 h-4 rounded-full",
              isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
            )} />
            <span className="text-3xl font-mono font-bold">{formatTime(recordingTime)}</span>
            {isPaused && <span className="text-sm text-muted-foreground">(pausado)</span>}
            
            {/* VU Meter */}
            {!isPaused && (
              <div className="flex items-end gap-1 h-8">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-2 rounded-full transition-all duration-75",
                      audioLevel > i * 15 ? "bg-red-500" : "bg-muted"
                    )}
                    style={{
                      height: `${Math.max(8, audioLevel * (0.4 + i * 0.12))}%`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Preparing state */}
        {isPreparing && (
          <div className="flex items-center justify-center gap-3 py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-muted-foreground">Conectando ao microfone...</span>
          </div>
        )}

        {/* Audio preview */}
        {audioUrl && !isRecording && (
          <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg border border-green-500/30">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePlayPause}
              className="h-12 w-12 rounded-full bg-green-500 text-white hover:bg-green-600"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
            </Button>
            <div className="flex-1">
              <div className="text-sm font-medium text-green-700 dark:text-green-300">Gravação concluída</div>
              <div className="text-lg font-mono font-bold">{formatTime(recordingTime)}</div>
            </div>
            <Volume2 className="h-5 w-5 text-green-500" />
            <audio 
              ref={audioRef} 
              src={audioUrl} 
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          {!isRecording && !audioUrl && !isPreparing && (
            <Button 
              onClick={startRecording} 
              className="gap-2 h-12 px-6 text-base bg-red-500 hover:bg-red-600 text-white"
            >
              <Mic className="h-5 w-5" />
              Iniciar Gravação
            </Button>
          )}

          {isRecording && (
            <>
              {isPaused ? (
                <Button onClick={resumeRecording} variant="outline" className="gap-2">
                  <Play className="h-4 w-4" />
                  Continuar
                </Button>
              ) : (
                <Button onClick={pauseRecording} variant="outline" className="gap-2">
                  <Pause className="h-4 w-4" />
                  Pausar
                </Button>
              )}
              <Button onClick={stopRecording} variant="destructive" className="gap-2">
                <Square className="h-4 w-4" />
                Parar
              </Button>
            </>
          )}

          {audioUrl && !isRecording && (
            <>
              <Button onClick={resetRecording} variant="outline" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Descartar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isUploading} 
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isUploading ? 'Salvando...' : 'Salvar'}
              </Button>
            </>
          )}
        </div>

        {/* Text to read */}
        <div className="p-3 bg-muted/50 rounded-lg border text-sm max-h-32 overflow-y-auto">
          <div className="text-xs text-muted-foreground mb-1">Texto para gravar:</div>
          <p className="text-foreground leading-relaxed">{textContent}</p>
        </div>
      </CardContent>
    </Card>
  );
}