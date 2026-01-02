import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, Award, TrendingUp, Loader2, Brain, Zap, Sparkles, FlaskConical } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ModuleSlider from '@/components/modules/ModuleSlider';
import { ThematicProgressInfo } from '@/components/modules/ThematicProgressInfo';
import ContentProtection from '@/components/ContentProtection';
import StreakDisplay from '@/components/streak/StreakDisplay';
import { CompactAchievements } from '@/components/achievements/CompactAchievements';
import { XPDisplay } from '@/components/engagement/XPDisplay';
import { DailyGoalProgress } from '@/components/engagement/DailyGoalProgress';

import { ActivityHeatmap } from '@/components/engagement/ActivityHeatmap';
import { StreakRiskAlert } from '@/components/engagement/StreakRiskAlert';
import { CompactStreak } from '@/components/engagement/CompactStreak';
import { CompactXP } from '@/components/engagement/CompactXP';
import { HeroStudyTrack } from '@/components/dashboard/HeroStudyTrack';
import { AnimatedCounter } from '@/components/engagement/AnimatedCounter';
import { StudyPlanSummaryCard } from '@/components/study-plan/StudyPlanSummaryCard';
import ModuleRetentionAlert from '@/components/dashboard/ModuleRetentionAlert';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useSpacedRepetition } from '@/hooks/useSpacedRepetition';
import { useStreak } from '@/hooks/useStreak';
import { useSequentialProgress } from '@/hooks/useSequentialProgress';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useModulePermissions } from '@/hooks/useModulePermissions';

