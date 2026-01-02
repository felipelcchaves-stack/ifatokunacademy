import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Lock } from 'lucide-react';
import { useAchievements, ACHIEVEMENTS } from '@/hooks/useAchievements';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export const CompactAchievements: React.FC = () => {
  const navigate = useNavigate();
  const { unlockedAchievements, loading, isUnlocked, checkAllAchievements } = useAchievements();

  React.useEffect(() => {
    checkAllAchievements();
  }, []);

  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-border shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex gap-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="w-12 h-12 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const unlockedCount = unlockedAchievements.length;
  const totalCount = ACHIEVEMENTS.length;

  // Get recently unlocked (last 5)
  const recentlyUnlocked = [...unlockedAchievements]
    .sort((a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime())
    .slice(0, 5)
    .map(ua => ACHIEVEMENTS.find(a => a.key === ua.achievement_key))
    .filter(Boolean);

  // Get next achievements to unlock (closest to being achieved)
  const lockedAchievements = ACHIEVEMENTS.filter(a => !isUnlocked(a.key));
  const nextToUnlock = lockedAchievements.slice(0, 3);

  return (
    <div className="bg-card rounded-2xl p-6 border border-border shadow-soft hover:shadow-elevated transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <div>
            <h3 className="font-bold text-foreground">Conquistas</h3>
            <p className="text-sm text-muted-foreground">
              {unlockedCount} de {totalCount} desbloqueadas
            </p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/achievements')}
          className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          Ver todas
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full mb-5 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
          style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
        />
      </div>

      {/* Recently unlocked */}
      {recentlyUnlocked.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Recentes
          </p>
          <div className="flex flex-wrap gap-2">
            {recentlyUnlocked.map(achievement => (
              <div
                key={achievement!.key}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20"
                title={achievement!.description}
              >
                <span className="text-lg">{achievement!.icon}</span>
                <span className="text-sm font-medium text-foreground">{achievement!.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next to unlock */}
      {nextToUnlock.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Próximas conquistas
          </p>
          <div className="space-y-2">
            {nextToUnlock.map(achievement => (
              <div
                key={achievement.key}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-xl",
                  "bg-muted/50 border border-border/50"
                )}
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground truncate">
                    {achievement.name}
                  </p>
                  <p className="text-xs text-muted-foreground/70 truncate">
                    {achievement.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
