import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, Award, TrendingUp, Loader2, Brain, Zap } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ModuleSlider from '@/components/modules/ModuleSlider';
import ContentProtection from '@/components/ContentProtection';
import StreakDisplay from '@/components/streak/StreakDisplay';
import { AchievementsDisplay } from '@/components/achievements/AchievementsDisplay';
import { XPDisplay } from '@/components/engagement/XPDisplay';
import { DailyGoalProgress } from '@/components/engagement/DailyGoalProgress';
import { SacredQuote } from '@/components/engagement/SacredQuote';
import { ActivityHeatmap } from '@/components/engagement/ActivityHeatmap';
import { StreakRiskAlert } from '@/components/engagement/StreakRiskAlert';
import { CompactStreak } from '@/components/engagement/CompactStreak';
import { CompactXP } from '@/components/engagement/CompactXP';
import { HeroStudyTrack } from '@/components/dashboard/HeroStudyTrack';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSpacedRepetition } from '@/hooks/useSpacedRepetition';
import { useStreak } from '@/hooks/useStreak';

interface Module {
  id: string;
  title: string;
  description: string | null;
  type: 'proficiency' | 'thematic';
  level: string | null;
  theme: string | null;
  image_url: string | null;
  color: string | null;
  display_order: number;
  is_published: boolean;
  totalLessons?: number;
  progress?: number;
}

interface ModuleCompletion {
  module_id: string;
  quiz_score: number;
}

const LEVEL_ORDER = ['akapo', 'awo', 'oluwo'];

