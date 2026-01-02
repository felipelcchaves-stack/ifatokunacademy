import React, { useState, useEffect } from 'react';
import { Sparkles, Star, Crown } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useExperience } from '@/hooks/useExperience';
import { SPIRITUAL_LEVELS } from '@/data/yorubaProverbs';
import { cn } from '@/lib/utils';

interface XPDisplayProps {
  compact?: boolean;
  showAnimation?: boolean;
  xpGained?: number;
}

const getLevelIcon = (level: number) => {
  if (level >= 5) return Crown;
  if (level >= 3) return Star;
  return Sparkles;
};

const getLevelColor = (level: number) => {
  if (level >= 5) return 'text-yellow-500';
  if (level >= 4) return 'text-purple-500';
  if (level >= 3) return 'text-blue-500';
  if (level >= 2) return 'text-green-500';
  return 'text-primary';
};

export const XPDisplay: React.FC<XPDisplayProps> = ({ 
  compact = false, 
  showAnimation = false,
  xpGained 
}) => {
  const { experience, loading, getProgressToNextLevel, getXPForNextLevel } = useExperience();
  const [animatingXP, setAnimatingXP] = useState<number | null>(null);

  useEffect(() => {
    if (xpGained && xpGained > 0) {
      setAnimatingXP(xpGained);
      const timer = setTimeout(() => setAnimatingXP(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [xpGained]);

  if (loading || !experience) {
    return (
      <div className="animate-pulse bg-muted rounded-lg h-16" />
    );
  }

  const LevelIcon = getLevelIcon(experience.current_level);
  const levelColor = getLevelColor(experience.current_level);
  const progress = getProgressToNextLevel();
  const nextLevelXP = getXPForNextLevel();
  const currentLevelInfo = SPIRITUAL_LEVELS.find(l => l.level === experience.current_level);
  const nextLevelInfo = SPIRITUAL_LEVELS.find(l => l.level === experience.current_level + 1);

  if (compact) {
    return (
      <div className="flex items-center gap-2 bg-gradient-to-r from-primary/10 to-primary/5 rounded-full px-3 py-1.5 relative">
        <LevelIcon className={cn("h-4 w-4", levelColor)} />
        <span className="text-sm font-semibold text-primary">
          {experience.total_xp.toLocaleString()} XP
        </span>
        {animatingXP && (
          <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-sm font-bold text-green-500 animate-fade-in">
            +{animatingXP} XP
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-card to-card/80 border border-border rounded-xl p-4 relative overflow-hidden">
      {/* Animated XP gain */}
      {animatingXP && (
        <div className="absolute top-2 right-2 text-lg font-bold text-green-500 animate-bounce">
          +{animatingXP} XP
        </div>
      )}

      {/* Level badge */}
      <div className="flex items-center gap-3 mb-3">
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center",
          "bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/30"
        )}>
          <LevelIcon className={cn("h-6 w-6", levelColor)} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className={cn("font-bold text-lg", levelColor)}>
              {experience.level_name}
            </span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Nível {experience.current_level}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {currentLevelInfo?.description}
          </p>
        </div>
      </div>

      {/* XP Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-semibold">{experience.total_xp.toLocaleString()} XP</span>
          {nextLevelInfo && (
            <span className="text-muted-foreground">
              {nextLevelXP.toLocaleString()} XP para {nextLevelInfo.name}
            </span>
          )}
        </div>
        <Progress value={progress} className="h-2" />
        
        {experience.xp_multiplier > 1 && (
          <div className="flex items-center gap-1 text-xs text-amber-500">
            <Sparkles className="h-3 w-3" />
            <span>Bônus de sequência: {experience.xp_multiplier}x</span>
          </div>
        )}
      </div>
    </div>
  );
};
