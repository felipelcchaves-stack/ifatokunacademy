import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, RotateCcw, Volume2, Loader2, Check, Bot, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { calculateWordTimings, findWordAtTime, type WordTiming } from '@/lib/audioSyncUtils';
import InlineRecorder from '@/components/recording/InlineRecorder';
import { useUserRecordings } from '@/hooks/useUserRecordings';
import { AudioSource } from '@/components/exercises/AudioSourceSelector';

interface ReadingExerciseProps {
  text: string;
  audioUrl?: string | null;
  onComplete?: () => void;
  exerciseId?: string;
  lessonId?: string;
  moduleId?: string;
}

const ReadingExercise: React.FC<ReadingExerciseProps> = ({ 
  text, 
  audioUrl, 
  onComplete,
  exerciseId,
  lessonId,
  moduleId
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState(-1);
  const [aiAudioUrl, setAiAudioUrl] = useState<string | null>(audioUrl || null);
  const [isCached, setIsCached] = useState(false);
  const [wordTimings, setWordTimings] = useState<WordTiming[]>([]);
  const [audioSource, setAudioSource] = useState<AudioSource>('ai');
  const [selectedRecordingUrl, setSelectedRecordingUrl] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // Fetch user recordings for this context
  const { recordings, refetch: refetchRecordings } = useUserRecordings({
    exerciseId,
    lessonId,
    moduleId
  });

  // Determine effective audio URL based on source
  const effectiveAudioUrl = useMemo(() => {
    if (audioSource === 'personal' && selectedRecordingUrl) {
      return selectedRecordingUrl;
    }
    return aiAudioUrl;
  }, [audioSource, selectedRecordingUrl, aiAudioUrl]);

  const words = useMemo(() => text.split(/\s+/).filter(w => w.length > 0), [text]);

  // Calculate word timings when duration is known
  useEffect(() => {
    if (duration > 0 && words.length > 0) {
      const timings = calculateWordTimings(text, duration);
      setWordTimings(timings);
    }
  }, [duration, text, words.length]);

  // Update highlighted word based on current time
  useEffect(() => {
    if (wordTimings.length > 0 && isPlaying) {
      const wordIndex = findWordAtTime(wordTimings, currentTime);
      setHighlightedWordIndex(wordIndex);
    }
  }, [currentTime, wordTimings, isPlaying]);

  // Auto-scroll to keep highlighted word visible
  useEffect(() => {
    if (highlightedWordIndex >= 0 && wordRefs.current[highlightedWordIndex] && textContainerRef.current) {
      const wordElement = wordRefs.current[highlightedWordIndex];
      const container = textContainerRef.current;
      
      if (wordElement) {
        const wordRect = wordElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Check if word is outside visible area
        if (wordRect.top < containerRect.top || wordRect.bottom > containerRect.bottom) {
          wordElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [highlightedWordIndex]);

  useEffect(() => {
    if (effectiveAudioUrl) {
      audioRef.current = new Audio(effectiveAudioUrl);
      
      audioRef.current.addEventListener('loadedmetadata', () => {
        if (audioRef.current) {
          setDuration(audioRef.current.duration);
        }
      });
      
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

  // Update aiAudioUrl if audioUrl prop changes
  useEffect(() => {
    if (audioUrl) {
      setAiAudioUrl(audioUrl);
    }
  }, [audioUrl]);

  // Set first recording as selected when recordings load
  useEffect(() => {
    if (recordings && recordings.length > 0 && !selectedRecordingUrl) {
      setSelectedRecordingUrl(recordings[0].audio_url);
    }
  }, [recordings, selectedRecordingUrl]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const time = audioRef.current.currentTime;
      const dur = audioRef.current.duration;
      
      setCurrentTime(time);
      setProgress((time / dur) * 100);
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
        setAiAudioUrl(data.audioUrl);
        setIsCached(data.cached);
        setAudioSource('ai');
        toast.success(data.cached ? 'Áudio carregado do cache!' : 'Áudio gerado com sucesso!');
      } else {
        throw new Error('URL do áudio não retornada');
      }
    } catch (error: any) {
      console.error('Error generating audio:', error);
      
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
      setCurrentTime(0);
      setHighlightedWordIndex(-1);
    }
  };

  const getWordClassName = (index: number) => {
    if (index === highlightedWordIndex) {
      return 'reading-word-current';
    } else if (index < highlightedWordIndex) {
      return 'reading-word-past';
    }
    return 'reading-word-future';
  };

  return (
    <div className="protected-content w-full max-w-2xl mx-auto">
      {/* Text Display */}
      <div 
        ref={textContainerRef}
        className="bg-card rounded-2xl p-6 md:p-8 shadow-soft border border-border mb-6 max-h-[400px] overflow-y-auto scroll-smooth"
      >
        <p className="text-lg leading-relaxed text-foreground">
          {words.map((word, index) => (
            <span
              key={index}
              ref={el => wordRefs.current[index] = el}
              className={`reading-word ${getWordClassName(index)}`}
            >
              {word}{' '}
            </span>
          ))}
        </p>
      </div>

      {/* Audio Source Toggle */}
      {(aiAudioUrl || (recordings && recordings.length > 0)) && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-muted-foreground">Ouvir:</span>
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setAudioSource('ai')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                audioSource === 'ai' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-background hover:bg-muted text-muted-foreground'
              }`}
              disabled={!aiAudioUrl}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>IA</span>
            </button>
            <button
              onClick={() => setAudioSource('personal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                audioSource === 'personal' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-background hover:bg-muted text-muted-foreground'
              }`}
              disabled={!recordings || recordings.length === 0}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Minha Voz</span>
              {recordings && recordings.length > 0 && (
                <span className="ml-1 text-xs opacity-75">({recordings.length})</span>
              )}
            </button>
          </div>
        </div>
      )}

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
                    const newTime = (value[0] / 100) * audioRef.current.duration;
                    audioRef.current.currentTime = newTime;
                    setCurrentTime(newTime);
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
              {audioSource === 'ai' ? (
                <>
                  <Volume2 className="w-5 h-5 text-muted-foreground" />
                  {isCached && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Check className="w-3 h-3 text-green-500" />
                      Cache
                    </span>
                  )}
                </>
              ) : (
                <Mic className="w-5 h-5 text-green-500" />
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

      {/* Inline Recorder */}
      <InlineRecorder
        text={text}
        title="Leitura Guiada"
        exerciseId={exerciseId}
        lessonId={lessonId}
        moduleId={moduleId}
        onSaved={() => refetchRecordings()}
        className="mt-4"
      />
    </div>
  );
};

export default ReadingExercise;
