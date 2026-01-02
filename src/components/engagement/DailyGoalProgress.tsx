import React from 'react';
import { Target, CheckCircle2, Flame, Sparkles } from 'lucide-react';
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
    return <div className="animate-pulse bg-muted rounded-2xl h-32" />;
  }

  // No goal set - show goal picker
  if (!goal) {
    return (
      <div className="group relative bg-card rounded-2xl p-6 border border-border shadow-soft hover:shadow-elevated transition-all duration-300 overflow-hidden">
        {/* Background glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-forest-600 flex items-center justify-center shadow-forest group-hover:scale-110 transition-transform duration-300">
              <Target className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">Meta Diária</span>
              <h3 className="font-bold text-foreground">Defina sua Meta</h3>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {GOAL_PRESETS.map((preset) => (
              <Button
                key={preset.type}
                variant="outline"
                size="sm"
                onClick={() => setDailyGoal(preset)}
                className="flex flex-col h-auto py-3 hover:bg-primary/10 hover:border-primary hover:scale-105 transition-all duration-200"
              >
                <span className="font-bold text-sm">{preset.label}</span>
                <span className="text-xs text-muted-foreground">{preset.target} itens</span>
                <span className="text-xs text-primary font-semibold">+{preset.xpReward} XP</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const progress = getProgressPercentage();
  const isCompleted = goal.completed_at !== null;
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3 hover:shadow-soft transition-all duration-200">
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
    <div className={cn(
      "group relative bg-card rounded-2xl p-6 border shadow-soft hover:shadow-elevated transition-all duration-300 overflow-hidden",
      isCompleted ? "border-green-500/50" : "border-border"
    )}>
      {/* Background effects */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-500",
        isCompleted 
          ? "bg-gradient-to-br from-green-500/10 via-transparent to-green-500/5" 
          : "bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100"
      )} />
      
      {/* Celebration particles for completed goal */}
      {isCompleted && (
        <div className="absolute top-2 right-2">
          <Sparkles className="w-5 h-5 text-green-500 animate-pulse" />
        </div>
      )}
      
      <div className="relative z-10">
        <div className="flex items-center gap-4">
          {/* Circular progress with icon */}
          <div className="relative w-20 h-20 flex-shrink-0">
            {/* Icon container */}
            <div className={cn(
              "absolute inset-0 flex items-center justify-center z-10 transition-transform duration-300",
              !isCompleted && "group-hover:scale-110"
            )}>
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
                isCompleted 
                  ? "bg-gradient-to-br from-green-500 to-green-600" 
                  : "bg-gradient-to-br from-primary to-forest-600"
              )}>
                {isCompleted ? (
                  <CheckCircle2 className="w-6 h-6 text-white" />
                ) : (
                  <Target className="w-6 h-6 text-primary-foreground" />
                )}
              </div>
            </div>
            
            {/* Progress ring */}
            <svg className="w-20 h-20 -rotate-90 absolute inset-0">
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-muted/50"
              />
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="url(#progressGradient)"
                strokeWidth="4"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-700 ease-out"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={isCompleted ? "#22c55e" : "hsl(145, 45%, 35%)"} />
                  <stop offset="100%" stopColor={isCompleted ? "#16a34a" : "hsl(42, 75%, 55%)"} />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Details */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                "text-xs font-semibold uppercase tracking-wide",
                isCompleted ? "text-green-500" : "text-primary"
              )}>
                {isCompleted ? "Meta Concluída!" : "Meta Diária"}
              </span>
            </div>
            
            <p className="text-3xl font-extrabold tracking-tight text-foreground">
              {goal.current_value}
              <span className="text-muted-foreground text-xl font-medium">/{goal.target_value}</span>
            </p>
            <p className="text-sm text-muted-foreground">itens revisados</p>
            
            {!isCompleted && (
              <div className="flex items-center gap-1.5 mt-2">
                <Flame className="h-4 w-4 text-amber-500 animate-pulse" />
                <span className="text-sm text-amber-500 font-semibold">
                  +{goal.xp_reward} XP ao completar
                </span>
              </div>
            )}
            
            {isCompleted && (
              <div className="flex items-center gap-1.5 mt-2">
                <Sparkles className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-500 font-semibold">
                  +{goal.xp_reward} XP ganhos! 🎉
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
