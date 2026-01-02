import { Achievement } from '@/hooks/useAchievements';
import { toast } from 'sonner';

export const showAchievementUnlockToast = (achievement: Achievement) => {
  toast.success(
    <div className="flex items-center gap-3">
      <span className="text-3xl">{achievement.icon}</span>
      <div>
        <p className="font-bold">Conquista Desbloqueada!</p>
        <p className="text-sm">{achievement.name}</p>
        <p className="text-xs text-muted-foreground">{achievement.description}</p>
      </div>
    </div>,
    {
      duration: 5000,
    }
  );
};
