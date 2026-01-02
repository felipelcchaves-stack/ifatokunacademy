import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  Volume2,
  Shuffle,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TapCompleteProps {
  text: string;
  onComplete: (correct: boolean) => void;
  onPlayAudio?: () => void;
  audioLoading?: boolean;
}

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const TapComplete: React.FC<TapCompleteProps> = ({
  text,
  onComplete,
  onPlayAudio,
  audioLoading
}) => {
  const { toast } = useToast();
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(0);
  
  // Split text into words and create shuffled options
  const { words, shuffledWords } = useMemo(() => {
    const wordList = text.split(/\s+/).filter(w => w.length > 0);
    return {
      words: wordList,
      shuffledWords: shuffleArray(wordList.map((w, i) => ({ word: w, originalIndex: i })))
    };
  }, [text]);

  // Track which words have been used
  const [availableWords, setAvailableWords] = useState(shuffledWords);
  
  useEffect(() => {
    setAvailableWords(shuffledWords);
    setSelectedWords([]);
    setIsCorrect(null);
  }, [shuffledWords]);

  const handleWordTap = useCallback((wordData: { word: string; originalIndex: number }, tapIndex: number) => {
    // Add word to selected
    setSelectedWords(prev => [...prev, wordData.word]);
    
    // Remove from available
    setAvailableWords(prev => prev.filter((_, i) => i !== tapIndex));
  }, []);

  const handleUndo = useCallback(() => {
    if (selectedWords.length === 0) return;
    
    const lastWord = selectedWords[selectedWords.length - 1];
    const originalIndex = words.indexOf(lastWord);
    
    setSelectedWords(prev => prev.slice(0, -1));
    setAvailableWords(prev => [...prev, { word: lastWord, originalIndex }]);
  }, [selectedWords, words]);

  const handleReset = useCallback(() => {
    setSelectedWords([]);
    setAvailableWords(shuffleArray(words.map((w, i) => ({ word: w, originalIndex: i }))));
    setIsCorrect(null);
  }, [words]);

  const handleValidate = useCallback(() => {
    const isMatch = selectedWords.join(' ') === words.join(' ');
    setIsCorrect(isMatch);
    setAttempts(prev => prev + 1);
    
    if (isMatch) {
      toast({
        title: "Perfeito! 🎉",
        description: "Você ordenou corretamente!",
      });
      setTimeout(() => onComplete(true), 1500);
    }
  }, [selectedWords, words, onComplete, toast]);

  const isComplete = selectedWords.length === words.length;

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">
          Toque nas palavras na ordem correta para formar o texto
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onPlayAudio}
          disabled={audioLoading}
          className="text-primary"
        >
          <Volume2 className={cn("w-4 h-4 mr-2", audioLoading && "animate-pulse")} />
          {audioLoading ? 'Carregando...' : 'Ouvir texto'}
        </Button>
      </div>

      {/* Selected Words Area */}
      <div 
        className={cn(
          "min-h-[100px] p-4 rounded-xl border-2 border-dashed",
          "flex flex-wrap gap-2 items-start content-start",
          "transition-all duration-300",
          isCorrect === true && "bg-green-50 border-green-300",
          isCorrect === false && "bg-red-50 border-red-300",
          isCorrect === null && "bg-muted/30 border-border"
        )}
      >
        {selectedWords.length === 0 ? (
          <p className="text-muted-foreground text-sm w-full text-center py-4">
            Toque nas palavras abaixo para começar...
          </p>
        ) : (
          selectedWords.map((word, index) => (
            <span
              key={`selected-${index}`}
              className={cn(
                "px-3 py-2 rounded-lg font-serif text-lg",
                "bg-primary/10 text-primary border border-primary/20",
                "animate-fade-in-up"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {word}
            </span>
          ))
        )}
      </div>

      {/* Result Feedback */}
      {isCorrect !== null && (
        <div className={cn(
          "flex items-center justify-center gap-2 py-2",
          isCorrect ? "text-green-600" : "text-red-600"
        )}>
          {isCorrect ? (
            <>
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Correto! Parabéns!</span>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5" />
              <span className="font-medium">Ordem incorreta. Tente novamente!</span>
            </>
          )}
        </div>
      )}

      {/* Available Words */}
      <div className="flex flex-wrap gap-2 justify-center">
        {availableWords.map((wordData, index) => (
          <button
            key={`available-${index}-${wordData.originalIndex}`}
            onClick={() => handleWordTap(wordData, index)}
            disabled={isCorrect === true}
            className={cn(
              "px-4 py-3 rounded-xl font-serif text-lg",
              "bg-card border-2 border-border",
              "hover:border-primary hover:bg-primary/5",
              "active:scale-95 transition-all duration-150",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "shadow-soft hover:shadow-forest"
            )}
          >
            {wordData.word}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Button
          variant="outline"
          onClick={handleUndo}
          disabled={selectedWords.length === 0 || isCorrect === true}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Desfazer
        </Button>
        
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isCorrect === true}
        >
          <Shuffle className="w-4 h-4 mr-2" />
          Recomeçar
        </Button>

        {isComplete && isCorrect === null && (
          <Button
            onClick={handleValidate}
            className="gradient-forest text-primary-foreground"
          >
            Verificar
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}

        {isCorrect === false && (
          <Button
            onClick={handleReset}
            className="gradient-forest text-primary-foreground"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
        )}
      </div>

      {/* Attempts Counter */}
      {attempts > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Tentativas: {attempts}
        </p>
      )}
    </div>
  );
};

export default TapComplete;
