import { Achievement } from '@/hooks/useAchievements';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AchievementBadgeProps {
  achievement: Achievement;
  unlocked: boolean;
  unlockDate?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

export const AchievementBadge = ({
  achievement,
  unlocked,
  unlockDate,
  size = 'md',
  showDetails = true,
}: AchievementBadgeProps) => {
  const sizeClasses = {
    sm: 'w-12 h-12 text-xl',
    md: 'w-16 h-16 text-2xl',
    lg: 'w-20 h-20 text-3xl',
  };

  return (
    <div className={cn(
      "flex flex-col items-center gap-2 p-3 rounded-lg transition-all",
      unlocked 
        ? "bg-primary/10 border border-primary/30" 
        : "bg-muted/50 border border-muted opacity-50"
    )}>
      <div className={cn(
        "rounded-full flex items-center justify-center",
        sizeClasses[size],
        unlocked 
          ? "bg-gradient-to-br from-primary/20 to-accent/20 shadow-lg" 
          : "bg-muted grayscale"
      )}>
        <span className={unlocked ? "" : "grayscale opacity-50"}>
          {achievement.icon}
        </span>
      </div>
      
      {showDetails && (
        <div className="text-center">
          <p className={cn(
            "font-medium text-sm",
            unlocked ? "text-foreground" : "text-muted-foreground"
          )}>
            {achievement.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {achievement.description}
          </p>
          {unlocked && unlockDate && (
            <p className="text-xs text-primary mt-1">
              Desbloqueado em {format(new Date(unlockDate), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
