import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  Volume2,
  Shuffle,
  ArrowRight,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { splitIntoChunks } from '@/lib/textChunking';

interface TapCompleteProps {
  text: string;
  onComplete: (correct: boolean) => void;
  onPlayAudio?: () => void;
  audioLoading?: boolean;
}

interface WordItem {
  content: string;
  originalIndex: number;
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

const CHUNK_THRESHOLD = 12; // Words threshold for auto-chunk mode

const TapComplete: React.FC<TapCompleteProps> = ({
  text,
  onComplete,
  onPlayAudio,
  audioLoading
}) => {
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<WordItem[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [useChunkMode, setUseChunkMode] = useState<boolean>(false);
  
  // Count words to determine if chunk mode should be available/default
  const wordCount = useMemo(() => {
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }, [text]);

  // Auto-enable chunk mode for long texts
  useEffect(() => {
    if (wordCount > CHUNK_THRESHOLD) {
      setUseChunkMode(true);
    }
  }, [wordCount]);

  // Create items based on mode (words or chunks)
  const { items, shuffledItems } = useMemo(() => {
    let itemList: WordItem[];
    
    if (useChunkMode) {
      // Use chunks (small phrases) for easier ordering
      const chunks = splitIntoChunks(text, 4); // ~4 words per chunk
      itemList = chunks.map((chunk, i) => ({
        content: chunk.text,
        originalIndex: i
      }));
    } else {
      // Use individual words
      const wordList = text.split(/\s+/).filter(w => w.length > 0);
      itemList = wordList.map((word, i) => ({
        content: word,
        originalIndex: i
      }));
    }
    
    return {
      items: itemList,
      shuffledItems: shuffleArray([...itemList])
    };
  }, [text, useChunkMode]);

  // Track which items are still available
  const [availableItems, setAvailableItems] = useState<WordItem[]>([]);
  
  // Reset when items change
  useEffect(() => {
    setAvailableItems(shuffledItems);
    setSelectedItems([]);
    setIsCorrect(null);
  }, [shuffledItems]);

  const handleItemTap = useCallback((item: WordItem, tapIndex: number) => {
    // Add item to selected (preserving originalIndex)
    setSelectedItems(prev => [...prev, item]);
    
    // Remove from available
    setAvailableItems(prev => prev.filter((_, i) => i !== tapIndex));
  }, []);

  const handleUndo = useCallback(() => {
    if (selectedItems.length === 0) return;
    
    const lastItem = selectedItems[selectedItems.length - 1];
    
    setSelectedItems(prev => prev.slice(0, -1));
    setAvailableItems(prev => [...prev, lastItem]);
  }, [selectedItems]);

  const handleReset = useCallback(() => {
    setSelectedItems([]);
    setAvailableItems(shuffleArray([...items]));
    setIsCorrect(null);
  }, [items]);

  const handleValidate = useCallback(() => {
    // Validate by checking if indices are in correct sequence: 0, 1, 2, 3...
    const isSequenceCorrect = selectedItems.every(
      (item, index) => item.originalIndex === index
    );
    
    setIsCorrect(isSequenceCorrect);
    setAttempts(prev => prev + 1);
    
    if (isSequenceCorrect) {
      toast({
        title: "Perfeito! 🎉",
        description: "Você ordenou corretamente!",
      });
      setTimeout(() => onComplete(true), 1500);
    }
  }, [selectedItems, onComplete, toast]);

  const toggleChunkMode = useCallback(() => {
    setUseChunkMode(prev => !prev);
  }, []);

  const isComplete = selectedItems.length === items.length;
  const showChunkToggle = wordCount > 6; // Show toggle if text has more than 6 words

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">
          Toque {useChunkMode ? 'nas frases' : 'nas palavras'} na ordem correta para formar o texto
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
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
          
          {showChunkToggle && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleChunkMode}
              className={cn(
                "transition-colors",
                useChunkMode && "bg-primary/10 border-primary"
              )}
            >
              <Layers className="w-4 h-4 mr-2" />
              {useChunkMode ? 'Modo frases' : 'Modo palavras'}
            </Button>
          )}
        </div>
      </div>

      {/* Selected Items Area */}
      <div 
        className={cn(
          "min-h-[100px] p-4 rounded-xl border-2 border-dashed",
          "flex flex-wrap gap-2 items-start content-start",
          "transition-all duration-300",
          isCorrect === true && "bg-green-50 border-green-300 dark:bg-green-950/30",
          isCorrect === false && "bg-red-50 border-red-300 dark:bg-red-950/30",
          isCorrect === null && "bg-muted/30 border-border"
        )}
      >
        {selectedItems.length === 0 ? (
          <p className="text-muted-foreground text-sm w-full text-center py-4">
            Toque {useChunkMode ? 'nas frases' : 'nas palavras'} abaixo para começar...
          </p>
        ) : (
          selectedItems.map((item, index) => (
            <span
              key={`selected-${item.originalIndex}-${index}`}
              className={cn(
                "px-3 py-2 rounded-lg font-serif",
                useChunkMode ? "text-base" : "text-lg",
                "bg-primary/10 text-primary border border-primary/20",
                "animate-fade-in-up"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {item.content}
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

      {/* Available Items */}
      <div className="flex flex-wrap gap-2 justify-center">
        {availableItems.map((item, index) => (
          <button
            key={`available-${item.originalIndex}-${index}`}
            onClick={() => handleItemTap(item, index)}
            disabled={isCorrect === true}
            className={cn(
              "px-4 py-3 rounded-xl font-serif",
              useChunkMode ? "text-base" : "text-lg",
              "bg-card border-2 border-border",
              "hover:border-primary hover:bg-primary/5",
              "active:scale-95 transition-all duration-150",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "shadow-soft hover:shadow-forest"
            )}
          >
            {item.content}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Button
          variant="outline"
          onClick={handleUndo}
          disabled={selectedItems.length === 0 || isCorrect === true}
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
