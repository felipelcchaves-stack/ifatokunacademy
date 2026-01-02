import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, BookOpen, Loader2 } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAchievementTriggers } from '@/hooks/useAchievementTriggers';
import { useAchievements } from '@/hooks/useAchievements';
import { showAchievementUnlockToast } from '@/components/achievements/AchievementUnlockToast';

interface Exercise {
  id: string;
  lesson_id: string;
  type: 'reading' | 'drag-drop' | 'fill-columns' | 'flashcard' | 'video' | 'memorization' | 'quiz';
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

const LessonView: React.FC = () => {
  const { moduleId, lessonId } = useParams<{ moduleId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { onExerciseComplete, onStudySessionStart } = useAchievementTriggers();
  const { checkAllAchievements } = useAchievements();
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());

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
      setExercises((exercisesData || []) as Exercise[]);

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

      toast({
        title: 'Muito bem!',
        description: 'Exercício concluído com sucesso.',
      });
    }
  };

  const handleNext = () => {
    if (currentExerciseIndex < exercises.length - 1) {
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
      setCurrentExerciseIndex(currentExerciseIndex - 1);
    }
  };

  const renderExercise = (exercise: Exercise) => {
    const content = exercise.content || {};
    
    switch (exercise.type) {
      case 'reading':
        return (
          <ReadingExercise 
            text={content.text || ''}
            audioUrl={content.audioUrl}
            onComplete={handleExerciseComplete}
          />
        );
      case 'flashcard':
        return (
          <FlashCard 
            cards={content.cards || []}
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
        const items = (content.items || []).map((item: any) => 
          typeof item === 'string' 
            ? { text: item, hint: '' } 
            : item
        );
        return (
          <MemorizationExercise 
            items={items}
            exerciseId={exercise.id}
            onComplete={() => handleExerciseComplete()}
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
      default:
        return (
          <div className="text-center text-muted-foreground p-8 bg-card rounded-xl border border-border">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p>Tipo de exercício não suportado: {exercise.type}</p>
          </div>
        );
    }
  };

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
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Exercício {currentExerciseIndex + 1} de {exercises.length}</span>
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

                <div className="flex gap-2">
                  {exercises.map((ex, index) => (
                    <button
                      key={ex.id}
                      onClick={() => setCurrentExerciseIndex(index)}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        index === currentExerciseIndex 
                          ? 'bg-primary' 
                          : completedExercises.has(ex.id)
                            ? 'bg-green-500'
                            : 'bg-muted'
                      }`}
                    />
                  ))}
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
