import React from 'react';
import { cn } from '@/lib/utils';

interface ChallengeTimerProps {
  timeRemaining: number;
  totalTime: number;
}

export const ChallengeTimer: React.FC<ChallengeTimerProps> = ({
  timeRemaining,
  totalTime,
}) => {
  const percentage = (timeRemaining / totalTime) * 100;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  const getTimerColor = () => {
    if (percentage > 50) return 'text-green-500';
    if (percentage > 25) return 'text-yellow-500';
    if (percentage > 10) return 'text-orange-500';
    return 'text-red-500';
  };

  const getCircleColor = () => {
    if (percentage > 50) return 'stroke-green-500';
    if (percentage > 25) return 'stroke-yellow-500';
    if (percentage > 10) return 'stroke-orange-500';
    return 'stroke-red-500';
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted/20"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className={cn('transition-all duration-1000', getCircleColor())}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
          }}
        />
      </svg>
      <div className={cn(
        'absolute flex flex-col items-center justify-center transition-colors duration-300',
        getTimerColor(),
        percentage <= 10 && 'animate-pulse'
      )}>
        <span className="text-3xl font-bold tabular-nums">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  );
};
