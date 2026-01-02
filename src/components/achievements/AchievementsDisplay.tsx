import React, { useEffect } from 'react';
import { useAchievements, Achievement } from '@/hooks/useAchievements';
import { AchievementBadge } from './AchievementBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Flame, Calendar, Brain, BookOpen, Target } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const AchievementsDisplay = () => {
  const { achievements, loading, isUnlocked, getUnlockDate, checkAllAchievements } = useAchievements();

  // Check achievements on mount
  useEffect(() => {
    checkAllAchievements();
  }, []);

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
  const itemsAchievements = achievements.filter(a => a.type === 'items');
  const modulesAchievements = achievements.filter(a => a.type === 'modules');
  const accuracyAchievements = achievements.filter(a => a.type === 'accuracy');

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
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="streak" className="flex items-center gap-1 text-xs sm:text-sm">
              <Flame className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Sequência</span>
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex items-center gap-1 text-xs sm:text-sm">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Dias</span>
            </TabsTrigger>
            <TabsTrigger value="items" className="flex items-center gap-1 text-xs sm:text-sm">
              <Brain className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Itens</span>
            </TabsTrigger>
            <TabsTrigger value="modules" className="flex items-center gap-1 text-xs sm:text-sm">
              <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Módulos</span>
            </TabsTrigger>
            <TabsTrigger value="accuracy" className="flex items-center gap-1 text-xs sm:text-sm">
              <Target className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Precisão</span>
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
          
          <TabsContent value="items">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {itemsAchievements.map((achievement) => (
                <AchievementBadge
                  key={achievement.key}
                  achievement={achievement}
                  unlocked={isUnlocked(achievement.key)}
                  unlockDate={getUnlockDate(achievement.key)}
                />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="modules">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {modulesAchievements.map((achievement) => (
                <AchievementBadge
                  key={achievement.key}
                  achievement={achievement}
                  unlocked={isUnlocked(achievement.key)}
                  unlockDate={getUnlockDate(achievement.key)}
                />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="accuracy">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {accuracyAchievements.map((achievement) => (
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
