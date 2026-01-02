import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

interface ReadingExerciseProps {
  text: string;
  audioUrl?: string | null;
  onComplete?: () => void;
}

const ReadingExercise: React.FC<ReadingExerciseProps> = ({ text, audioUrl, onComplete }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);
  const [effectiveAudioUrl, setEffectiveAudioUrl] = useState<string | null>(audioUrl || null);
  const [isCached, setIsCached] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const words = text.split(' ');

  useEffect(() => {
    if (effectiveAudioUrl) {
      audioRef.current = new Audio(effectiveAudioUrl);
      audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
      audioRef.current.addEventListener('ended', handleEnded);
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current.removeEventListener('ended', handleEnded);
      }
    };
  }, [effectiveAudioUrl]);

  // Update effectiveAudioUrl if audioUrl prop changes
  useEffect(() => {
    if (audioUrl) {
      setEffectiveAudioUrl(audioUrl);
    }
  }, [audioUrl]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const currentProgress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(currentProgress);
      
      const wordIndex = Math.floor((currentProgress / 100) * words.length);
      setHighlightedWordIndex(wordIndex);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setHighlightedWordIndex(-1);
    onComplete?.();
  };

  const generateAudio = useCallback(async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Falha ao gerar áudio');
      }

      const data = await response.json();
      
      if (data.audioUrl) {
        setEffectiveAudioUrl(data.audioUrl);
        setIsCached(data.cached);
        toast.success(data.cached ? 'Áudio carregado do cache!' : 'Áudio gerado com sucesso!');
      } else {
        throw new Error('URL do áudio não retornada');
      }
    } catch (error: any) {
      console.error('Error generating audio:', error);
      
      // Show user-friendly error message
      const errorMessage = error?.message || 'Erro ao gerar áudio';
      
      if (errorMessage.includes('Limite de créditos') || errorMessage.includes('quota')) {
        toast.error('Limite de créditos atingido. O áudio estará disponível em breve.', {
          description: 'Entre em contato com o administrador se o problema persistir.',
          duration: 5000
        });
      } else if (errorMessage.includes('indisponível') || errorMessage.includes('unusual')) {
        toast.error('Serviço de áudio temporariamente indisponível.', {
          description: 'Tente novamente em alguns minutos.',
          duration: 5000
        });
      } else {
        toast.error('Erro ao gerar áudio.', {
          description: 'Tente novamente mais tarde.',
          duration: 4000
        });
      }
    } finally {
      setIsGenerating(false);
    }
  }, [text]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setProgress(0);
      setHighlightedWordIndex(-1);
    }
  };

  return (
    <div className="protected-content w-full max-w-2xl mx-auto">
      {/* Text Display */}
      <div className="bg-card rounded-2xl p-6 md:p-8 shadow-soft border border-border mb-6">
        <p className="text-lg leading-relaxed text-foreground">
          {words.map((word, index) => (
            <span
              key={index}
              className={`
                transition-all duration-200
                ${highlightedWordIndex === index ? 'bg-primary/20 text-primary font-medium' : ''}
                ${index < highlightedWordIndex ? 'text-muted-foreground' : ''}
              `}
            >
              {word}{' '}
            </span>
          ))}
        </p>
      </div>

      {/* Audio Controls */}
      {effectiveAudioUrl ? (
        <div className="bg-muted/50 rounded-xl p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={togglePlay}
              className="rounded-full w-12 h-12 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </Button>
            
            <div className="flex-1">
              <Slider
                value={[progress]}
                max={100}
                step={0.1}
                className="cursor-pointer"
                onValueChange={(value) => {
                  if (audioRef.current) {
                    audioRef.current.currentTime = (value[0] / 100) * audioRef.current.duration;
                  }
                }}
              />
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRestart}
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center gap-1">
              <Volume2 className="w-5 h-5 text-muted-foreground" />
              {isCached && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-500" />
                  Cache
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-muted/50 rounded-xl p-4">
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground text-center">
              Clique para ouvir a pronúncia correta em Yorubá
            </p>
            <Button
              onClick={generateAudio}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando áudio...
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" />
                  Gerar Áudio
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadingExercise;
