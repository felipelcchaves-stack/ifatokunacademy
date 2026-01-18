import React from 'react';
import { Zap, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { StudyMode } from '@/hooks/useStudyMode';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StudyModeToggleProps {
  mode: StudyMode;
  onModeChange: (mode: StudyMode) => void;
  className?: string;
  compact?: boolean;
}

const StudyModeToggle: React.FC<StudyModeToggleProps> = ({
  mode,
  onModeChange,
  className,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onModeChange(mode === 'express' ? 'complete' : 'express')}
              className={cn(
                "h-8 px-2",
                mode === 'express' 
                  ? "text-amber-600 bg-amber-100 dark:bg-amber-900/30" 
                  : "text-muted-foreground"
              )}
            >
              {mode === 'express' ? (
                <Zap className="w-4 h-4" />
              ) : (
                <BookOpen className="w-4 h-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {mode === 'express' 
                ? 'Modo Express: 4-5 exercícios' 
                : 'Modo Completo: 7-9 exercícios'}
            </p>
            <p className="text-xs text-muted-foreground">
              Clique para alternar
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 p-1 rounded-lg bg-muted/50", className)}>
      <Button
        variant={mode === 'complete' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('complete')}
        className={cn(
          "flex items-center gap-2",
          mode === 'complete' && "gradient-gold text-secondary"
        )}
      >
        <BookOpen className="w-4 h-4" />
        <span>Completo</span>
        <span className="text-xs opacity-70">(~15min)</span>
      </Button>
      
      <Button
        variant={mode === 'express' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('express')}
        className={cn(
          "flex items-center gap-2",
          mode === 'express' && "bg-amber-500 hover:bg-amber-600 text-white"
        )}
      >
        <Zap className="w-4 h-4" />
        <span>Express</span>
        <span className="text-xs opacity-70">(~5min)</span>
      </Button>
    </div>
  );
};

export default StudyModeToggle;
