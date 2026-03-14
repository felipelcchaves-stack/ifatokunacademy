import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Lock, User } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface UnlockInfoProps {
  unlockRule: 'sequential' | 'date_based' | 'manual' | 'always_unlocked';
  unlockDate?: string | null;
  unlockRequirement?: string;
  /** Progress of the prerequisite (0-100), used for sequential */
  prerequisiteProgress?: number;
  /** Compact mode for LessonCard */
  compact?: boolean;
  /** Light text for overlay on dark backgrounds */
  lightText?: boolean;
}

const formatCountdown = (targetDate: Date): string => {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();
  
  if (diff <= 0) return 'Disponível agora!';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}min`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}min ${seconds}s`;
  }
  return `${minutes}min ${seconds}s`;
};

const UnlockInfo: React.FC<UnlockInfoProps> = ({
  unlockRule,
  unlockDate,
  unlockRequirement,
  prerequisiteProgress,
  compact = false,
  lightText = false,
}) => {
  const [countdown, setCountdown] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (unlockRule !== 'date_based' || !unlockDate) return;

    const target = new Date(unlockDate);
    
    const updateCountdown = () => {
      const now = new Date();
      if (now >= target) {
        setIsExpired(true);
        setCountdown('Disponível agora!');
        return;
      }
      setCountdown(formatCountdown(target));
    };

    updateCountdown();

    // Use faster interval when < 24h
    const diff = target.getTime() - Date.now();
    const intervalMs = diff < 24 * 60 * 60 * 1000 ? 1000 : 60000;

    const timer: ReturnType<typeof setInterval> = setInterval(() => {
      updateCountdown();
      if (new Date() >= target) {
        clearInterval(timer);
        window.location.reload();
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [unlockRule, unlockDate]);

  if (unlockRule === 'always_unlocked') return null;

  const textColor = lightText ? 'text-white/90' : 'text-muted-foreground';
  const subtextColor = lightText ? 'text-white/70' : 'text-muted-foreground/80';
  const iconColor = lightText ? 'text-white/80' : 'text-amber-500';

  // DATE-BASED
  if (unlockRule === 'date_based' && unlockDate) {
    if (isExpired) return null;

    const target = new Date(unlockDate);
    const totalDuration = target.getTime() - (target.getTime() - 30 * 24 * 60 * 60 * 1000); // rough
    const remaining = target.getTime() - Date.now();
    const progressPercent = Math.max(0, Math.min(100, 100 - (remaining / (30 * 24 * 60 * 60 * 1000)) * 100));

    if (compact) {
      return (
        <div className="flex items-center gap-2 mt-1">
          <Calendar className={cn("w-3.5 h-3.5 flex-shrink-0", iconColor)} />
          <span className={cn("text-xs font-medium", textColor)}>
            Libera em {countdown}
          </span>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-2 mt-2">
        <div className="flex items-center gap-2">
          <Calendar className={cn("w-4 h-4", iconColor)} />
          <span className={cn("text-sm font-medium", textColor)}>
            Libera em {countdown}
          </span>
        </div>
        <div className="w-full max-w-[200px]">
          <Progress 
            value={progressPercent} 
            className={cn("h-1.5", lightText ? "bg-white/20" : "bg-muted")} 
          />
        </div>
        <span className={cn("text-xs", subtextColor)}>
          {target.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </span>
      </div>
    );
  }

  // SEQUENTIAL
  if (unlockRule === 'sequential') {
    const message = unlockRequirement || 'Complete o módulo anterior para desbloquear';

    if (compact) {
      return (
        <div className="mt-1 space-y-1">
          <span className={cn("text-xs", textColor)}>
            {message}
          </span>
          {prerequisiteProgress !== undefined && prerequisiteProgress > 0 && (
            <div className="flex items-center gap-2">
              <Progress value={prerequisiteProgress} className="h-1 flex-1" />
              <span className={cn("text-xs font-medium", textColor)}>{prerequisiteProgress}%</span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-2 mt-2">
        <span className={cn("text-sm text-center", textColor)}>
          {message}
        </span>
        {prerequisiteProgress !== undefined && prerequisiteProgress > 0 && (
          <div className="w-full max-w-[200px] flex items-center gap-2">
            <Progress value={prerequisiteProgress} className={cn("h-1.5 flex-1", lightText ? "bg-white/20" : "")} />
            <span className={cn("text-xs font-medium", textColor)}>{prerequisiteProgress}%</span>
          </div>
        )}
      </div>
    );
  }

  // MANUAL
  if (unlockRule === 'manual') {
    if (compact) {
      return (
        <div className="flex items-center gap-2 mt-1">
          <User className={cn("w-3.5 h-3.5 flex-shrink-0", iconColor)} />
          <span className={cn("text-xs", textColor)}>
            Aguardando liberação
          </span>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-2 mt-2">
        <div className="flex items-center gap-2">
          <User className={cn("w-4 h-4", iconColor)} />
          <span className={cn("text-sm", textColor)}>
            Aguardando liberação pelo professor
          </span>
        </div>
      </div>
    );
  }

  return null;
};

export default UnlockInfo;
