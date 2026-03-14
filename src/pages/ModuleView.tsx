import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock, Lock, Loader2, Trophy } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ContentProtection from '@/components/ContentProtection';
import LessonCard from '@/components/modules/LessonCard';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useModuleProgress } from '@/hooks/useModuleProgress';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { toast } from '@/hooks/use-toast';

interface Module {
  id: string;
  title: string;
  description: string | null;
  type: 'proficiency' | 'thematic';
  level: string | null;
  theme: string | null;
  color: string | null;
  image_url: string | null;
  requires_quiz: boolean;
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  display_order: number;
  is_published: boolean;
  exercises_count?: number;
  published_count?: number;
  draft_count?: number;
  completed?: boolean;
}

const ModuleView: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organization } = useOrganization();
  const { getOrgPath } = useOrgNavigate();
  const { getLessonProgress } = useModuleProgress();
  const [module, setModule] = useState<Module | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonProgressMap, setLessonProgressMap] = useState<Record<string, { 
    progress: number; 
    isCompleted: boolean;
    phase1Complete: boolean;
    phase1Total: number;
    phase1Completed: number;
  }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (moduleId) {
      fetchModuleAndLessons();
    }
  }, [moduleId]);

  useEffect(() => {
    if (user && lessons.length > 0) {
      fetchLessonProgress();
    }
  }, [user, lessons]);

  const fetchLessonProgress = async () => {
    const progressMap: Record<string, { 
      progress: number; 
      isCompleted: boolean;
      phase1Complete: boolean;
      phase1Total: number;
      phase1Completed: number;
    }> = {};
    
    for (const lesson of lessons) {
      const progress = await getLessonProgress(lesson.id);
      if (progress) {
        progressMap[lesson.id] = {
          progress: progress.progress,
          isCompleted: progress.isCompleted,
          phase1Complete: progress.phase1Complete,
          phase1Total: progress.phase1Total,
          phase1Completed: progress.phase1Completed,
        };
      }
    }
    
    setLessonProgressMap(progressMap);
  };

  const fetchModuleAndLessons = async () => {
    try {
      setLoading(true);
      
      // Fetch module
      const { data: moduleData, error: moduleError } = await supabase
        .from('modules')
        .select('*')
        .eq('id', moduleId)
        .maybeSingle();

      if (moduleError) throw moduleError;
      
      if (moduleData) {
        setModule({
          ...moduleData,
          type: moduleData.type as 'proficiency' | 'thematic',
          requires_quiz: moduleData.requires_quiz ?? true,
        });
      }

      // Fetch published lessons with exercise count
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select(`
          *,
          exercises:exercises(count)
        `)
        .eq('module_id', moduleId)
        .eq('is_published', true)
        .order('display_order', { ascending: true });

      if (lessonsError) throw lessonsError;

      // Get published exercise counts separately
      const lessonIds = (lessonsData || []).map((l: any) => l.id);
      
      // Count published exercises per lesson
      const { data: publishedCounts } = lessonIds.length > 0 
        ? await supabase
            .from('exercises')
            .select('lesson_id')
            .in('lesson_id', lessonIds)
            .eq('is_published', true)
        : { data: [] };
      
      const publishedCountMap: Record<string, number> = {};
      (publishedCounts || []).forEach((e: any) => {
        publishedCountMap[e.lesson_id] = (publishedCountMap[e.lesson_id] || 0) + 1;
      });

      const lessonsWithCount = (lessonsData || []).map((l: any) => {
        const totalCount = l.exercises?.[0]?.count || 0;
        const publishedCount = publishedCountMap[l.id] || 0;
        const draftCount = totalCount - publishedCount;
        return {
          ...l,
          exercises_count: totalCount,
          published_count: publishedCount,
          draft_count: draftCount,
          completed: false,
        };
      });

      setLessons(lessonsWithCount);
    } catch (error) {
      console.error('Error fetching module:', error);
    } finally {
      setLoading(false);
    }
  };

  // Determine if a lesson is locked based on Phase 1 completion of previous lesson
  const isLessonLocked = (lessonIndex: number): boolean => {
    if (!user) return true; // Lock all if not logged in
    if (lessonIndex === 0) return false; // First lesson is always unlocked
    
    // Check if previous lesson has Phase 1 completed (not 100% of all exercises)
    const previousLesson = lessons[lessonIndex - 1];
    const previousProgress = lessonProgressMap[previousLesson.id];
    
    // Unlock next lesson when Phase 1 is complete OR lesson is 100% complete
    return !previousProgress?.phase1Complete && !previousProgress?.isCompleted;
  };

  // Calculate overall module progress
  const calculateModuleProgress = (): number => {
    if (lessons.length === 0) return 0;
    
    const totalProgress = lessons.reduce((acc, lesson) => {
      const progress = lessonProgressMap[lesson.id]?.progress || 0;
      return acc + progress;
    }, 0);
    
    return Math.round(totalProgress / lessons.length);
  };

  const progress = calculateModuleProgress();

  if (loading) {
    return (
      <ContentProtection>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="pt-24 pb-16 flex items-center justify-center">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Carregando módulo...</span>
            </div>
          </main>
        </div>
      </ContentProtection>
    );
  }

  if (!module) {
    return (
      <ContentProtection>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="pt-24 pb-16 flex items-center justify-center">
            <div className="text-center">
              <h1 className="font-serif text-2xl font-bold text-foreground mb-4">
                Módulo não encontrado
              </h1>
              <Button onClick={() => navigate(getOrgPath('/dashboard'))}>
                Voltar ao Dashboard
              </Button>
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
        
        <main className="pt-24 pb-16">
          {/* Hero with Banner */}
          <div className="relative">
            {module.image_url ? (
              <>
                <div className="h-80 md:h-96 relative overflow-hidden">
                  <img 
                    src={module.image_url} 
                    alt={module.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
                </div>
              </>
            ) : (
              <div className={`h-80 md:h-96 bg-gradient-to-br ${module.color || 'from-amber-500 to-orange-600'} pattern-adinkra relative`}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
            )}
            
            {/* Content positioned over banner */}
            <div className="absolute inset-0 flex flex-col justify-end">
              <div className="container mx-auto px-4 py-8">
                <Button
                  variant="ghost"
                  className="text-white/80 hover:text-white hover:bg-white/10 mb-6"
                  onClick={() => navigate(getOrgPath('/dashboard'))}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>

                <div className="max-w-3xl">
                  <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium text-white mb-4">
                    {module.type === 'proficiency' 
                      ? `Nível ${module.level?.charAt(0).toUpperCase()}${module.level?.slice(1)}` 
                      : module.theme}
                  </span>
                  <h1 className="font-serif text-4xl md:text-5xl font-bold text-white mb-4">
                    {module.title}
                  </h1>
                  <p className="text-lg text-white/80 mb-6">
                    {module.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-6 text-white/80">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      <span>{lessons.length} lições</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      <span>~{lessons.reduce((acc, l) => acc + (l.duration_minutes || 30), 0)} minutos</span>
                    </div>
                  </div>

                  {progress > 0 && (
                    <div className="mt-6 max-w-sm">
                      <div className="flex justify-between text-sm text-white/80 mb-2">
                        <span>Seu progresso</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2 bg-white/20" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Lessons List */}
          <div className="container mx-auto px-4 py-12">
            <h2 className="font-serif text-2xl font-bold text-foreground mb-8">
              Conteúdo do Módulo
            </h2>

            <div className="space-y-4">
              {lessons.length > 0 ? (
                lessons.map((lesson, index) => {
                  const lessonProgress = lessonProgressMap[lesson.id];
                  return (
                    <LessonCard 
                      key={lesson.id} 
                      lesson={{
                        ...lesson,
                        completed: lessonProgress?.isCompleted || false,
                      }} 
                      index={index}
                      moduleId={module.id}
                      isLocked={isLessonLocked(index)}
                      progress={lessonProgress?.progress || 0}
                      phase1Complete={lessonProgress?.phase1Complete || false}
                      phase1Total={lessonProgress?.phase1Total || 0}
                      phase1Completed={lessonProgress?.phase1Completed || 0}
                      unlockReason={isLessonLocked(index) && index > 0 ? 'Complete a lição anterior' : undefined}
                      previousLessonProgress={
                        index > 0 
                          ? lessonProgressMap[lessons[index - 1].id]?.progress || 0 
                          : undefined
                      }
                    />
                  );
                })
              ) : (
                <div className="bg-card rounded-xl p-8 text-center border border-border">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
                    Conteúdo em Desenvolvimento
                  </h3>
                  <p className="text-muted-foreground">
                    As lições deste módulo estão sendo preparadas. Em breve estarão disponíveis!
                  </p>
                </div>
              )}

              {/* Quiz Final Card - only if module requires quiz */}
              {module.requires_quiz && lessons.length > 0 && progress === 100 && (
                <div 
                  className="bg-gradient-to-r from-primary/10 to-amber-500/10 rounded-xl p-6 border border-primary/30 cursor-pointer hover:shadow-soft transition-all mt-6"
                  onClick={() => navigate(getOrgPath(`/module/${module.id}/quiz`))}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full gradient-gold flex items-center justify-center shadow-gold">
                      <Trophy className="w-7 h-7 text-secondary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-lg">Quiz Final</h3>
                      <p className="text-sm text-muted-foreground">
                        Complete o quiz com 90% de acerto para certificação
                      </p>
                    </div>
                    <Button className="gradient-gold text-secondary shadow-gold">
                      Fazer Quiz
                    </Button>
                  </div>
                </div>
              )}

              {module.requires_quiz && lessons.length > 0 && progress < 100 && progress > 0 && (
                <div className="bg-muted/50 rounded-xl p-6 border border-border mt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                      <Lock className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-muted-foreground text-lg">Quiz Final</h3>
                      <p className="text-sm text-muted-foreground">
                        Complete todas as lições para desbloquear o quiz ({progress}% concluído)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Module completed without quiz */}
              {!module.requires_quiz && lessons.length > 0 && progress === 100 && (
                <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl p-6 border border-green-500/30 mt-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Trophy className="w-7 h-7 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-lg">Módulo Concluído!</h3>
                      <p className="text-sm text-muted-foreground">
                        Parabéns! Você completou todas as lições deste módulo.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </ContentProtection>
  );
};

export default ModuleView;
