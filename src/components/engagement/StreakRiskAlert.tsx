import React from 'react';
import { AlertTriangle, Flame, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useStreak } from '@/hooks/useStreak';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export const StreakRiskAlert: React.FC = () => {
  const { streak, loading } = useStreak();
  const navigate = useNavigate();

  if (loading || !streak) return null;

  // Check if user has a streak worth protecting and hasn't reviewed today
  const today = new Date().toISOString().split('T')[0];
  const hasNotReviewedToday = streak.last_review_date !== today;
  const hasStreakToProtect = streak.current_streak >= 3;

  if (!hasNotReviewedToday || !hasStreakToProtect) return null;

  const getUrgencyLevel = (streakDays: number) => {
    if (streakDays >= 30) return 'critical';
    if (streakDays >= 14) return 'high';
    if (streakDays >= 7) return 'medium';
    return 'low';
  };

  const urgency = getUrgencyLevel(streak.current_streak);

  const urgencyStyles = {
    critical: 'border-red-500/50 bg-red-500/10',
    high: 'border-orange-500/50 bg-orange-500/10',
    medium: 'border-amber-500/50 bg-amber-500/10',
    low: 'border-yellow-500/50 bg-yellow-500/10',
  };

  const urgencyColors = {
    critical: 'text-red-500',
    high: 'text-orange-500',
    medium: 'text-amber-500',
    low: 'text-yellow-500',
  };

  return (
    <Alert className={cn("relative overflow-hidden", urgencyStyles[urgency])}>
      {/* Animated flame effect for critical */}
      {urgency === 'critical' && (
        <div className="absolute top-0 right-0 opacity-20">
          <Flame className="h-16 w-16 text-red-500 animate-pulse" />
        </div>
      )}

      <AlertTriangle className={cn("h-4 w-4", urgencyColors[urgency])} />
      <AlertTitle className={cn("font-bold", urgencyColors[urgency])}>
        {urgency === 'critical' && '🔥 Sequência em Perigo Crítico!'}
        {urgency === 'high' && '⚠️ Sua Sequência Precisa de Você!'}
        {urgency === 'medium' && '📚 Não Esqueça de Estudar Hoje!'}
        {urgency === 'low' && '💡 Continue Sua Jornada!'}
      </AlertTitle>
      <AlertDescription className="mt-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm">
              Sua sequência de <span className={cn("font-bold", urgencyColors[urgency])}>
                {streak.current_streak} dias
              </span> está em risco!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {urgency === 'critical' && 'Você está prestes a perder uma sequência incrível!'}
              {urgency === 'high' && 'Uma pequena revisão pode salvar seu progresso.'}
              {urgency === 'medium' && 'Apenas alguns minutos de estudo fazem a diferença.'}
              {urgency === 'low' && 'Mantenha o ritmo, você está indo bem!'}
            </p>
          </div>
          <Button 
            size="sm"
            onClick={() => navigate('/review')}
            className={cn(
              "shrink-0 gap-1",
              urgency === 'critical' && "bg-red-500 hover:bg-red-600",
              urgency === 'high' && "bg-orange-500 hover:bg-orange-600",
              urgency === 'medium' && "bg-amber-500 hover:bg-amber-600",
              urgency === 'low' && "bg-yellow-500 hover:bg-yellow-600",
            )}
          >
            Revisar Agora
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
