import React, { useState } from 'react';
import { Lightbulb, Eye, Volume2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateFirstLetterHints, extractKeywords } from '@/lib/textChunking';
import { cn } from '@/lib/utils';

interface MemorizationHintsProps {
  text: string;
  onHintUsed?: (hintLevel: number) => void;
  onPlayAudio?: () => void;
  audioLoading?: boolean;
  maxHints?: number;
}

const MemorizationHints: React.FC<MemorizationHintsProps> = ({
  text,
  onHintUsed,
  onPlayAudio,
  audioLoading = false,
  maxHints = 3
}) => {
  const [usedHints, setUsedHints] = useState<Set<number>>(new Set());
  const [expandedHint, setExpandedHint] = useState<number | null>(null);

  const firstLetterHint = generateFirstLetterHints(text);
  const keywords = extractKeywords(text, 4);

  const hints = [
    {
      level: 1,
      title: 'Primeira Letra',
      description: 'Veja a primeira letra de cada palavra',
      icon: Eye,
      content: firstLetterHint.hint,
      penalty: 5
    },
    {
      level: 2,
      title: 'Palavras-Chave',
      description: 'Veja as palavras mais importantes',
      icon: Lightbulb,
      content: keywords.map((w, i) => (
        <span key={i} className="inline-block px-2 py-1 bg-amber-100 text-amber-800 rounded-md mr-2 mb-1">
          {w}
        </span>
      )),
      penalty: 10
    },
    {
      level: 3,
      title: 'Ouvir Áudio',
      description: 'Escute o texto uma vez',
      icon: Volume2,
      content: null,
      penalty: 15,
      action: onPlayAudio
    }
  ].slice(0, maxHints);

  const handleUseHint = (level: number, action?: () => void) => {
    if (!usedHints.has(level)) {
      setUsedHints(prev => new Set([...prev, level]));
      onHintUsed?.(level);
    }
    
    if (action) {
      action();
    } else {
      setExpandedHint(expandedHint === level ? null : level);
    }
  };

  const totalPenalty = hints
    .filter(h => usedHints.has(h.level))
    .reduce((sum, h) => sum + h.penalty, 0);

  return (
    <div className="w-full">
      {/* Hints List */}
      <div className="space-y-2">
        {hints.map((hint) => {
          const isUsed = usedHints.has(hint.level);
          const isExpanded = expandedHint === hint.level;
          const Icon = hint.icon;

          return (
            <div
              key={hint.level}
              className={cn(
                "border rounded-lg transition-all duration-200",
                isUsed ? "border-amber-200 bg-amber-50" : "border-border bg-card",
                isExpanded && "ring-2 ring-amber-200"
              )}
            >
              <button
                onClick={() => handleUseHint(hint.level, hint.action)}
                disabled={hint.level === 3 && audioLoading}
                className={cn(
                  "w-full flex items-center justify-between p-3 text-left",
                  hint.level === 3 && audioLoading && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    isUsed ? "bg-amber-200 text-amber-700" : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-medium text-sm",
                        isUsed ? "text-amber-800" : "text-foreground"
                      )}>
                        {hint.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        (-{hint.penalty}%)
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {hint.description}
                    </p>
                  </div>
                </div>
                
                {hint.content && (
                  <div className="text-muted-foreground">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                )}

                {hint.level === 3 && audioLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                )}
              </button>

              {/* Hint Content */}
              {isExpanded && hint.content && (
                <div className="px-3 pb-3 pt-0">
                  <div className="p-3 bg-white rounded-lg border border-amber-200">
                    {typeof hint.content === 'string' ? (
                      <p className="font-mono text-sm text-amber-900 break-words">
                        {hint.content}
                      </p>
                    ) : (
                      <div className="flex flex-wrap">
                        {hint.content}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Penalty Summary */}
      {usedHints.size > 0 && (
        <div className="mt-3 text-center">
          <p className="text-xs text-muted-foreground">
            Dicas usadas: {usedHints.size} | Penalidade total: -{totalPenalty}%
          </p>
        </div>
      )}
    </div>
  );
};

export default MemorizationHints;
