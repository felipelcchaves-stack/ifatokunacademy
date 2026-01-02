import React, { useState, useCallback, useMemo } from 'react';
import { 
  CheckCircle, 
  RotateCcw, 
  Volume2,
  Link,
  Unlink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { splitIntoChunks, TextChunk } from '@/lib/textChunking';

interface VisualBuilderProps {
  text: string;
  onComplete: (correct: boolean) => void;
  onPlayAudio?: () => void;
  audioLoading?: boolean;
}

// Colors for visual blocks
const BLOCK_COLORS = [
  { bg: 'bg-blue-100 border-blue-300', text: 'text-blue-800', connected: 'bg-blue-200' },
  { bg: 'bg-green-100 border-green-300', text: 'text-green-800', connected: 'bg-green-200' },
  { bg: 'bg-purple-100 border-purple-300', text: 'text-purple-800', connected: 'bg-purple-200' },
  { bg: 'bg-amber-100 border-amber-300', text: 'text-amber-800', connected: 'bg-amber-200' },
  { bg: 'bg-pink-100 border-pink-300', text: 'text-pink-800', connected: 'bg-pink-200' },
  { bg: 'bg-cyan-100 border-cyan-300', text: 'text-cyan-800', connected: 'bg-cyan-200' },
];

// Shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const VisualBuilder: React.FC<VisualBuilderProps> = ({
  text,
  onComplete,
  onPlayAudio,
  audioLoading
}) => {
  // Create chunks
  const chunks = useMemo(() => splitIntoChunks(text, 5), [text]);
  
  // Shuffled chunks for building
  const [shuffledChunks, setShuffledChunks] = useState<TextChunk[]>(() => 
    shuffleArray(chunks)
  );
  
  // Selected/ordered chunks
  const [orderedChunks, setOrderedChunks] = useState<TextChunk[]>([]);
  
  // Connection animation state
  const [connectingIndex, setConnectingIndex] = useState<number | null>(null);
  
  // Result state
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const handleChunkClick = useCallback((chunk: TextChunk, sourceIndex: number) => {
    // Animation
    setConnectingIndex(orderedChunks.length);
    
    // Add to ordered
    setOrderedChunks(prev => [...prev, chunk]);
    
    // Remove from shuffled
    setShuffledChunks(prev => prev.filter((_, i) => i !== sourceIndex));
    
    // Clear animation after delay
    setTimeout(() => setConnectingIndex(null), 300);
  }, [orderedChunks.length]);

  const handleRemoveOrdered = useCallback((index: number) => {
    const removed = orderedChunks[index];
    setOrderedChunks(prev => prev.filter((_, i) => i !== index));
    setShuffledChunks(prev => [...prev, removed]);
  }, [orderedChunks]);

  const handleReset = useCallback(() => {
    setShuffledChunks(shuffleArray(chunks));
    setOrderedChunks([]);
    setIsCorrect(null);
  }, [chunks]);

  const handleValidate = useCallback(() => {
    const isMatch = orderedChunks.map(c => c.id).join(',') === chunks.map(c => c.id).join(',');
    setIsCorrect(isMatch);
    
    if (isMatch) {
      setTimeout(() => onComplete(true), 1500);
    }
  }, [orderedChunks, chunks, onComplete]);

  const isComplete = orderedChunks.length === chunks.length;
  const getColor = (id: number) => BLOCK_COLORS[id % BLOCK_COLORS.length];

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">
          Conecte os blocos na ordem correta para formar o texto
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onPlayAudio}
          disabled={audioLoading}
          className="text-primary"
        >
          <Volume2 className={cn("w-4 h-4 mr-2", audioLoading && "animate-pulse")} />
          {audioLoading ? 'Carregando...' : 'Ouvir texto completo'}
        </Button>
      </div>

      {/* Building Area - Ordered Chunks */}
      <div 
        className={cn(
          "min-h-[150px] p-4 rounded-xl border-2 border-dashed",
          "transition-all duration-300",
          isCorrect === true && "bg-green-50 border-green-300",
          isCorrect === false && "bg-red-50 border-red-300",
          isCorrect === null && "bg-muted/30 border-border"
        )}
      >
        {orderedChunks.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[100px]">
            <p className="text-muted-foreground text-sm">
              Clique nos blocos abaixo para construir o texto...
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 items-center">
            {orderedChunks.map((chunk, index) => {
              const color = getColor(chunk.id);
              const showConnector = index < orderedChunks.length - 1;
              
              return (
                <React.Fragment key={`ordered-${chunk.id}`}>
                  <button
                    onClick={() => handleRemoveOrdered(index)}
                    disabled={isCorrect === true}
                    className={cn(
                      "px-4 py-3 rounded-lg border-2 transition-all",
                      "hover:opacity-80 active:scale-95",
                      "disabled:cursor-not-allowed",
                      color.bg, color.text,
                      index === connectingIndex && "animate-pulse"
                    )}
                  >
                    <span className="font-serif text-sm">{chunk.text}</span>
                  </button>
                  
                  {showConnector && (
                    <div className="flex items-center">
                      <Link className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
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
              <span className="font-medium">Perfeito! Texto construído corretamente!</span>
            </>
          ) : (
            <>
              <Unlink className="w-5 h-5" />
              <span className="font-medium">Ordem incorreta. Tente reorganizar!</span>
            </>
          )}
        </div>
      )}

      {/* Available Chunks */}
      {shuffledChunks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground text-center">
            Blocos disponíveis ({shuffledChunks.length})
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {shuffledChunks.map((chunk, index) => {
              const color = getColor(chunk.id);
              
              return (
                <button
                  key={`shuffled-${chunk.id}`}
                  onClick={() => handleChunkClick(chunk, index)}
                  disabled={isCorrect === true}
                  className={cn(
                    "px-4 py-3 rounded-lg border-2 transition-all",
                    "hover:scale-105 hover:shadow-md active:scale-95",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    color.bg, color.text
                  )}
                >
                  <span className="font-serif text-sm">{chunk.text}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Button variant="outline" onClick={handleReset} disabled={isCorrect === true}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Recomeçar
        </Button>

        {isComplete && isCorrect === null && (
          <Button
            onClick={handleValidate}
            className="gradient-forest text-primary-foreground"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Verificar Construção
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
    </div>
  );
};

export default VisualBuilder;
