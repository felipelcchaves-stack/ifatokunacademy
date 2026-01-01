import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface ReadingExerciseProps {
  text: string;
  audioUrl?: string | null;
  onComplete?: () => void;
}

const ReadingExercise: React.FC<ReadingExerciseProps> = ({ text, audioUrl, onComplete }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const words = text.split(' ');

  useEffect(() => {
    if (audioUrl) {
      audioRef.current = new Audio(audioUrl);
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
  }, [audioUrl]);

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
      {audioUrl ? (
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
        <div className="bg-muted/50 rounded-xl p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Áudio será disponibilizado em breve via integração ElevenLabs
          </p>
        </div>
      )}
    </div>
  );
};

export default ReadingExercise;
