import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Volume2, 
  ChevronRight, 
  RotateCcw,
  Brain,
  Timer,
  CheckCircle,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { calculateSimilarity } from '@/lib/textSimilarity';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MicrolearningModeProps {
  text: string;
  onComplete: (correct: boolean) => void;
  pauseDuration?: number; // seconds between fragments
}

// Split into very small chunks (3-5 words)
function splitIntoMicroChunks(text: string): string[] {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const chunks: string[] = [];
  
  for (let i = 0; i < words.length; i += 4) {
    const chunk = words.slice(i, Math.min(i + 4, words.length)).join(' ');
    chunks.push(chunk);
  }
  
  return chunks;
}

const MicrolearningMode: React.FC<MicrolearningModeProps> = ({
  text,
  onComplete,
  pauseDuration = 5
}) => {
  const { toast } = useToast();
  const [chunks] = useState(() => splitIntoMicroChunks(text));
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [phase, setPhase] = useState<'listen' | 'pause' | 'repeat' | 'validate'>('listen');
  const [repetitionCount, setRepetitionCount] = useState(0);
  const [pauseTimeLeft, setPauseTimeLeft] = useState(pauseDuration);
  const [userInput, setUserInput] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [masteredChunks, setMasteredChunks] = useState<Set<number>>(new Set());
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentChunk = chunks[currentChunkIndex];
  const isComplete = masteredChunks.size === chunks.length;

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Play audio for current chunk
  const playAudio = useCallback(async () => {
    setAudioLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
        body: { text: currentChunk, voiceId: 'onwK4e9ZLuTAKqWW03F9' }
      });

      if (error) throw error;

      if (data?.audioUrl) {
        const audio = new Audio(data.audioUrl);
        await audio.play();
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
  }, [currentChunk]);

  // Auto-play on chunk change (listen phase)
  useEffect(() => {
    if (phase === 'listen') {
      playAudio();
    }
  }, [currentChunkIndex, phase]);

  // Handle listen phase - after audio, go to pause
  const handleListenComplete = useCallback(() => {
    setRepetitionCount(prev => prev + 1);
    
    if (repetitionCount < 2) {
      // Repeat audio 3 times total
      setTimeout(() => playAudio(), 500);
    } else {
      // Move to pause phase
      setPhase('pause');
      setPauseTimeLeft(pauseDuration);
    }
  }, [repetitionCount, playAudio, pauseDuration]);

  // Pause countdown
  useEffect(() => {
    if (phase === 'pause') {
      timerRef.current = setInterval(() => {
        setPauseTimeLeft(prev => {
          if (prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            setPhase('repeat');
            return pauseDuration;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [phase, pauseDuration]);

  // Validate user input
  const handleValidate = useCallback(() => {
    const similarity = calculateSimilarity(currentChunk, userInput);
    const correct = similarity >= 70;
    setIsCorrect(correct);
    setPhase('validate');

    if (correct) {
      setMasteredChunks(prev => new Set([...prev, currentChunkIndex]));
      toast({
        title: "Correto! 🎉",
        description: `${similarity}% de acurácia`,
      });
    }
  }, [currentChunk, userInput, currentChunkIndex, toast]);

  // Move to next chunk
  const handleNext = useCallback(() => {
    if (currentChunkIndex < chunks.length - 1) {
      setCurrentChunkIndex(prev => prev + 1);
      setPhase('listen');
      setRepetitionCount(0);
      setUserInput('');
      setIsCorrect(null);
    } else if (isComplete) {
      onComplete(true);
    }
  }, [currentChunkIndex, chunks.length, isComplete, onComplete]);

  // Reset current chunk
  const handleRetry = useCallback(() => {
    setPhase('listen');
    setRepetitionCount(0);
    setUserInput('');
    setIsCorrect(null);
  }, []);

  const progress = (masteredChunks.size / chunks.length) * 100;

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Fragmento {currentChunkIndex + 1} de {chunks.length}</span>
          <span>{masteredChunks.size} dominados</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Main Content Area */}
      <div className={cn(
        "min-h-[250px] rounded-xl border-2 p-6",
        "flex flex-col items-center justify-center text-center",
        "transition-all duration-300",
        phase === 'pause' && "bg-amber-50 border-amber-300",
        phase === 'listen' && "bg-blue-50 border-blue-300",
        phase === 'repeat' && "bg-muted/30 border-border",
        isCorrect === true && "bg-green-50 border-green-300",
        isCorrect === false && "bg-red-50 border-red-300"
      )}>
        
        {/* Listen Phase */}
        {phase === 'listen' && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto">
              <Volume2 className={cn(
                "w-8 h-8 text-blue-600",
                audioLoading && "animate-pulse"
              )} />
            </div>
            <div>
              <p className="text-lg font-medium text-blue-800">Ouça com atenção</p>
              <p className="text-sm text-blue-600">
                Repetição {repetitionCount + 1} de 3
              </p>
            </div>
            <p className="font-serif text-xl text-foreground mt-4">
              {currentChunk}
            </p>
            <Button
              variant="outline"
              onClick={handleListenComplete}
              disabled={audioLoading}
            >
              <ChevronRight className="w-4 h-4 mr-2" />
              {repetitionCount < 2 ? 'Ouvir Novamente' : 'Continuar'}
            </Button>
          </div>
        )}

        {/* Pause Phase */}
        {phase === 'pause' && (
          <div className="space-y-4">
            <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto relative">
              <Timer className="w-8 h-8 text-amber-600" />
              <span className="absolute text-2xl font-bold text-amber-800">
                {pauseTimeLeft}
              </span>
            </div>
            <div>
              <p className="text-lg font-medium text-amber-800">Momento de Respirar</p>
              <p className="text-sm text-amber-600">
                Deixe o texto se fixar na memória...
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Relaxe e visualize as palavras mentalmente
            </p>
          </div>
        )}

        {/* Repeat Phase */}
        {phase === 'repeat' && isCorrect === null && (
          <div className="space-y-4 w-full max-w-md">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium">Agora é sua vez!</p>
              <p className="text-sm text-muted-foreground">
                Digite o fragmento que você memorizou
              </p>
            </div>
            
            <Textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Digite aqui..."
              className="min-h-[80px] text-center font-serif text-lg"
            />

            <div className="flex gap-2 justify-center">
              <Button variant="ghost" onClick={handleRetry}>
                <Volume2 className="w-4 h-4 mr-2" />
                Ouvir de Novo
              </Button>
              <Button
                onClick={handleValidate}
                disabled={!userInput.trim()}
                className="gradient-forest text-primary-foreground"
              >
                <Send className="w-4 h-4 mr-2" />
                Verificar
              </Button>
            </div>
          </div>
        )}

        {/* Validate Phase */}
        {phase === 'validate' && (
          <div className="space-y-4">
            {isCorrect ? (
              <>
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
                <p className="text-lg font-medium text-green-800">Excelente!</p>
                <p className="font-serif text-lg text-foreground">{currentChunk}</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                  <RotateCcw className="w-8 h-8 text-red-600" />
                </div>
                <p className="text-lg font-medium text-red-800">Quase lá!</p>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Esperado:</p>
                  <p className="font-serif text-lg text-foreground">{currentChunk}</p>
                  <p className="text-sm text-muted-foreground mt-2">Sua resposta:</p>
                  <p className="font-serif text-lg text-red-600">{userInput}</p>
                </div>
              </>
            )}

            <div className="flex gap-2 justify-center pt-4">
              {!isCorrect && (
                <Button variant="outline" onClick={handleRetry}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Tentar Novamente
                </Button>
              )}
              <Button
                onClick={handleNext}
                className="gradient-sacred text-accent-foreground"
              >
                {currentChunkIndex < chunks.length - 1 ? 'Próximo Fragmento' : 'Concluir'}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Chunk Preview */}
      <div className="flex gap-1 justify-center flex-wrap">
        {chunks.map((_, index) => (
          <div
            key={index}
            className={cn(
              "w-3 h-3 rounded-full transition-all",
              masteredChunks.has(index) && "bg-green-500",
              index === currentChunkIndex && !masteredChunks.has(index) && "bg-primary animate-pulse",
              index !== currentChunkIndex && !masteredChunks.has(index) && "bg-muted"
            )}
          />
        ))}
      </div>
    </div>
  );
};

export default MicrolearningMode;
