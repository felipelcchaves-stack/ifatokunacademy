import React, { useState } from 'react';
import { Lightbulb, Eye, Volume2, ChevronDown, ChevronUp, Mic, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateFirstLetterHints, extractKeywords } from '@/lib/textChunking';
import { AudioSourceSelector } from './AudioSourceSelector';
import { cn } from '@/lib/utils';

interface MemorizationHintsProps {
  text: string;
  exerciseId?: string;
  lessonId?: string;
  moduleId?: string;
  onHintUsed?: (hintLevel: number) => void;
  onPlayAudio?: () => void;
  audioLoading?: boolean;
  maxHints?: number;
  showAudioSourceSelector?: boolean;
}

const MemorizationHints: React.FC<MemorizationHintsProps> = ({
  text,
  exerciseId,
  lessonId,
  moduleId,
  onHintUsed,
  onPlayAudio,
  audioLoading = false,
  maxHints = 3,
  showAudioSourceSelector = true
}) => {
  const [usedHints, setUsedHints] = useState<Set<number>>(new Set());
  const [expandedHint, setExpandedHint] = useState<number | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  const handlePlayFromSelector = (audioUrl: string) => {
    // Stop any existing audio
    if (currentAudio) {
      currentAudio.pause();
    }
    
    const audio = new Audio(audioUrl);
    setCurrentAudio(audio);
    audio.play();
    
    // Mark audio hint as used
    if (!usedHints.has(3)) {
      setUsedHints(prev => new Set([...prev, 3]));
      onHintUsed?.(3);
    }
  };

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
    }
  ].slice(0, maxHints > 2 ? 2 : maxHints);

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
    .reduce((sum, h) => sum + h.penalty, 0) + (usedHints.has(3) ? 15 : 0);

  return (
    <div className="w-full">
      {/* Audio Source Selector - Always visible when enabled */}
      {showAudioSourceSelector && maxHints >= 3 && (
        <div className="mb-3 p-3 bg-muted/50 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Ouvir Texto</span>
              <span className="text-xs text-muted-foreground">(-15%)</span>
            </div>
            <AudioSourceSelector
              text={text}
              exerciseId={exerciseId}
              lessonId={lessonId}
              moduleId={moduleId}
              onPlay={handlePlayFromSelector}
            />
          </div>
          {usedHints.has(3) && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <Mic className="w-3 h-3" /> Dica de áudio utilizada
            </p>
          )}
        </div>
      )}

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
                onClick={() => handleUseHint(hint.level)}
                className="w-full flex items-center justify-between p-3 text-left"
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
      {(usedHints.size > 0) && (
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
