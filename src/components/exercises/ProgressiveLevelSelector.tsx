import React from 'react';
import { Volume2, Bot, User, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface AudioSource {
  id: string;
  url: string;
  label: string;
  type: 'ai' | 'master' | 'recording';
  createdAt?: string;
}

interface ProgressiveLevelSelectorProps {
  currentLevel: 1 | 2 | 3;
  levelsMastered: Record<1 | 2 | 3, boolean>;
  wordCounts: { level1: number; level2: number; level3: number };
}

export const ProgressiveLevelIndicator: React.FC<ProgressiveLevelSelectorProps> = ({
  currentLevel,
  levelsMastered,
  wordCounts
}) => {
  const levels = [
    { level: 1 as const, label: 'Resumo', words: wordCounts.level1 },
    { level: 2 as const, label: 'Intermediário', words: wordCounts.level2 },
    { level: 3 as const, label: 'Completo', words: wordCounts.level3 },
  ];

  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {levels.map((item, index) => (
        <React.Fragment key={item.level}>
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                levelsMastered[item.level]
                  ? "bg-green-500 text-white"
                  : currentLevel === item.level
                  ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {levelsMastered[item.level] ? '✓' : item.level}
            </div>
            <span className={cn(
              "text-xs",
              currentLevel === item.level ? "text-primary font-medium" : "text-muted-foreground"
            )}>
              {item.label}
            </span>
            <span className="text-xs text-muted-foreground/70">
              {item.words} palavras
            </span>
          </div>
          {index < levels.length - 1 && (
            <div className={cn(
              "w-8 h-0.5 mb-8",
              levelsMastered[item.level] ? "bg-green-500" : "bg-border"
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

interface AudioSourceSelectorProps {
  audioSources: AudioSource[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPlay: (source: AudioSource) => void;
  isLoading?: boolean;
}

export const AudioSourceSelector: React.FC<AudioSourceSelectorProps> = ({
  audioSources,
  selectedId,
  onSelect,
  onPlay,
  isLoading = false
}) => {
  if (!audioSources || audioSources.length === 0) {
    return null;
  }

  const getIcon = (type: AudioSource['type']) => {
    switch (type) {
      case 'ai':
        return <Bot className="w-3.5 h-3.5" />;
      case 'master':
        return <User className="w-3.5 h-3.5" />;
      case 'recording':
        return <Mic className="w-3.5 h-3.5" />;
    }
  };

  const getTypeLabel = (type: AudioSource['type']) => {
    switch (type) {
      case 'ai':
        return 'IA';
      case 'master':
        return 'Mestre';
      case 'recording':
        return 'Gravação';
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Volume2 className="w-3.5 h-3.5" />
        Ouvir:
      </span>
      {audioSources.map((source) => (
        <Button
          key={source.id}
          variant={selectedId === source.id ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => {
            onSelect(source.id);
            onPlay(source);
          }}
          disabled={isLoading}
        >
          {getIcon(source.type)}
          {source.label || getTypeLabel(source.type)}
        </Button>
      ))}
    </div>
  );
};

export default ProgressiveLevelIndicator;
