import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle, BookOpen } from 'lucide-react';
import Header from '@/components/layout/Header';
import ContentProtection from '@/components/ContentProtection';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import FlashCard from '@/components/exercises/FlashCard';
import DragDropExercise from '@/components/exercises/DragDropExercise';
import ReadingExercise from '@/components/exercises/ReadingExercise';
import { getLessonById, Exercise } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';

const LessonView: React.FC = () => {
  const { moduleId, lessonId } = useParams<{ moduleId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const lesson = getLessonById(moduleId || '', lessonId || '');
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());

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

  const exercises = lesson.exercises;
  const currentExercise = exercises[currentExerciseIndex];
  const progress = exercises.length > 0 ? (completedExercises.size / exercises.length) * 100 : 0;

  const handleExerciseComplete = () => {
    setCompletedExercises(prev => new Set([...prev, currentExercise.id]));
    toast({
      title: 'Muito bem!',
      description: 'Exercício concluído com sucesso.',
    });
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
    switch (exercise.type) {
      case 'reading':
        return (
          <ReadingExercise 
            text={exercise.content.text}
            audioUrl={exercise.content.audioUrl}
            onComplete={handleExerciseComplete}
          />
        );
      case 'flashcard':
        return (
          <FlashCard 
            cards={exercise.content.cards}
            onComplete={handleExerciseComplete}
          />
        );
      case 'drag-drop':
        return (
          <DragDropExercise 
            items={exercise.content.items}
            targets={exercise.content.targets}
            correctMatches={exercise.content.correctMatches}
            onComplete={handleExerciseComplete}
          />
        );
      case 'video':
        return (
          <div className="protected-content w-full max-w-2xl mx-auto">
            <div className="aspect-video bg-muted rounded-xl flex items-center justify-center border border-border">
              <div className="text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Vídeo aula: {exercise.title}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  (Integração de vídeo será configurada em breve)
                </p>
              </div>
            </div>
          </div>
        );
      case 'memorization':
        return (
          <div className="protected-content w-full max-w-2xl mx-auto">
            <div className="bg-card rounded-2xl p-8 shadow-soft border border-border">
              <h3 className="font-serif text-xl font-semibold text-foreground mb-6 text-center">
                {exercise.title}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {exercise.content.items.map((item: string, index: number) => (
                  <div 
                    key={index}
                    className="p-3 bg-primary/5 rounded-lg text-center text-sm font-medium text-foreground border border-primary/20"
                  >
                    {item}
                  </div>
                ))}
              </div>
              <Button 
                className="w-full mt-6 gradient-gold text-secondary"
                onClick={handleExerciseComplete}
              >
                Marcar como Memorizado
              </Button>
            </div>
          </div>
        );
      default:
        return (
          <div className="text-center text-muted-foreground">
            Tipo de exercício não suportado
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

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Exercício {currentExerciseIndex + 1} de {exercises.length}</span>
              </div>
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
            {exercises.length > 0 ? (
              <div className="mb-8">
                <h2 className="font-serif text-xl font-semibold text-foreground text-center mb-8">
                  {currentExercise.title}
                </h2>
                {renderExercise(currentExercise)}
              </div>
            ) : (
              <div className="bg-card rounded-xl p-12 text-center border border-border">
                <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
                  Conteúdo em Desenvolvimento
                </h3>
                <p className="text-muted-foreground mb-6">
                  Os exercícios desta lição estão sendo preparados.
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
                  {exercises.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentExerciseIndex(index)}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        index === currentExerciseIndex 
                          ? 'bg-primary' 
                          : completedExercises.has(exercises[index].id)
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
