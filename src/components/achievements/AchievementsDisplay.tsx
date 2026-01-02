import React, { useEffect } from 'react';
import { useAchievements, Achievement } from '@/hooks/useAchievements';
import { AchievementBadge } from './AchievementBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Flame, Calendar, Brain, BookOpen, Target, Sparkles, Gamepad2, Map, Clock, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export const AchievementsDisplay = () => {
  const { visibleAchievements, loading, isUnlocked, getUnlockDate, checkAllAchievements, achievements } = useAchievements();

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

  // Filter by category using visible achievements (respects secret logic)
  const streakAchievements = visibleAchievements.filter(a => a.type === 'streak');
  const reviewAchievements = visibleAchievements.filter(a => a.type === 'reviews');
  const itemsAchievements = visibleAchievements.filter(a => a.type === 'items');
  const modulesAchievements = visibleAchievements.filter(a => a.type === 'modules' || a.type === 'journey');
  const accuracyAchievements = visibleAchievements.filter(a => a.type === 'accuracy' || a.type === 'mastery');
  const xpAchievements = visibleAchievements.filter(a => a.type === 'xp' || a.type === 'level');
  const challengeAchievements = visibleAchievements.filter(a => a.type === 'challenge');
  const explorationAchievements = visibleAchievements.filter(a => a.type === 'exploration' || a.type === 'time' || a.type === 'retention');
  const secretAchievements = visibleAchievements.filter(a => a.type === 'secret');

  const unlockedCount = achievements.filter(a => isUnlocked(a.key)).length;
  const totalCount = achievements.length;

  const renderAchievementGrid = (achievementList: Achievement[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {achievementList.map((achievement) => (
        <AchievementBadge
          key={achievement.key}
          achievement={achievement}
          unlocked={isUnlocked(achievement.key)}
          unlockDate={getUnlockDate(achievement.key)}
        />
      ))}
    </div>
  );

  const tabs = [
    { value: 'streak', label: 'Sequência', icon: Flame, achievements: streakAchievements },
    { value: 'xp', label: 'XP & Níveis', icon: Sparkles, achievements: xpAchievements },
    { value: 'items', label: 'Itens', icon: Brain, achievements: itemsAchievements },
    { value: 'modules', label: 'Módulos', icon: BookOpen, achievements: modulesAchievements },
    { value: 'accuracy', label: 'Maestria', icon: Target, achievements: accuracyAchievements },
    { value: 'challenge', label: 'Desafios', icon: Gamepad2, achievements: challengeAchievements },
    { value: 'exploration', label: 'Exploração', icon: Map, achievements: explorationAchievements },
    { value: 'reviews', label: 'Dedicação', icon: Calendar, achievements: reviewAchievements },
  ];

  // Add secret tab only if user has unlocked any secret achievement
  if (secretAchievements.length > 0) {
    tabs.push({ value: 'secret', label: 'Secretas', icon: Star, achievements: secretAchievements });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Conquistas
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {unlockedCount} / {totalCount} desbloqueadas
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="streak" className="w-full">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex w-max gap-1 mb-4">
              {tabs.map(tab => (
                <TabsTrigger 
                  key={tab.value} 
                  value={tab.value} 
                  className="flex items-center gap-1.5 px-3 py-2"
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="text-xs sm:text-sm">{tab.label}</span>
                  <span className="text-xs text-muted-foreground ml-1">
                    ({tab.achievements.filter(a => isUnlocked(a.key)).length}/{tab.achievements.length})
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          
          {tabs.map(tab => (
            <TabsContent key={tab.value} value={tab.value}>
              {tab.achievements.length > 0 ? (
                renderAchievementGrid(tab.achievements)
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <tab.icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma conquista disponível nesta categoria ainda.</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};
