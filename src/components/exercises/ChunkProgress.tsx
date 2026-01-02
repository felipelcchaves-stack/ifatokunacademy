import React from 'react';
import { CheckCircle, Circle, PlayCircle, Link2 } from 'lucide-react';
import { TextChunk } from '@/lib/textChunking';
import { cn } from '@/lib/utils';

interface ChunkProgressProps {
  chunks: TextChunk[];
  masteredChunks: Set<number>;
  currentChunkIndex: number;
  onChunkClick?: (index: number) => void;
  showChainLinks?: boolean;
}

const ChunkProgress: React.FC<ChunkProgressProps> = ({
  chunks,
  masteredChunks,
  currentChunkIndex,
  onChunkClick,
  showChainLinks = true
}) => {
  const getChunkStatus = (index: number): 'mastered' | 'current' | 'pending' => {
    if (masteredChunks.has(index)) return 'mastered';
    if (index === currentChunkIndex) return 'current';
    return 'pending';
  };

  return (
    <div className="w-full">
      {/* Visual Chain */}
      <div className="flex items-center justify-center gap-1 flex-wrap py-4">
        {chunks.map((chunk, index) => {
          const status = getChunkStatus(index);
          const isClickable = onChunkClick && (status === 'mastered' || status === 'current');

          return (
            <React.Fragment key={chunk.id}>
              {/* Chunk Node */}
              <button
                onClick={() => isClickable && onChunkClick?.(index)}
                disabled={!isClickable}
                className={cn(
                  "relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300",
                  status === 'mastered' && "bg-green-500 text-white shadow-lg shadow-green-500/30",
                  status === 'current' && "bg-primary text-primary-foreground shadow-lg shadow-primary/30 animate-pulse",
                  status === 'pending' && "bg-muted text-muted-foreground",
                  isClickable && "cursor-pointer hover:scale-110"
                )}
              >
                {status === 'mastered' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : status === 'current' ? (
                  <PlayCircle className="w-5 h-5" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
                <span className="absolute -bottom-5 text-xs font-medium text-muted-foreground">
                  {index + 1}
                </span>
              </button>

              {/* Chain Link */}
              {showChainLinks && index < chunks.length - 1 && (
                <div className={cn(
                  "flex items-center transition-all duration-300",
                  masteredChunks.has(index) && masteredChunks.has(index + 1) 
                    ? "text-green-500" 
                    : "text-muted-foreground/30"
                )}>
                  <Link2 className="w-4 h-4 rotate-90" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Chunk Preview */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {chunks.map((chunk, index) => {
          const status = getChunkStatus(index);
          const isClickable = onChunkClick && (status === 'mastered' || status === 'current');

          return (
            <button
              key={chunk.id}
              onClick={() => isClickable && onChunkClick?.(index)}
              disabled={!isClickable}
              className={cn(
                "p-3 rounded-lg text-left text-sm transition-all duration-200 border",
                status === 'mastered' && "bg-green-50 border-green-200 text-green-800",
                status === 'current' && "bg-primary/10 border-primary/30 text-foreground ring-2 ring-primary/20",
                status === 'pending' && "bg-muted/50 border-border text-muted-foreground",
                isClickable && "cursor-pointer hover:shadow-md"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full",
                  status === 'mastered' && "bg-green-200 text-green-800",
                  status === 'current' && "bg-primary text-primary-foreground",
                  status === 'pending' && "bg-muted text-muted-foreground"
                )}>
                  Trecho {index + 1}
                </span>
                <span className="text-xs text-muted-foreground">
                  {chunk.words.length} palavras
                </span>
              </div>
              <p className="line-clamp-2 font-serif">
                {status === 'pending' 
                  ? chunk.words.slice(0, 3).join(' ') + '...'
                  : chunk.text
                }
              </p>
            </button>
          );
        })}
      </div>

      {/* Progress Summary */}
      <div className="mt-4 flex items-center justify-center gap-4 text-sm">
        <div className="flex items-center gap-1 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span>{masteredChunks.size} dominados</span>
        </div>
        <div className="text-muted-foreground">
          {chunks.length - masteredChunks.size} restantes
        </div>
      </div>
    </div>
  );
};

export default ChunkProgress;
