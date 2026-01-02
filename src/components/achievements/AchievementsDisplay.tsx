import { useAchievements, Achievement } from '@/hooks/useAchievements';
import { AchievementBadge } from './AchievementBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Flame, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const AchievementsDisplay = () => {
  const { achievements, loading, isUnlocked, getUnlockDate } = useAchievements();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Conquistas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const streakAchievements = achievements.filter(a => a.type === 'streak');
  const reviewAchievements = achievements.filter(a => a.type === 'reviews');

  const unlockedCount = achievements.filter(a => isUnlocked(a.key)).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Conquistas
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {unlockedCount} / {achievements.length} desbloqueadas
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="streak" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="streak" className="flex items-center gap-2">
              <Flame className="h-4 w-4" />
              Sequência
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Dias Totais
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="streak">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {streakAchievements.map((achievement) => (
                <AchievementBadge
                  key={achievement.key}
                  achievement={achievement}
                  unlocked={isUnlocked(achievement.key)}
                  unlockDate={getUnlockDate(achievement.key)}
                />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="reviews">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {reviewAchievements.map((achievement) => (
                <AchievementBadge
                  key={achievement.key}
                  achievement={achievement}
                  unlocked={isUnlocked(achievement.key)}
                  unlockDate={getUnlockDate(achievement.key)}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
