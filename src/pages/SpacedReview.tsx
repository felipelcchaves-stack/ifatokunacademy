import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Brain, 
  Calendar, 
  CheckCircle, 
  ChevronRight, 
  Clock, 
  RotateCcw,
  Send,
  Trophy,
  XCircle,
  AlertCircle,
  BarChart3,
  Flame,
  Filter,
  TrendingUp,
  Layers,
  BookOpen,
  Target,
  Zap,
  Star,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ContentProtection from '@/components/ContentProtection';
import OfflineIndicator from '@/components/OfflineIndicator';
import StreakDisplay from '@/components/streak/StreakDisplay';
import { useSpacedRepetition, SpacedRepetitionItem } from '@/hooks/useSpacedRepetition';
import { useStreak } from '@/hooks/useStreak';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useAchievements } from '@/hooks/useAchievements';
import { useAchievementTriggers } from '@/hooks/useAchievementTriggers';
import { showAchievementUnlockToast } from '@/components/achievements/AchievementUnlockToast';
import { calculateSimilarity, getTextStart, getTextRemainder } from '@/lib/textSimilarity';
import { formatDistanceToNow, format, differenceInDays, startOfDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const SIMILARITY_THRESHOLD = 80;
const START_WORD_COUNT = 4;

interface ModuleInfo {
  id: string;
  title: string;
}

interface LessonInfo {
  id: string;
  title: string;
  module_id: string;
}

const SpacedReview: React.FC = () => {
  const navigate = useNavigate();
  const { dueItems, allItems, loading, dueCount, recordReview, removeItem, refreshItems } = useSpacedRepetition();
  const { streak, recordDailyReview } = useStreak();
  const { checkAndUnlockAchievements } = useAchievements();
  const { onReviewComplete, onStudySessionStart } = useAchievementTriggers();
  const { isOnline, isSyncing, pendingCount } = useOfflineSync();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<{ similarity: number; correct: boolean } | null>(null);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [streakRecorded, setStreakRecorded] = useState(false);
  const [activeTab, setActiveTab] = useState<'review' | 'overview'>('overview');
  const [modules, setModules] = useState<Record<string, ModuleInfo>>({});
  const [lessons, setLessons] = useState<Record<string, LessonInfo>>({});
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const currentItem = dueItems[currentIndex];
  const isSessionComplete = currentIndex >= dueItems.length || dueItems.length === 0;

  // Fetch module and lesson info
  useEffect(() => {
    const fetchRelatedInfo = async () => {
      const moduleIds = [...new Set(allItems.filter(i => i.module_id).map(i => i.module_id!))];
      const lessonIds = [...new Set(allItems.filter(i => i.lesson_id).map(i => i.lesson_id!))];
      
      if (moduleIds.length > 0) {
        const { data: modulesData } = await supabase
          .from('modules')
          .select('id, title')
          .in('id', moduleIds);
        
        if (modulesData) {
          const modulesMap: Record<string, ModuleInfo> = {};
          modulesData.forEach(m => { modulesMap[m.id] = m; });
          setModules(modulesMap);
        }
      }

      if (lessonIds.length > 0) {
        const { data: lessonsData } = await supabase
          .from('lessons')
          .select('id, title, module_id')
          .in('id', lessonIds);
        
        if (lessonsData) {
          const lessonsMap: Record<string, LessonInfo> = {};
          lessonsData.forEach(l => { lessonsMap[l.id] = l; });
          setLessons(lessonsMap);
        }
      }
    };

    if (allItems.length > 0) {
      fetchRelatedInfo();
    }
  }, [allItems]);

  // Calculate detailed statistics
  const statistics = useMemo(() => {
    if (allItems.length === 0) {
      return {
        totalItems: 0,
        dueNow: 0,
        masteredItems: 0,
        averageAccuracy: 0,
        totalReviews: 0,
        retentionRate: 0,
        itemsByDifficulty: { easy: 0, medium: 0, hard: 0 },
        upcomingByDay: [] as { date: Date; count: number }[],
        byModule: {} as Record<string, { total: number; due: number; mastered: number }>
      };
    }

    const now = new Date();
    const masteredItems = allItems.filter(i => i.repetitions >= 3 && i.ease_factor >= 2.0);
    const totalReviews = allItems.reduce((sum, i) => sum + i.total_reviews, 0);
    const totalCorrect = allItems.reduce((sum, i) => sum + i.correct_reviews, 0);
    
    // Items by difficulty (based on ease factor)
    const itemsByDifficulty = {
      easy: allItems.filter(i => i.ease_factor >= 2.3).length,
      medium: allItems.filter(i => i.ease_factor >= 1.8 && i.ease_factor < 2.3).length,
      hard: allItems.filter(i => i.ease_factor < 1.8).length,
    };

    // Upcoming reviews by day (next 7 days)
    const upcomingByDay: { date: Date; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const targetDate = startOfDay(addDays(now, i));
      const nextDate = startOfDay(addDays(now, i + 1));
      const count = allItems.filter(item => {
        const reviewDate = new Date(item.next_review_at);
        return reviewDate >= targetDate && reviewDate < nextDate;
      }).length;
      upcomingByDay.push({ date: targetDate, count });
    }

    // Group by module
    const byModule: Record<string, { total: number; due: number; mastered: number }> = {};
    allItems.forEach(item => {
      const moduleId = item.module_id || 'unknown';
      if (!byModule[moduleId]) {
        byModule[moduleId] = { total: 0, due: 0, mastered: 0 };
      }
      byModule[moduleId].total++;
      if (new Date(item.next_review_at) <= now) {
        byModule[moduleId].due++;
      }
      if (item.repetitions >= 3 && item.ease_factor >= 2.0) {
        byModule[moduleId].mastered++;
      }
    });

    return {
      totalItems: allItems.length,
      dueNow: dueCount,
      masteredItems: masteredItems.length,
      averageAccuracy: totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0,
      totalReviews,
      retentionRate: allItems.length > 0 ? Math.round((masteredItems.length / allItems.length) * 100) : 0,
      itemsByDifficulty,
      upcomingByDay,
      byModule,
    };
  }, [allItems, dueCount]);

  // Group items by module for display
  const itemsByModule = useMemo(() => {
    const grouped: Record<string, SpacedRepetitionItem[]> = {};
    allItems.forEach(item => {
      const moduleId = item.module_id || 'unknown';
      if (!grouped[moduleId]) {
        grouped[moduleId] = [];
      }
      grouped[moduleId].push(item);
    });
    return grouped;
  }, [allItems]);

  const handleVerify = async () => {
    if (!currentItem || !userInput.trim()) return;

    const expectedText = getTextRemainder(currentItem.item_text, START_WORD_COUNT);
    const similarity = calculateSimilarity(expectedText, userInput);
    const isCorrect = similarity >= SIMILARITY_THRESHOLD;

    setLastResult({ similarity, correct: isCorrect });
    setShowResult(true);

    await recordReview(currentItem.id, isCorrect);
    setReviewedCount(prev => prev + 1);
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
    }

    // Check time-based achievements on first review
    if (!streakRecorded) {
      onStudySessionStart();
    }

    // Record daily streak on first review
    if (!streakRecorded) {
      const recorded = await recordDailyReview();
      if (recorded) {
        setStreakRecorded(true);
        const newStreak = (streak?.current_streak || 0) + 1;
        const newTotalDays = (streak?.total_review_days || 0) + 1;
        
        toast.success('🔥 Sequência atualizada!', {
          description: `Você está em uma sequência de ${newStreak} dias!`,
        });

        const newAchievements = await checkAndUnlockAchievements({
          currentStreak: newStreak,
          totalDays: newTotalDays,
        });
        newAchievements.forEach(achievement => {
          showAchievementUnlockToast(achievement);
        });
      }
    }

    await onReviewComplete({
      totalReviews: reviewedCount + 1,
      accuracy: Math.round(((correctCount + (isCorrect ? 1 : 0)) / (reviewedCount + 1)) * 100),
    });
  };

  const handleNext = () => {
    setCurrentIndex(prev => prev + 1);
    setUserInput('');
    setShowResult(false);
    setLastResult(null);
  };

  const handleRemoveItem = async () => {
    if (!currentItem) return;
    await removeItem(currentItem.id);
    setShowResult(false);
    setLastResult(null);
    setUserInput('');
  };

  const handleRestart = () => {
    refreshItems();
    setCurrentIndex(0);
    setUserInput('');
    setShowResult(false);
    setLastResult(null);
    setReviewedCount(0);
    setCorrectCount(0);
  };

  const handleStartReview = () => {
    setActiveTab('review');
    setCurrentIndex(0);
    setUserInput('');
    setShowResult(false);
    setLastResult(null);
    setReviewedCount(0);
    setCorrectCount(0);
  };

  const toggleModuleExpanded = (moduleId: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <ContentProtection>
        <div className="min-h-screen flex flex-col bg-background">
          <Header />
          <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Carregando revisões...</p>
            </div>
          </main>
          <Footer />
        </div>
      </ContentProtection>
    );
  }

  return (
    <ContentProtection>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Offline Indicator */}
            <OfflineIndicator isOnline={isOnline} isSyncing={isSyncing} pendingCount={pendingCount} />
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Brain className="w-8 h-8 text-primary" />
                  <h1 className="font-serif text-3xl font-bold text-foreground">
                    Revisão Espaçada
                  </h1>
                </div>
                <p className="text-muted-foreground">
                  Sistema inteligente de revisão baseado no algoritmo SM-2.
                </p>
              </div>
              <div className="flex items-center gap-3 self-start md:self-auto">
                {streak && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      {streak.current_streak} dias
                    </span>
                  </div>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/review/stats')}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Estatísticas
                </Button>
              </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className={cn(
                "transition-all",
                dueCount > 0 && "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20"
              )}>
                <CardContent className="p-4 text-center">
                  <Clock className={cn(
                    "w-6 h-6 mx-auto mb-1",
                    dueCount > 0 ? "text-amber-500" : "text-muted-foreground"
                  )} />
                  <p className={cn(
                    "text-2xl font-bold",
                    dueCount > 0 && "text-amber-600 dark:text-amber-400"
                  )}>{dueCount}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Brain className="w-6 h-6 text-primary mx-auto mb-1" />
                  <p className="text-2xl font-bold">{statistics.totalItems}</p>
                  <p className="text-xs text-muted-foreground">Total de itens</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Star className="w-6 h-6 text-green-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold">{statistics.masteredItems}</p>
                  <p className="text-xs text-muted-foreground">Dominados</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Target className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold">{statistics.averageAccuracy}%</p>
                  <p className="text-xs text-muted-foreground">Taxa de acerto</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'review' | 'overview')} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Visão Geral
                </TabsTrigger>
                <TabsTrigger value="review" className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Revisar Agora
                  {dueCount > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                      {dueCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Quick Actions */}
                {dueCount > 0 && (
                  <Card className="border-primary/50 bg-primary/5">
                    <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <AlertCircle className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">
                            {dueCount} {dueCount === 1 ? 'item precisa' : 'itens precisam'} de revisão
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Revise agora para manter sua memória ativa!
                          </p>
                        </div>
                      </div>
                      <Button onClick={handleStartReview} className="gradient-gold text-secondary shadow-gold">
                        <Zap className="w-4 h-4 mr-2" />
                        Começar Revisão
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Retention Rate Card */}
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                        Taxa de Retenção
                      </CardTitle>
                      <CardDescription>
                        Itens que você dominou (3+ revisões corretas)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className="relative w-20 h-20">
                          <svg className="w-20 h-20 transform -rotate-90">
                            <circle
                              cx="40"
                              cy="40"
                              r="32"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="transparent"
                              className="text-muted/30"
                            />
                            <circle
                              cx="40"
                              cy="40"
                              r="32"
                              stroke="currentColor"
                              strokeWidth="8"
                              fill="transparent"
                              strokeDasharray={`${statistics.retentionRate * 2} ${200 - statistics.retentionRate * 2}`}
                              className="text-green-500 transition-all duration-500"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xl font-bold">{statistics.retentionRate}%</span>
                          </div>
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Dominados</span>
                            <span className="font-medium">{statistics.masteredItems}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Em progresso</span>
                            <span className="font-medium">{statistics.totalItems - statistics.masteredItems}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total de revisões</span>
                            <span className="font-medium">{statistics.totalReviews}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Difficulty Distribution */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Layers className="w-5 h-5 text-blue-500" />
                        Distribuição por Dificuldade
                      </CardTitle>
                      <CardDescription>
                        Baseado no fator de facilidade (ease factor)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            Fácil
                          </span>
                          <span className="font-medium">{statistics.itemsByDifficulty.easy}</span>
                        </div>
                        <Progress 
                          value={statistics.totalItems > 0 ? (statistics.itemsByDifficulty.easy / statistics.totalItems) * 100 : 0} 
                          className="h-2"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            Médio
                          </span>
                          <span className="font-medium">{statistics.itemsByDifficulty.medium}</span>
                        </div>
                        <Progress 
                          value={statistics.totalItems > 0 ? (statistics.itemsByDifficulty.medium / statistics.totalItems) * 100 : 0} 
                          className="h-2"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            Difícil
                          </span>
                          <span className="font-medium">{statistics.itemsByDifficulty.hard}</span>
                        </div>
                        <Progress 
                          value={statistics.totalItems > 0 ? (statistics.itemsByDifficulty.hard / statistics.totalItems) * 100 : 0} 
                          className="h-2"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Upcoming Reviews Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      Próximas Revisões (7 dias)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-2 h-32">
                      {statistics.upcomingByDay.map((day, index) => {
                        const maxCount = Math.max(...statistics.upcomingByDay.map(d => d.count), 1);
                        const height = (day.count / maxCount) * 100;
                        const isToday = index === 0;
                        
                        return (
                          <div key={index} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-xs font-medium">{day.count}</span>
                            <div 
                              className={cn(
                                "w-full rounded-t transition-all",
                                isToday ? "bg-primary" : "bg-primary/40",
                                day.count === 0 && "bg-muted"
                              )}
                              style={{ height: `${Math.max(height, 4)}%` }}
                            />
                            <span className="text-xs text-muted-foreground">
                              {isToday ? 'Hoje' : format(day.date, 'EEE', { locale: ptBR })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Items by Module */}
                {Object.keys(itemsByModule).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Itens por Módulo
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {Object.entries(itemsByModule).map(([moduleId, items]) => {
                        const moduleInfo = modules[moduleId];
                        const moduleStats = statistics.byModule[moduleId] || { total: 0, due: 0, mastered: 0 };
                        const isExpanded = expandedModules.has(moduleId);
                        
                        return (
                          <Collapsible key={moduleId} open={isExpanded}>
                            <CollapsibleTrigger 
                              onClick={() => toggleModuleExpanded(moduleId)}
                              className="w-full"
                            >
                              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-3">
                                  <ChevronDown className={cn(
                                    "w-4 h-4 transition-transform",
                                    isExpanded && "rotate-180"
                                  )} />
                                  <span className="font-medium">
                                    {moduleInfo?.title || 'Módulo desconhecido'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {moduleStats.due > 0 && (
                                    <Badge variant="destructive" className="h-5">
                                      {moduleStats.due} pendentes
                                    </Badge>
                                  )}
                                  <Badge variant="secondary">
                                    {moduleStats.mastered}/{moduleStats.total} dominados
                                  </Badge>
                                </div>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="mt-2 space-y-1 pl-7">
                                {items.slice(0, 5).map(item => (
                                  <div 
                                    key={item.id}
                                    className="flex items-center justify-between p-2 bg-background rounded border text-sm"
                                  >
                                    <p className="truncate flex-1 mr-4 font-serif">
                                      {getTextStart(item.item_text, 8)}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      {item.repetitions >= 3 && item.ease_factor >= 2.0 ? (
                                        <Badge variant="outline" className="text-green-600 border-green-300">
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          Dominado
                                        </Badge>
                                      ) : new Date(item.next_review_at) <= new Date() ? (
                                        <Badge variant="destructive" className="h-5">
                                          Revisar
                                        </Badge>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">
                                          {formatDistanceToNow(new Date(item.next_review_at), { 
                                            addSuffix: true, 
                                            locale: ptBR 
                                          })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {items.length > 5 && (
                                  <p className="text-xs text-muted-foreground text-center py-2">
                                    + {items.length - 5} outros itens
                                  </p>
                                )}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                {/* Empty State */}
                {allItems.length === 0 && (
                  <Card className="border-dashed">
                    <CardContent className="p-8 text-center">
                      <Brain className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                      <h3 className="font-semibold text-lg mb-2">Nenhum item para revisar</h3>
                      <p className="text-muted-foreground mb-4">
                        Complete exercícios de Fixação de Contexto para adicionar itens à revisão espaçada automaticamente.
                      </p>
                      <Button variant="outline" onClick={() => navigate('/dashboard')}>
                        Ir para o Dashboard
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Review Tab */}
              <TabsContent value="review">
                {isSessionComplete ? (
                  <div className="space-y-6">
                    <Card className="border-2 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
                      <CardContent className="p-8 text-center">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h2 className="font-serif text-2xl font-bold text-green-800 dark:text-green-200 mb-2">
                          Revisão Completa!
                        </h2>
                        <p className="text-green-700 dark:text-green-300 mb-6">
                          {reviewedCount > 0 
                            ? `Você revisou ${reviewedCount} itens com ${correctCount} acertos (${Math.round((correctCount / reviewedCount) * 100)}%).`
                            : 'Não há itens pendentes para revisão no momento.'}
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                          <Button variant="outline" onClick={() => setActiveTab('overview')}>
                            Ver Estatísticas
                          </Button>
                          <Button variant="outline" onClick={() => navigate('/dashboard')}>
                            Voltar ao Dashboard
                          </Button>
                          <Button onClick={handleRestart} className="gradient-gold text-secondary">
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Verificar Novamente
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {streak && (
                      <StreakDisplay streak={streak} />
                    )}
                  </div>
                ) : (
                  <Card>
                    <CardHeader className="border-b border-border">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          Item {currentIndex + 1} de {dueItems.length}
                        </CardTitle>
                        <span className="text-sm text-muted-foreground">
                          Próxima revisão em: {currentItem.interval_days} dias
                        </span>
                      </div>
                      <Progress value={((currentIndex) / dueItems.length) * 100} className="h-2" />
                    </CardHeader>
                    
                    <CardContent className="p-6">
                      {/* Prompt */}
                      <div className="mb-6 text-center">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                          Complete o verso:
                        </p>
                        <p className="font-serif text-2xl text-primary font-medium">
                          {getTextStart(currentItem.item_text, START_WORD_COUNT)}
                        </p>
                      </div>

                      {/* Result Feedback */}
                      {showResult && lastResult && (
                        <div className={`mb-4 p-4 rounded-lg text-center ${
                          lastResult.correct 
                            ? 'bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800' 
                            : 'bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
                        }`}>
                          <div className="flex items-center justify-center gap-2 mb-2">
                            {lastResult.correct ? (
                              <>
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <span className="font-medium text-green-800 dark:text-green-200">
                                  Correto! {lastResult.similarity}% de acurácia
                                </span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-5 h-5 text-amber-600" />
                                <span className="font-medium text-amber-800 dark:text-amber-200">
                                  {lastResult.similarity}% - Precisa revisar mais
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground font-serif">
                            {currentItem.item_text}
                          </p>
                        </div>
                      )}

                      {/* Input Area */}
                      {!showResult && (
                        <div className="mb-4">
                          <Textarea
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Digite o restante do verso..."
                            className="min-h-[100px] text-center font-serif text-lg resize-none"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleVerify();
                              }
                            }}
                          />
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-3 justify-center">
                        {!showResult ? (
                          <Button 
                            onClick={handleVerify}
                            disabled={!userInput.trim()}
                            className="gradient-gold text-secondary shadow-gold"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Verificar
                          </Button>
                        ) : (
                          <>
                            <Button 
                              variant="outline"
                              onClick={handleRemoveItem}
                              className="text-destructive"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Remover Item
                            </Button>
                            <Button 
                              onClick={handleNext}
                              className="gradient-gold text-secondary"
                            >
                              Próximo
                              <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>

        <Footer />
      </div>
    </ContentProtection>
  );
};

export default SpacedReview;
