import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2,
  Settings2,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface KaraokeModeProps {
  text: string;
  onComplete: () => void;
  autoPlay?: boolean;
}

const KaraokeMode: React.FC<KaraokeModeProps> = ({
  text,
  onComplete,
  autoPlay = false
}) => {
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [speed, setSpeed] = useState(1); // words per second
  const [showSettings, setShowSettings] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const words = text.split(/\s+/).filter(w => w.length > 0);
  const wordDuration = 1000 / speed; // ms per word

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Play audio
  const playAudio = useCallback(async () => {
    setAudioLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
        body: { text, voiceId: 'onwK4e9ZLuTAKqWW03F9' }
      });

      if (error) throw error;

      if (data?.audioUrl) {
        audioRef.current = new Audio(data.audioUrl);
        audioRef.current.playbackRate = speed;
        await audioRef.current.play();
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      toast({
        title: "Erro ao carregar áudio",
        description: "Não foi possível gerar o áudio. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setAudioLoading(false);
    }
  }, [text, speed]);

  // Start karaoke animation
  const startKaraoke = useCallback(() => {
    setIsPlaying(true);
    setCurrentWordIndex(0);
    playAudio();

    intervalRef.current = setInterval(() => {
      setCurrentWordIndex(prev => {
        if (prev >= words.length - 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          setIsPlaying(false);
          setIsComplete(true);
          return prev;
        }
        return prev + 1;
      });
    }, wordDuration);
  }, [words.length, wordDuration, playAudio]);

  // Pause
  const pauseKaraoke = useCallback(() => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  // Resume
  const resumeKaraoke = useCallback(() => {
    if (currentWordIndex >= words.length - 1) {
      handleReset();
      return;
    }
    
    setIsPlaying(true);
    if (audioRef.current) {
      audioRef.current.play();
    }

    intervalRef.current = setInterval(() => {
      setCurrentWordIndex(prev => {
        if (prev >= words.length - 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          setIsPlaying(false);
          setIsComplete(true);
          return prev;
        }
        return prev + 1;
      });
    }, wordDuration);
  }, [currentWordIndex, words.length, wordDuration]);

  // Reset
  const handleReset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setCurrentWordIndex(-1);
    setIsPlaying(false);
    setIsComplete(false);
  }, []);

  // Auto-play on mount if enabled
  useEffect(() => {
    if (autoPlay) {
      startKaraoke();
    }
  }, [autoPlay]);

  return (
    <div className="space-y-6">
      {/* Dark mode container for focus */}
      <div className="bg-secondary rounded-xl p-8 min-h-[300px] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 opacity-20">
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
            style={{
              animation: isPlaying ? 'shimmer 2s infinite' : 'none',
              backgroundSize: '200% 100%'
            }}
          />
        </div>

        {/* Words Display */}
        <div className="relative z-10 flex flex-wrap justify-center gap-x-3 gap-y-2 max-w-2xl">
          {words.map((word, index) => {
            const isPast = index < currentWordIndex;
            const isCurrent = index === currentWordIndex;
            const isFuture = index > currentWordIndex;
            
            return (
              <span
                key={index}
                className={cn(
                  "font-serif text-2xl md:text-3xl transition-all duration-300 px-1",
                  isPast && "text-muted-foreground/50",
                  isCurrent && "text-accent font-bold scale-110 animate-pulse-sacred",
                  isFuture && "text-secondary-foreground/40"
                )}
                style={{
                  textShadow: isCurrent ? '0 0 20px hsl(var(--accent) / 0.5)' : 'none'
                }}
              >
                {word}
              </span>
            );
          })}
        </div>

        {/* Progress indicator */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="h-1 bg-secondary-foreground/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent transition-all duration-300"
              style={{ 
                width: `${((currentWordIndex + 1) / words.length) * 100}%` 
              }}
            />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 justify-center">
        {!isPlaying && currentWordIndex === -1 && (
          <Button
            onClick={startKaraoke}
            className="gradient-forest text-primary-foreground"
            disabled={audioLoading}
          >
            <Play className="w-4 h-4 mr-2" />
            {audioLoading ? 'Carregando...' : 'Iniciar Karaokê'}
          </Button>
        )}

        {isPlaying && (
          <Button variant="outline" onClick={pauseKaraoke}>
            <Pause className="w-4 h-4 mr-2" />
            Pausar
          </Button>
        )}

        {!isPlaying && currentWordIndex >= 0 && !isComplete && (
          <Button onClick={resumeKaraoke} className="gradient-forest text-primary-foreground">
            <Play className="w-4 h-4 mr-2" />
            Continuar
          </Button>
        )}

        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reiniciar
        </Button>

        <Button 
          variant="ghost" 
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Velocidade</span>
              <span>{speed.toFixed(1)}x</span>
            </div>
            <Slider
              value={[speed]}
              onValueChange={([v]) => setSpeed(v)}
              min={0.5}
              max={2}
              step={0.1}
              disabled={isPlaying}
            />
          </div>
        </div>
      )}

      {/* Complete */}
      {isComplete && (
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-green-600">
            <Check className="w-6 h-6" />
            <span className="font-medium text-lg">Leitura completa!</span>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Repetir
            </Button>
            <Button onClick={onComplete} className="gradient-sacred text-accent-foreground">
              Continuar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default KaraokeMode;
