import React from 'react';
import { Target, CheckCircle2, Flame } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useDailyGoal, GOAL_PRESETS } from '@/hooks/useDailyGoal';
import { cn } from '@/lib/utils';

interface DailyGoalProgressProps {
  compact?: boolean;
  onGoalComplete?: () => void;
}

export const DailyGoalProgress: React.FC<DailyGoalProgressProps> = ({ 
  compact = false,
  onGoalComplete 
}) => {
  const { goal, loading, setDailyGoal, getProgressPercentage } = useDailyGoal();

  if (loading) {
    return <div className="animate-pulse bg-muted rounded-lg h-24" />;
  }

  // No goal set - show goal picker
  if (!goal) {
    return (
      <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Defina sua Meta de Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {GOAL_PRESETS.map((preset) => (
              <Button
                key={preset.type}
                variant="outline"
                size="sm"
                onClick={() => setDailyGoal(preset)}
                className="flex flex-col h-auto py-2 hover:bg-primary/10 hover:border-primary"
              >
                <span className="font-semibold text-xs">{preset.label}</span>
                <span className="text-xs text-muted-foreground">{preset.target} itens</span>
                <span className="text-xs text-primary">+{preset.xpReward} XP</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const progress = getProgressPercentage();
  const isCompleted = goal.completed_at !== null;
  const circumference = 2 * Math.PI * 40; // radius = 40
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-card border border-border rounded-lg p-3">
        <div className="relative w-10 h-10">
          <svg className="w-10 h-10 -rotate-90">
            <circle
              cx="20"
              cy="20"
              r="16"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              className="text-muted"
            />
            <circle
              cx="20"
              cy="20"
              r="16"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              strokeDasharray={2 * Math.PI * 16}
              strokeDashoffset={2 * Math.PI * 16 - (progress / 100) * 2 * Math.PI * 16}
              className={cn(
                "transition-all duration-500",
                isCompleted ? "text-green-500" : "text-primary"
              )}
              strokeLinecap="round"
            />
          </svg>
          {isCompleted ? (
            <CheckCircle2 className="absolute inset-0 m-auto h-4 w-4 text-green-500" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
              {progress}%
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            Meta: {goal.current_value}/{goal.target_value}
          </p>
          <p className="text-xs text-muted-foreground">
            {isCompleted ? 'Concluída! 🎉' : `+${goal.xp_reward} XP ao completar`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300",
      isCompleted && "border-green-500/50 bg-green-500/5"
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {isCompleted ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-green-500">Meta Concluída!</span>
            </>
          ) : (
            <>
              <Target className="h-4 w-4 text-primary" />
              Meta de Hoje
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {/* Circular progress */}
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg className="w-20 h-20 -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                className="text-muted"
              />
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                strokeDasharray={2 * Math.PI * 36}
                strokeDashoffset={2 * Math.PI * 36 - (progress / 100) * 2 * Math.PI * 36}
                className={cn(
                  "transition-all duration-500",
                  isCompleted ? "text-green-500" : "text-primary"
                )}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {isCompleted ? (
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              ) : (
                <>
                  <span className="text-lg font-bold">{progress}%</span>
                </>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1">
            <p className="text-2xl font-bold">
              {goal.current_value}
              <span className="text-muted-foreground text-lg">/{goal.target_value}</span>
            </p>
            <p className="text-sm text-muted-foreground">itens revisados</p>
            
            {!isCompleted && (
              <div className="flex items-center gap-1 mt-2 text-xs">
                <Flame className="h-3 w-3 text-amber-500" />
                <span className="text-amber-500 font-medium">
                  +{goal.xp_reward} XP ao completar
                </span>
              </div>
            )}
            
            {isCompleted && (
              <p className="text-sm text-green-500 font-medium mt-2">
                +{goal.xp_reward} XP ganhos! 🎉
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
