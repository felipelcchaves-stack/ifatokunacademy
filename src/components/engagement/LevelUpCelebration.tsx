import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Star, Sparkles } from 'lucide-react';
import { getRandomProverb, SPIRITUAL_LEVELS } from '@/data/yorubaProverbs';
import { cn } from '@/lib/utils';

interface LevelUpCelebrationProps {
  open: boolean;
  onClose: () => void;
  newLevel: typeof SPIRITUAL_LEVELS[0] | null;
}

export const LevelUpCelebration: React.FC<LevelUpCelebrationProps> = ({
  open,
  onClose,
  newLevel,
}) => {
  const [proverb] = useState(() => getRandomProverb('victory'));

  if (!newLevel) return null;

  const getLevelIcon = (level: number) => {
    if (level >= 5) return Crown;
    if (level >= 3) return Star;
    return Sparkles;
  };

  const getLevelGradient = (level: number) => {
    if (level >= 5) return 'from-yellow-400 via-amber-500 to-orange-600';
    if (level >= 4) return 'from-purple-400 via-purple-500 to-purple-600';
    if (level >= 3) return 'from-blue-400 via-blue-500 to-blue-600';
    if (level >= 2) return 'from-green-400 via-green-500 to-green-600';
    return 'from-primary via-primary to-primary';
  };

  const LevelIcon = getLevelIcon(newLevel.level);
  const gradient = getLevelGradient(newLevel.level);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md text-center border-none bg-transparent shadow-none">
        <div className="relative bg-gradient-to-br from-card via-card to-card/90 rounded-2xl p-8 border border-border overflow-hidden">
          {/* Animated background particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-primary/30 rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              />
            ))}
          </div>

          {/* Level up icon */}
          <div className="relative mb-6">
            <div className={cn(
              "w-24 h-24 mx-auto rounded-full flex items-center justify-center",
              "bg-gradient-to-br animate-pulse",
              gradient
            )}>
              <LevelIcon className="h-12 w-12 text-white" />
            </div>
            <div className="absolute -top-2 left-1/2 -translate-x-1/2">
              <span className="text-4xl">🎉</span>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Nível Alcançado!
          </h2>
          
          {/* Level name */}
          <div className={cn(
            "text-3xl font-bold mb-2 bg-gradient-to-r bg-clip-text text-transparent",
            gradient
          )}>
            {newLevel.name}
          </div>
          
          <p className="text-muted-foreground mb-6">
            {newLevel.description}
          </p>

          {/* Yoruba proverb */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6 border border-border">
            <p className="text-sm italic text-primary font-medium mb-1">
              "{proverb.yoruba}"
            </p>
            <p className="text-xs text-muted-foreground">
              {proverb.portuguese}
            </p>
          </div>

          {/* XP requirement */}
          <p className="text-sm text-muted-foreground mb-4">
            Você alcançou {newLevel.xpRequired.toLocaleString()} XP!
          </p>

          <Button 
            onClick={onClose}
            className={cn("w-full bg-gradient-to-r text-white", gradient)}
          >
            Continuar Jornada
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
