import React from 'react';
import { Flame } from 'lucide-react';
import { StreakData } from '@/hooks/useStreak';
import { cn } from '@/lib/utils';

interface CompactStreakProps {
  streak: StreakData | null;
}

export const CompactStreak: React.FC<CompactStreakProps> = ({ streak }) => {
  const currentStreak = streak?.current_streak || 0;

  const getStreakStyle = () => {
    if (currentStreak >= 30) return { bg: 'bg-purple-500/15', text: 'text-purple-600', flame: 'text-purple-500' };
    if (currentStreak >= 14) return { bg: 'bg-accent/15', text: 'text-accent', flame: 'text-accent' };
    if (currentStreak >= 7) return { bg: 'bg-orange-500/15', text: 'text-orange-600', flame: 'text-orange-500' };
    if (currentStreak >= 3) return { bg: 'bg-red-500/15', text: 'text-red-500', flame: 'text-red-500' };
    return { bg: 'bg-muted', text: 'text-muted-foreground', flame: 'text-muted-foreground' };
  };

  const style = getStreakStyle();

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all",
      style.bg
    )}>
      <Flame className={cn(
        "w-4 h-4",
        style.flame,
        currentStreak > 0 && "animate-streak-flame"
      )} />
      <span className={cn("text-sm font-bold", style.text)}>
        {currentStreak}
      </span>
      <span className="text-xs text-muted-foreground hidden sm:inline">dias</span>
    </div>
  );
};
