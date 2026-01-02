import React from 'react';
import { Flame, Trophy, Calendar, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StreakData } from '@/hooks/useStreak';

interface StreakDisplayProps {
  streak: StreakData | null;
  compact?: boolean;
}

const StreakDisplay: React.FC<StreakDisplayProps> = ({ streak, compact = false }) => {
  const currentStreak = streak?.current_streak || 0;
  const longestStreak = streak?.longest_streak || 0;
  const totalDays = streak?.total_review_days || 0;
  
  // Get streak level for visual feedback
  const getStreakLevel = () => {
    if (currentStreak >= 30) return { color: 'text-purple-500', bg: 'bg-purple-100', label: 'Lendário' };
    if (currentStreak >= 14) return { color: 'text-amber-500', bg: 'bg-amber-100', label: 'Incrível' };
    if (currentStreak >= 7) return { color: 'text-orange-500', bg: 'bg-orange-100', label: 'Ótimo' };
    if (currentStreak >= 3) return { color: 'text-red-400', bg: 'bg-red-100', label: 'Bom' };
    return { color: 'text-muted-foreground', bg: 'bg-muted', label: 'Iniciante' };
  };

  const level = getStreakLevel();

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${level.bg}`}>
        <Flame className={`w-4 h-4 ${level.color}`} />
        <span className={`text-sm font-bold ${level.color}`}>{currentStreak}</span>
        <span className="text-xs text-muted-foreground">dias</span>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Main Streak Display */}
        <div className={`p-6 text-center ${level.bg}`}>
          <div className="relative inline-block">
            <div className={`w-20 h-20 rounded-full ${level.bg} border-4 border-white dark:border-card flex items-center justify-center mx-auto shadow-lg`}>
              <Flame className={`w-10 h-10 ${level.color} ${currentStreak > 0 ? 'animate-pulse' : ''}`} />
            </div>
            {currentStreak > 0 && (
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white dark:bg-card shadow flex items-center justify-center">
                <span className={`text-sm font-bold ${level.color}`}>{currentStreak}</span>
              </div>
            )}
          </div>
          <h3 className="font-serif text-2xl font-bold mt-4">{currentStreak} dias</h3>
          <p className={`text-sm ${level.color} font-medium`}>{level.label}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-border p-4 bg-card">
          <div className="text-center px-2">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Trophy className="w-4 h-4 text-yellow-500" />
            </div>
            <p className="text-lg font-bold">{longestStreak}</p>
            <p className="text-xs text-muted-foreground">Recorde</p>
          </div>
          <div className="text-center px-2">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Calendar className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-lg font-bold">{totalDays}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="text-center px-2">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-lg font-bold">{Math.max(0, 7 - (currentStreak % 7))}</p>
            <p className="text-xs text-muted-foreground">P/ Meta</p>
          </div>
        </div>

        {/* Motivational Message */}
        <div className="p-4 bg-muted/30 text-center border-t border-border">
          <p className="text-sm text-muted-foreground">
            {currentStreak === 0 && '🌱 Comece sua sequência hoje!'}
            {currentStreak === 1 && '🔥 Ótimo começo! Continue amanhã!'}
            {currentStreak >= 2 && currentStreak < 7 && `🔥 ${7 - currentStreak} dias para sua primeira semana!`}
            {currentStreak === 7 && '🎉 Uma semana completa! Você é incrível!'}
            {currentStreak > 7 && currentStreak < 14 && `💪 ${14 - currentStreak} dias para 2 semanas seguidas!`}
            {currentStreak >= 14 && currentStreak < 30 && `⭐ ${30 - currentStreak} dias para 1 mês completo!`}
            {currentStreak >= 30 && '🏆 Você é uma lenda! Continue assim!'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default StreakDisplay;
