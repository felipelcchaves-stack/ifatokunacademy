import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, BookOpen, Loader2, Sparkles } from 'lucide-react';
import Header from '@/components/layout/Header';
import ContentProtection from '@/components/ContentProtection';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import FlashCard from '@/components/exercises/FlashCard';
import DragDropExercise from '@/components/exercises/DragDropExercise';
import ReadingExercise from '@/components/exercises/ReadingExercise';
import VideoExercise from '@/components/exercises/VideoExercise';
import FillColumnsExercise from '@/components/exercises/FillColumnsExercise';
import MemorizationExercise from '@/components/exercises/MemorizationExercise';
import QuizExercise from '@/components/exercises/QuizExercise';
import TapComplete from '@/components/exercises/TapComplete';
import FillBlanksExercise from '@/components/exercises/FillBlanksExercise';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAchievementTriggers } from '@/hooks/useAchievementTriggers';
import { useAchievements } from '@/hooks/useAchievements';
import { useModulePhaseProgress } from '@/hooks/useModulePhaseProgress';
import { showAchievementUnlockToast } from '@/components/achievements/AchievementUnlockToast';
import { Badge } from '@/components/ui/badge';

interface Exercise {
  id: string;
  lesson_id: string;
  type: 'reading' | 'drag-drop' | 'fill-columns' | 'fill-blanks' | 'flashcard' | 'video' | 'memorization' | 'quiz' | 'tap-complete';
  title: string;
  content: Record<string, any>;
  display_order: number;
  is_published: boolean;
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  module_id: string;
}

// Helper to determine phase from exercise title and display order
const getExercisePhase = (title: string, displayOrder: number): 1 | 2 => {
  const titleLower = title.toLowerCase();
  
  // Verificação explícita por "Fase 2" no título
  if (titleLower.includes('fase 2') || titleLower.includes('proficiência')) {
    return 2;
  }
  
  // Verificação explícita por "Fase 1" no título
  if (titleLower.includes('fase 1') || titleLower.includes('contexto')) {
    return 1;
  }
  
  // Para exercícios sem marcação explícita, usar display_order
  // Estrutura padrão do PedagogicalExerciseGenerator:
  // Fase 1: orders 0-5 (6 exercícios)
  // Fase 2: orders 6-10 (5 exercícios)
  // Exercícios extras (tap-complete, drag-drop) = orders 11+ = Fase 1 (fixação)
  if (displayOrder >= 11) {
    return 1; // Exercícios de fixação extras pertencem à Fase 1
  }
  
  return displayOrder <= 5 ? 1 : 2;
};