const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  // Use optimized hook for dashboard data
  const { modules, completions, userProgress, loading } = useDashboardData(user);
  
  const { dueCount } = useSpacedRepetition();
  const { streak, loading: streakLoading } = useStreak();
  const { hasAccess, loading: permissionsLoading, isAdmin } = useModulePermissions();

  const displayName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Estudante';

  // Use new sequential progress logic
  const { calculateLockedModules, areThematicsUnlocked, getThematicUnlockProgress, getActiveThematicModule } = useSequentialProgress();
  
  const getLockedModulesAndThematicInfo = () => {
    // Convert completions to the format expected by the hook
    const formattedCompletions = completions.map(c => ({
      moduleId: c.module_id,
      quizScore: c.quiz_score,
    }));
    
    // Convert modules to the format expected by the hook
    const formattedModules = modules.map(m => ({
      id: m.id,
      title: m.title,
      type: m.type,
      level: m.level,
      display_order: m.display_order,
    }));
    
    const lockResult = calculateLockedModules(formattedModules, formattedCompletions, userProgress);
    const thematicsUnlocked = areThematicsUnlocked(formattedModules, formattedCompletions);
    const thematicProgress = getThematicUnlockProgress(formattedModules, formattedCompletions);
    
    // Get active thematic module
    const thematicModulesForCheck = formattedModules.filter(m => m.type === 'thematic');
    const activeThematic = getActiveThematicModule(thematicModulesForCheck, formattedCompletions, userProgress);
    
    return {
      ...lockResult,
      thematicsUnlocked,
      thematicProgress,
      activeThematicTitle: activeThematic?.title,
    };
  };

  const { lockedModules, unlockRequirements, thematicsUnlocked, thematicProgress, activeThematicTitle } = getLockedModulesAndThematicInfo();

  // Filtrar módulos por permissão (admin vê todos)
  const accessibleModules = modules.filter(m => hasAccess(m.id));

  const modulesWithProgress = accessibleModules.map(m => ({
    ...m,
    progress: userProgress[m.id] || 0,
  }));

  const proficiencyModules = modulesWithProgress.filter(m => m.type === 'proficiency');
  const thematicModules = modulesWithProgress.filter(m => m.type === 'thematic');

  const totalProgress = modulesWithProgress.length > 0
    ? Math.round(modulesWithProgress.reduce((acc, m) => acc + (m.progress || 0), 0) / modulesWithProgress.length)
    : 0;

  if (loading || permissionsLoading) {
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
            <div className="container mx-auto px-4 space-y-6">
              {/* Study Plan Summary */}
              <StudyPlanSummaryCard />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Daily Goal */}
                <DailyGoalProgress />
                
                {/* Module Retention Alert */}
                <ModuleRetentionAlert />
                
                {/* Spaced Review */}
                <div className="group relative bg-card rounded-2xl p-6 border border-border shadow-soft hover:shadow-elevated transition-all duration-300 overflow-hidden">
                  {/* Background glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-forest-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative z-10 flex flex-col gap-4 h-full justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-forest-600 flex items-center justify-center shadow-forest group-hover:scale-110 transition-transform duration-300">
                        <Brain className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-primary uppercase tracking-wide">Revisão Espaçada</span>
                        <h3 className="font-bold text-foreground">
                          {dueCount > 0 ? `${dueCount} itens pendentes` : 'Nenhum pendente'}
                        </h3>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      A revisão espaçada ajuda a fixar o conteúdo na memória de longo prazo.
                    </p>
                    <Button 
                      className="w-full gradient-forest text-primary-foreground font-bold shadow-forest hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
                      onClick={() => navigate('/review')}
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      {dueCount > 0 ? 'Revisar Agora' : 'Ver Revisões'}
                    </Button>
                  </div>
                </div>

                {/* Challenge Mode */}
                <div className="group relative bg-card rounded-2xl p-6 border border-border shadow-soft hover:shadow-elevated transition-all duration-300 overflow-hidden">
                  {/* Background glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative z-10 flex flex-col gap-4 h-full justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Modo Desafio</span>
                        <h3 className="font-bold text-foreground">Contra o Tempo</h3>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Teste sua velocidade e ganhe XP multiplicado respondendo rápido!
                    </p>
                    <Button 
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
                      onClick={() => navigate('/challenge')}
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Iniciar Desafio
                    </Button>
                  </div>
                </div>

                {/* Test Memorization Modes */}
                <div className="group relative bg-card rounded-2xl p-6 border border-border shadow-soft hover:shadow-elevated transition-all duration-300 overflow-hidden md:col-span-2 lg:col-span-4">
                  {/* Background glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-teal-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative z-10 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <FlaskConical className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-cyan-600 uppercase tracking-wide">Novo!</span>
                        <h3 className="font-bold text-foreground">Modos de Memorização Inclusivos</h3>
                        <p className="text-sm text-muted-foreground">
                          Experimente 5 novos modos: Microlearning, Toque e Complete, Karaokê Visual, Construção Visual e Escuta e Repete
                        </p>
                      </div>
                    </div>
                    <Button 
                      className="bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 shrink-0"
                      onClick={() => navigate('/test-memorization')}
                    >
                      <FlaskConical className="w-4 h-4 mr-2" />
                      Testar Modos
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

              {/* Achievements - Compact */}
              <CompactAchievements />
            </div>
          </section>

          {/* Thematic Modules Section */}
          {thematicModules.length > 0 && (
            <section className="py-16 bg-muted/20">
              <div className="container mx-auto px-4 space-y-6">
                {/* Thematic Progress Info */}
                <ThematicProgressInfo
                  isUnlocked={thematicsUnlocked}
                  awoProgress={thematicProgress}
                  activeThematicTitle={activeThematicTitle}
                />
                
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
                  lockedModules={lockedModules}
                  unlockRequirements={unlockRequirements}
                />
              </div>
            </section>
          )}

          {/* Quick Stats Footer */}
          <section className="py-16 bg-gradient-to-br from-secondary via-secondary to-earth-600 text-secondary-foreground relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 pattern-adinkra opacity-10" />
            
            {/* Decorative glow */}
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-accent/20 rounded-full blur-3xl" />
            
            <div className="container mx-auto px-4 relative z-10">
              {/* Section header */}
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary-foreground/10 border border-secondary-foreground/20 mb-4">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span className="text-sm font-semibold text-secondary-foreground/90">Seu Progresso</span>
                </div>
                <h2 className="heading-display text-3xl md:text-4xl text-secondary-foreground">
                  Estatísticas da Jornada
                </h2>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                {/* Modules */}
                <div className="group relative bg-secondary-foreground/5 backdrop-blur-sm rounded-2xl p-6 border border-secondary-foreground/10 hover:bg-secondary-foreground/10 hover:border-secondary-foreground/20 transition-all duration-300 text-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                  <div className="relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-forest-600 flex items-center justify-center mx-auto mb-4 shadow-forest group-hover:scale-110 transition-transform duration-300">
                      <BookOpen className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <p className="text-4xl md:text-5xl font-extrabold tracking-tight mb-1">
                      <AnimatedCounter value={modules.length} />
                    </p>
                    <p className="text-sm font-medium text-secondary-foreground/70">Módulos</p>
                  </div>
                </div>

                {/* Study Hours */}
                <div className="group relative bg-secondary-foreground/5 backdrop-blur-sm rounded-2xl p-6 border border-secondary-foreground/10 hover:bg-secondary-foreground/10 hover:border-secondary-foreground/20 transition-all duration-300 text-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                  <div className="relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-sacred-600 flex items-center justify-center mx-auto mb-4 shadow-sacred group-hover:scale-110 transition-transform duration-300">
                      <Clock className="w-7 h-7 text-accent-foreground" />
                    </div>
                    <p className="text-4xl md:text-5xl font-extrabold tracking-tight mb-1">∞</p>
                    <p className="text-sm font-medium text-secondary-foreground/70">Horas de Estudo</p>
                  </div>
                </div>

                {/* Certificates */}
                <div className="group relative bg-secondary-foreground/5 backdrop-blur-sm rounded-2xl p-6 border border-secondary-foreground/10 hover:bg-secondary-foreground/10 hover:border-secondary-foreground/20 transition-all duration-300 text-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                  <div className="relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Award className="w-7 h-7 text-white" />
                    </div>
                    <p className="text-4xl md:text-5xl font-extrabold tracking-tight mb-1">
                      <AnimatedCounter value={completions.length} />
                    </p>
                    <p className="text-sm font-medium text-secondary-foreground/70">Certificados</p>
                  </div>
                </div>

                {/* Total Progress */}
                <div className="group relative bg-secondary-foreground/5 backdrop-blur-sm rounded-2xl p-6 border border-secondary-foreground/10 hover:bg-secondary-foreground/10 hover:border-secondary-foreground/20 transition-all duration-300 text-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                  <div className="relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <TrendingUp className="w-7 h-7 text-white" />
                    </div>
                    <p className="text-4xl md:text-5xl font-extrabold tracking-tight mb-1">
                      <AnimatedCounter value={totalProgress} suffix="%" />
                    </p>
                    <p className="text-sm font-medium text-secondary-foreground/70">Progresso Total</p>
                  </div>
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