const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [modules, setModules] = useState<Module[]>([]);
  const [completions, setCompletions] = useState<ModuleCompletion[]>([]);
  const [userProgress, setUserProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  
  const { dueCount } = useSpacedRepetition();
  const { streak, loading: streakLoading } = useStreak();

  const displayName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Estudante';

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select(`
          *,
          lessons:lessons(count)
        `)
        .eq('is_published', true)
        .order('display_order', { ascending: true });

      if (modulesError) throw modulesError;

      const modulesWithCount = (modulesData || []).map((m: any) => ({
        ...m,
        type: m.type as 'proficiency' | 'thematic',
        totalLessons: m.lessons?.[0]?.count || 0,
        progress: 0,
      }));

      setModules(modulesWithCount);

      if (user) {
        const { data: completionsData } = await supabase
          .from('module_completions')
          .select('module_id, quiz_score')
          .eq('user_id', user.id);

        setCompletions(completionsData || []);

        const progressByModule: Record<string, number> = {};
        
        for (const mod of modulesWithCount) {
          const { data: lessons } = await supabase
            .from('lessons')
            .select('id')
            .eq('module_id', mod.id)
            .eq('is_published', true);

          const lessonIds = lessons?.map(l => l.id) || [];
          if (lessonIds.length === 0) continue;

          const { data: exercises } = await supabase
            .from('exercises')
            .select('id')
            .in('lesson_id', lessonIds)
            .eq('is_published', true);

          const { data: completed } = await supabase
            .from('user_progress')
            .select('exercise_id')
            .eq('user_id', user.id)
            .eq('module_id', mod.id);

          const totalExercises = exercises?.length || 0;
          const completedExercises = completed?.length || 0;
          
          progressByModule[mod.id] = totalExercises > 0 
            ? Math.round((completedExercises / totalExercises) * 100)
            : 0;
        }

        setUserProgress(progressByModule);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLockedModules = () => {
    const locked = new Set<string>();
    const requirements: Record<string, string> = {};

    const profModules = modules.filter(m => m.type === 'proficiency');
    
    profModules.forEach(mod => {
      const levelIndex = LEVEL_ORDER.indexOf(mod.level?.toLowerCase() || '');
      
      if (levelIndex > 0) {
        const previousLevel = LEVEL_ORDER[levelIndex - 1];
        const previousModules = profModules.filter(
          m => m.level?.toLowerCase() === previousLevel
        );

        const allPreviousCompleted = previousModules.every(pm => 
          completions.some(c => c.module_id === pm.id && c.quiz_score >= 90)
        );

        if (!allPreviousCompleted) {
          locked.add(mod.id);
          const levelName = previousLevel.charAt(0).toUpperCase() + previousLevel.slice(1);
          requirements[mod.id] = `Complete o nível ${levelName} com 90% no quiz para desbloquear`;
        }
      }
    });

    return { locked, requirements };
  };

  const { locked: lockedModules, requirements: unlockRequirements } = getLockedModules();

  const modulesWithProgress = modules.map(m => ({
    ...m,
    progress: userProgress[m.id] || 0,
  }));

  const proficiencyModules = modulesWithProgress.filter(m => m.type === 'proficiency');
  const thematicModules = modulesWithProgress.filter(m => m.type === 'thematic');

  const totalProgress = modulesWithProgress.length > 0
    ? Math.round(modulesWithProgress.reduce((acc, m) => acc + (m.progress || 0), 0) / modulesWithProgress.length)
    : 0;

  if (loading) {
    return (
      <ContentProtection>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="pt-24 pb-16 flex items-center justify-center">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Carregando...</span>
            </div>
          </main>
        </div>
      </ContentProtection>
    );
  }

  return (
    <ContentProtection>
      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="pt-20">
          {/* FIRST FOLD - Hero Study Track */}
          <section className="min-h-[calc(100vh-5rem)] relative">
            {/* Floating stats bar */}
            <div className="absolute top-4 left-0 right-0 z-20">
              <div className="container mx-auto px-4">
                <div className="flex items-center justify-between">
                  {/* Left: Streak Risk Alert */}
                  <div className="flex-1">
                    <StreakRiskAlert />
                  </div>
                  
                  {/* Right: Compact XP and Streak */}
                  <div className="flex items-center gap-3">
                    <CompactStreak streak={streak} />
                    <CompactXP />
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Study Tracks */}
            <div className="container mx-auto px-4 pt-16">
              <HeroStudyTrack
                modules={proficiencyModules}
                lockedModules={lockedModules}
                unlockRequirements={unlockRequirements}
                displayName={displayName}
              />
            </div>
          </section>

          {/* SECOND FOLD - Quick Engagement */}
          <section className="py-16 bg-gradient-to-b from-background to-muted/30">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Daily Goal */}
                <DailyGoalProgress />
                
                {/* Spaced Review */}
                <div className="bg-card rounded-2xl p-6 border border-border shadow-soft hover:shadow-elevated transition-all">
                  <div className="flex flex-col gap-4 h-full justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-forest-600 flex items-center justify-center">
                        <Brain className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-primary">Revisão Espaçada</span>
                        <h3 className="font-semibold text-foreground">
                          {dueCount > 0 ? `${dueCount} itens` : 'Nenhum pendente'}
                        </h3>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      A revisão espaçada ajuda a fixar o conteúdo na memória de longo prazo.
                    </p>
                    <Button 
                      className="w-full gradient-forest text-primary-foreground font-semibold"
                      onClick={() => navigate('/review')}
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      {dueCount > 0 ? 'Revisar Agora' : 'Ver Revisões'}
                    </Button>
                  </div>
                </div>

                {/* Challenge Mode */}
                <div className="bg-card rounded-2xl p-6 border border-border shadow-soft hover:shadow-elevated transition-all">
                  <div className="flex flex-col gap-4 h-full justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-purple-600">Modo Desafio</span>
                        <h3 className="font-semibold text-foreground">Contra o Tempo</h3>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Teste sua velocidade e ganhe XP multiplicado respondendo rápido!
                    </p>
                    <Button 
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold"
                      onClick={() => navigate('/challenge')}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Iniciar Desafio
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* THIRD FOLD - Detailed Progress */}
          <section className="py-16">
            <div className="container mx-auto px-4 space-y-12">
              {/* XP and Streak Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <XPDisplay />
                <StreakDisplay streak={streak} />
              </div>

              {/* Activity Heatmap */}
              <ActivityHeatmap />

              {/* Achievements */}
              <AchievementsDisplay />

              {/* Sacred Quote */}
              <SacredQuote context="motivation" />
            </div>
          </section>

          {/* Thematic Modules (if any) */}
          {thematicModules.length > 0 && (
            <section className="py-16 bg-muted/20">
              <div className="container mx-auto px-4">
                <ModuleSlider 
                  modules={thematicModules.map(m => ({
                    id: m.id,
                    title: m.title,
                    description: m.description || '',
                    type: m.type,
                    level: 'Akapo' as const,
                    theme: m.theme || '',
                    image: m.image_url || '',
                    color: m.color || 'from-forest-500 to-forest-600',
                    totalLessons: m.totalLessons || 0,
                    progress: m.progress || 0,
                    lessons: [],
                  }))}
                  title="Módulos Temáticos"
                  subtitle="Aprofunde-se em áreas específicas do conhecimento"
                />
              </div>
            </section>
          )}

          {/* Quick Stats Footer */}
          <section className="py-12 bg-secondary text-secondary-foreground">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-secondary-foreground/10 flex items-center justify-center mx-auto mb-3">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <p className="text-3xl font-bold">{modules.length}</p>
                  <p className="text-sm opacity-80">Módulos</p>
                </div>
                <div>
                  <div className="w-12 h-12 rounded-xl bg-secondary-foreground/10 flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-6 h-6" />
                  </div>
                  <p className="text-3xl font-bold">∞</p>
                  <p className="text-sm opacity-80">Horas de Estudo</p>
                </div>
                <div>
                  <div className="w-12 h-12 rounded-xl bg-secondary-foreground/10 flex items-center justify-center mx-auto mb-3">
                    <Award className="w-6 h-6" />
                  </div>
                  <p className="text-3xl font-bold">{completions.length}</p>
                  <p className="text-sm opacity-80">Certificados</p>
                </div>
                <div>
                  <div className="w-12 h-12 rounded-xl bg-secondary-foreground/10 flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <p className="text-3xl font-bold">{totalProgress}%</p>
                  <p className="text-sm opacity-80">Progresso Total</p>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </ContentProtection>
  );
};

export default Dashboard;
