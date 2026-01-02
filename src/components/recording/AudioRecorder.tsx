import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Square, Pause, Play, Trash2, Save, Volume2 } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  
  const {
    isRecording,
    isPaused,
    formattedTime,
    audioUrl,
    isUploading,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    uploadRecording
  } = useAudioRecorder();

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
    if (!user) return;
    
    const savedUrl = await uploadRecording(
      user.id,
      title,
      textContent,
      exerciseId,
      lessonId,
      moduleId
    );
    
    if (savedUrl && onSaved) {
      onSaved(savedUrl);
      resetRecording();
    }
  };

  return (
    <Card className={cn("border-primary/20", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Mic className="h-4 w-4 text-primary" />
          Gravar com Sua Voz
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recording indicator */}
        {isRecording && (
          <div className="flex items-center justify-center gap-3 py-4">
            <div className={cn(
              "w-3 h-3 rounded-full",
              isPaused ? "bg-yellow-500" : "bg-red-500 animate-pulse"
            )} />
            <span className="text-2xl font-mono font-bold">{formattedTime}</span>
            {isPaused && <span className="text-sm text-muted-foreground">(pausado)</span>}
          </div>
        )}

        {/* Audio preview */}
        {audioUrl && !isRecording && (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePlayPause}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <div className="flex-1">
              <div className="text-sm font-medium">Gravação concluída</div>
              <div className="text-xs text-muted-foreground">{formattedTime}</div>
            </div>
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <audio 
              ref={audioRef} 
              src={audioUrl} 
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          {!isRecording && !audioUrl && (
            <Button onClick={startRecording} className="gap-2">
              <Mic className="h-4 w-4" />
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
              <Button onClick={handleSave} disabled={isUploading} className="gap-2">
                <Save className="h-4 w-4" />
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