const LessonView: React.FC = () => {
  const { moduleId, lessonId } = useParams<{ moduleId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { onExerciseComplete, onStudySessionStart } = useAchievementTriggers();
  const { checkAllAchievements } = useAchievements();
  const { checkAndMarkPhaseComplete } = useModulePhaseProgress();
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [showPhaseTransition, setShowPhaseTransition] = useState(false);
  
  // Audio state for TapComplete
  const [tapCompleteAudioLoading, setTapCompleteAudioLoading] = useState(false);
  const tapCompleteAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (lessonId) {
      fetchLessonAndExercises();
    }
  }, [lessonId]);

  const fetchLessonAndExercises = async () => {
    try {
      setLoading(true);
      
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .maybeSingle();

      if (lessonError) throw lessonError;
      setLesson(lessonData);

      const { data: exercisesData, error: exercisesError } = await supabase
        .from('exercises')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('is_published', true)
        .order('display_order', { ascending: true });

      if (exercisesError) throw exercisesError;
      
      // Reordenar exercícios por fase para garantir navegação correta
      // Primeiro todos da Fase 1, depois todos da Fase 2
      const sortedExercises = [...(exercisesData || [])].sort((a, b) => {
        const phaseA = getExercisePhase(a.title, a.display_order);
        const phaseB = getExercisePhase(b.title, b.display_order);
        
        // Agrupa por fase primeiro
        if (phaseA !== phaseB) {
          return phaseA - phaseB; // Fase 1 primeiro
        }
        
        // Dentro da mesma fase, manter ordem original por display_order
        return a.display_order - b.display_order;
      });
      
      setExercises(sortedExercises as Exercise[]);

      // Load already completed exercises
      if (user) {
        const { data: progress } = await supabase
          .from('user_progress')
          .select('exercise_id')
          .eq('user_id', user.id)
          .eq('lesson_id', lessonId);

        if (progress) {
          setCompletedExercises(new Set(progress.map(p => p.exercise_id)));
        }
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar lição',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate phase information
  const phaseInfo = useMemo(() => {
    if (exercises.length === 0) return null;
    
    const phase1Exercises = exercises.filter(ex => getExercisePhase(ex.title, ex.display_order) === 1);
    const phase2Exercises = exercises.filter(ex => getExercisePhase(ex.title, ex.display_order) === 2);
    
    const hasPhases = phase1Exercises.length > 0 && phase2Exercises.length > 0;
    const phase1EndIndex = phase1Exercises.length - 1;
    
    return {
      hasPhases,
      phase1Count: phase1Exercises.length,
      phase2Count: phase2Exercises.length,
      phase1EndIndex,
      currentPhase: currentExerciseIndex <= phase1EndIndex ? 1 : 2,
      phase1Completed: phase1Exercises.every(ex => completedExercises.has(ex.id)),
      phase2Completed: phase2Exercises.every(ex => completedExercises.has(ex.id)),
    };
  }, [exercises, currentExerciseIndex, completedExercises]);

  // Audio handler for TapComplete exercise - MUST be before any early returns
  const handlePlayTapCompleteAudio = useCallback(async (text: string, existingAudioUrl?: string) => {
    // Stop current audio if playing
    if (tapCompleteAudioRef.current) {
      tapCompleteAudioRef.current.pause();
      tapCompleteAudioRef.current = null;
    }

    try {
      let audioUrl = existingAudioUrl;
      
      // If no existing audio, generate via ElevenLabs
      if (!audioUrl) {
        setTapCompleteAudioLoading(true);
        
        const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
          body: { text }
        });
        
        if (error) throw error;
        if (!data?.audioUrl) throw new Error('Áudio não gerado');
        
        audioUrl = data.audioUrl;
      }
      
      // Play the audio
      const audio = new Audio(audioUrl);
      tapCompleteAudioRef.current = audio;
      await audio.play();
      
    } catch (error: any) {
      console.error('Error playing TapComplete audio:', error);
      toast({
        title: 'Erro ao reproduzir áudio',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setTapCompleteAudioLoading(false);
    }
  }, [toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Carregando lição...</span>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-bold text-foreground mb-4">
            Lição não encontrada
          </h1>
          <Button onClick={() => navigate(`/module/${moduleId}`)}>
            Voltar ao Módulo
          </Button>
        </div>
      </div>
    );
  }

  const currentExercise = exercises[currentExerciseIndex];
  const progress = exercises.length > 0 ? (completedExercises.size / exercises.length) * 100 : 0;

  const handleExerciseComplete = async (score?: number) => {
    if (currentExercise && user) {
      // Check time-based achievements on first exercise
      if (!sessionStarted) {
        setSessionStarted(true);
        onStudySessionStart();
      }

      // Save progress to database
      const { error: progressError } = await supabase.from('user_progress').upsert({
        user_id: user.id,
        exercise_id: currentExercise.id,
        lesson_id: lessonId,
        module_id: moduleId,
        score: score || null,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'user_id,exercise_id' });

      if (progressError) {
        console.error('Error saving progress:', progressError);
        toast({
          title: 'Erro ao salvar progresso',
          description: 'Tente novamente.',
          variant: 'destructive',
        });
      }

      setCompletedExercises(prev => new Set([...prev, currentExercise.id]));
      
      // Trigger achievement check for exercise completion
      await onExerciseComplete(currentExercise.type, score || 0);
      
      // Check all achievements for any new unlocks
      const newAchievements = await checkAllAchievements();
      newAchievements.forEach(achievement => {
        showAchievementUnlockToast(achievement);
      });

      // Check and mark phase completion
      if (moduleId) {
        const phaseResult = await checkAndMarkPhaseComplete(moduleId);
        
        if (phaseResult.phase1JustCompleted) {
          toast({
            title: 'Fase 1 Concluída! 🎉',
            description: 'O próximo módulo foi desbloqueado! Você pode continuar para Fase 2 ou avançar.',
          });
        } else if (phaseResult.phase2JustCompleted) {
          toast({
            title: 'Fase 2 Concluída! 🏆',
            description: 'Parabéns! Você está pronto para o quiz de proficiência.',
          });
        } else {
          toast({
            title: 'Muito bem!',
            description: 'Exercício concluído com sucesso.',
          });
        }
      } else {
        toast({
          title: 'Muito bem!',
          description: 'Exercício concluído com sucesso.',
        });
      }
    }
  };

  const handleNext = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      // Check if transitioning to Phase 2
      if (phaseInfo?.hasPhases && 
          currentExerciseIndex === phaseInfo.phase1EndIndex && 
          !showPhaseTransition) {
        setShowPhaseTransition(true);
        return;
      }
      
      setShowPhaseTransition(false);
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    } else {
      // Lesson complete
      toast({
        title: 'Parabéns! 🎉',
        description: 'Você concluiu esta lição!',
      });
      navigate(`/module/${moduleId}`);
    }
  };

  const handlePrevious = () => {
    if (currentExerciseIndex > 0) {
      setShowPhaseTransition(false);
      setCurrentExerciseIndex(currentExerciseIndex - 1);
    }
  };


  const renderExercise = (exercise: Exercise) => {
    const content = exercise.content || {};
    
    switch (exercise.type) {
      case 'reading':
        const exercisePhase = getExercisePhase(exercise.title, exercise.display_order);
        return (
          <ReadingExercise 
            text={content.text || ''}
            audioUrl={content.audioUrl}
            onComplete={handleExerciseComplete}
            exerciseId={exercise.id}
            lessonId={lessonId}
            moduleId={moduleId}
            phase={exercisePhase === 2 ? 'phase2' : 'phase1'}
          />
        );
      case 'flashcard':
        const flashcardPhase = getExercisePhase(exercise.title, exercise.display_order);
        return (
          <FlashCard 
            cards={content.cards || []}
            exerciseId={exercise.id}
            lessonId={lessonId}
            moduleId={moduleId}
            phase={flashcardPhase === 2 ? 'phase2' : 'phase1'}
            onComplete={handleExerciseComplete}
          />
        );
      case 'drag-drop':
        return (
          <DragDropExercise 
            items={content.items || []}
            targets={content.targets || []}
            correctMatches={content.correctMatches || {}}
            onComplete={handleExerciseComplete}
          />
        );
      case 'video':
        return (
          <VideoExercise 
            videoUrl={content.videoUrl || ''}
            description={content.description}
            onComplete={handleExerciseComplete}
          />
        );
      case 'fill-columns':
        return (
          <FillColumnsExercise 
            columns={content.columns || []}
            rows={content.rows || []}
            blankPositions={content.blankPositions}
            onComplete={handleExerciseComplete}
          />
        );
      case 'memorization':
        const memorizationPhase = getExercisePhase(exercise.title, exercise.display_order);
        const memItems = (content.items || []).map((item: any) =>
          typeof item === 'string' 
            ? { text: item, hint: '' } 
            : item
        );
        return (
          <MemorizationExercise 
            items={memItems}
            exerciseId={exercise.id}
            lessonId={lessonId}
            moduleId={moduleId}
            phase={memorizationPhase === 2 ? 'phase2' : 'phase1'}
            onComplete={handleExerciseComplete}
          />
        );
      case 'quiz':
        return (
          <QuizExercise
            questions={content.questions || []}
            passingScore={content.passingScore || 90}
            onComplete={(passed, score) => handleExerciseComplete(score)}
          />
        );
      case 'tap-complete':
        return (
          <TapComplete
            text={content.text || ''}
            onComplete={(correct) => correct && handleExerciseComplete()}
            onPlayAudio={() => handlePlayTapCompleteAudio(content.text || '', content.audioUrl)}
            audioLoading={tapCompleteAudioLoading}
            preferChunkMode={content.preferChunkMode}
            chunkSize={content.chunkSize}
          />
        );
      case 'fill-blanks':
        return (
          <FillBlanksExercise
            items={content.items || []}
            onComplete={handleExerciseComplete}
          />
        );
      default:
        return (
          <div className="text-center text-muted-foreground p-8 bg-card rounded-xl border border-border">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p>Tipo de exercício não suportado: {exercise.type}</p>
          </div>
        );
    }
  };

  // Phase transition screen
  if (showPhaseTransition && phaseInfo?.hasPhases) {
    return (
      <ContentProtection>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="pt-24 pb-16">
            <div className="container mx-auto px-4 max-w-2xl">
              <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-8 md:p-12 text-center border border-primary/20">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-primary-foreground" />
                </div>
                
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground mb-4">
                  Fase 1 Concluída! 🎉
                </h2>
                
                <p className="text-lg text-muted-foreground mb-6">
                  Você dominou o <strong>contexto e resumo</strong> do verso. 
                  Agora é hora de mergulhar no <strong>texto completo</strong>!
                </p>
                
                <div className="bg-card/50 rounded-xl p-6 mb-8 border border-border">
                  <h3 className="font-medium text-foreground mb-3">Na Fase 2 você irá:</h3>
                  <ul className="text-sm text-muted-foreground space-y-2 text-left">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Ler o verso completo com todos os detalhes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Memorizar cada linha do texto original</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Praticar com exercícios mais detalhados</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Consolidar o conhecimento completo do Odù</span>
                    </li>
                  </ul>
                </div>
                
                <div className="flex gap-4 justify-center">
                  <Button variant="outline" onClick={handlePrevious}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Revisar Fase 1
                  </Button>
                  <Button 
                    className="gradient-gold text-secondary shadow-gold"
                    onClick={() => {
                      setShowPhaseTransition(false);
                      setCurrentExerciseIndex(currentExerciseIndex + 1);
                    }}
                  >
                    Iniciar Fase 2
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
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
          <div className="container mx-auto px-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <Button
                variant="ghost"
                onClick={() => navigate(`/module/${moduleId}`)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Módulo
              </Button>

              {exercises.length > 0 && (
                <div className="flex items-center gap-3">
                  {/* Phase indicator */}
                  {phaseInfo?.hasPhases && (
                    <Badge 
                      variant={phaseInfo.currentPhase === 1 ? "secondary" : "default"}
                      className={phaseInfo.currentPhase === 2 ? "bg-primary text-primary-foreground" : ""}
                    >
                      Fase {phaseInfo.currentPhase}: {phaseInfo.currentPhase === 1 ? 'Contexto' : 'Completo'}
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    Exercício {currentExerciseIndex + 1} de {exercises.length}
                  </span>
                </div>
              )}
            </div>

            {/* Progress */}
            <div className="mb-8">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-foreground">{lesson.title}</span>
                <span className="text-muted-foreground">{Math.round(progress)}% concluído</span>
              </div>
              <Progress value={progress} className="h-2" />
              
              {/* Phase progress indicators */}
              {phaseInfo?.hasPhases && (
                <div className="flex gap-2 mt-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Fase 1: Contexto</span>
                      <span className={phaseInfo.phase1Completed ? "text-primary" : "text-muted-foreground"}>
                        {phaseInfo.phase1Completed ? "✓ Concluída" : `${phaseInfo.phase1Count} exercícios`}
                      </span>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${phaseInfo.currentPhase >= 1 ? 'bg-primary/60' : 'bg-muted'}`}
                        style={{ 
                          width: phaseInfo.phase1Completed ? '100%' : 
                            phaseInfo.currentPhase === 1 ? `${((currentExerciseIndex + 1) / phaseInfo.phase1Count) * 100}%` : '100%'
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Fase 2: Completo</span>
                      <span className={phaseInfo.phase2Completed ? "text-primary" : "text-muted-foreground"}>
                        {phaseInfo.phase2Completed ? "✓ Concluída" : `${phaseInfo.phase2Count} exercícios`}
                      </span>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${phaseInfo.currentPhase === 2 ? 'bg-primary' : 'bg-muted'}`}
                        style={{ 
                          width: phaseInfo.phase2Completed ? '100%' : 
                            phaseInfo.currentPhase === 2 ? `${((currentExerciseIndex - phaseInfo.phase1Count + 1) / phaseInfo.phase2Count) * 100}%` : '0%'
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Exercise Content */}
            {exercises.length > 0 && currentExercise ? (
              <div className="mb-8">
                <h2 className="font-serif text-xl font-semibold text-foreground text-center mb-8">
                  {currentExercise.title}
                </h2>
                <div className="max-w-4xl mx-auto">
                  {renderExercise(currentExercise)}
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-xl p-12 text-center border border-border">
                <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
                  Conteúdo em Desenvolvimento
                </h3>
                <p className="text-muted-foreground mb-6">
                  Os exercícios desta lição ainda não foram publicados.
                </p>
                <Button onClick={() => navigate(`/module/${moduleId}`)}>
                  Voltar ao Módulo
                </Button>
              </div>
            )}

            {/* Navigation */}
            {exercises.length > 0 && (
              <div className="flex items-center justify-between mt-12 pt-6 border-t border-border">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentExerciseIndex === 0}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Anterior
                </Button>

                <div className="flex gap-1.5 flex-wrap justify-center max-w-md">
                  {exercises.map((ex, index) => {
                    const phase = getExercisePhase(ex.title, ex.display_order);
                    const isPhase2 = phase === 2;
                    
                    return (
                      <button
                        key={ex.id}
                        onClick={() => {
                          setShowPhaseTransition(false);
                          setCurrentExerciseIndex(index);
                        }}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                          index === currentExerciseIndex 
                            ? 'bg-primary scale-125' 
                            : completedExercises.has(ex.id)
                              ? 'bg-green-500'
                              : isPhase2 ? 'bg-accent/40' : 'bg-muted-foreground/30'
                        }`}
                        title={`${ex.title}`}
                      />
                    );
                  })}
                </div>

                <Button
                  className="gradient-gold text-secondary shadow-gold"
                  onClick={handleNext}
                >
                  {currentExerciseIndex === exercises.length - 1 ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Concluir Lição
                    </>
                  ) : (
                    <>
                      Próximo
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </ContentProtection>
  );
};

export default LessonView;
