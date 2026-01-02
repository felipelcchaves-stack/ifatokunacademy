import React from 'react';
import { Sparkles, Star, Crown } from 'lucide-react';
import { useExperience } from '@/hooks/useExperience';
import { cn } from '@/lib/utils';

export const CompactXP: React.FC = () => {
  const { experience, loading } = useExperience();

  if (loading || !experience) {
    return (
      <div className="w-20 h-7 bg-muted animate-pulse rounded-full" />
    );
  }

  const getLevelIcon = () => {
    if (experience.current_level >= 5) return Crown;
    if (experience.current_level >= 3) return Star;
    return Sparkles;
  };

  const LevelIcon = getLevelIcon();

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 transition-all hover:bg-primary/15">
      <LevelIcon className="w-4 h-4 text-primary animate-glow-sacred" />
      <span className="text-sm font-bold text-primary">
        {experience.total_xp.toLocaleString()}
      </span>
      <span className="text-xs text-muted-foreground hidden sm:inline">XP</span>
    </div>
  );
};
