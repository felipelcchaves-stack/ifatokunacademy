import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2, Loader2 } from 'lucide-react';
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
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const words = text.split(' ');
  const effectiveAudioUrl = audioUrl || generatedAudioUrl;

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

  // Cleanup generated audio URL on unmount
  useEffect(() => {
    return () => {
      if (generatedAudioUrl) {
        URL.revokeObjectURL(generatedAudioUrl);
      }
    };
  }, [generatedAudioUrl]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const currentProgress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(currentProgress);
      
      // Simulate word highlighting based on progress
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

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setGeneratedAudioUrl(url);
      toast.success('Áudio gerado com sucesso!');
    } catch (error) {
      console.error('Error generating audio:', error);
      toast.error('Erro ao gerar áudio. Tente novamente.');
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
            
            <Volume2 className="w-5 h-5 text-muted-foreground" />
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
