import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Trophy, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertTriangle,
  Award
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ContentProtection from '@/components/ContentProtection';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useModuleProgress } from '@/hooks/useModuleProgress';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';

interface Module {
  id: string;
  title: string;
  description: string | null;
  type: 'proficiency' | 'thematic';
  level: string | null;
  color: string | null;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface QuizExercise {
  id: string;
  title: string;
  content: {
    questions: QuizQuestion[];
    passingScore: number;
    timeLimit: number | null;
  };
}

type QuizState = 'loading' | 'not-ready' | 'ready' | 'in-progress' | 'completed';

const ModuleQuiz: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { getOrgPath } = useOrgNavigate();
  const { getModuleProgress, completeModule } = useModuleProgress();
  
  const [module, setModule] = useState<Module | null>(null);
  const [quizExercise, setQuizExercise] = useState<QuizExercise | null>(null);
  const [quizState, setQuizState] = useState<QuizState>('loading');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [previousAttempts, setPreviousAttempts] = useState<{ score: number; date: string }[]>([]);

  useEffect(() => {
    if (moduleId && user) {
      fetchQuizData();
    }
  }, [moduleId, user]);

  // Timer effect
  useEffect(() => {
    if (quizState !== 'in-progress' || timeRemaining === null) return;

    if (timeRemaining <= 0) {
      handleSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [quizState, timeRemaining]);

  const fetchQuizData = async () => {
    try {
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
        });
      }

      // Check module progress
      const progress = await getModuleProgress(moduleId!);
      
      if (!progress || progress.progress < 100) {
        setQuizState('not-ready');
        return;
      }

      // Fetch quiz exercises from all lessons in this module
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .eq('module_id', moduleId)
        .eq('is_published', true);

      const lessonIds = lessons?.map(l => l.id) || [];

      const { data: quizzes, error: quizError } = await supabase
        .from('exercises')
        .select('*')
        .eq('type', 'quiz')
        .eq('is_published', true)
        .in('lesson_id', lessonIds.length > 0 ? lessonIds : ['none'])
        .order('display_order', { ascending: false })
        .limit(1);

      if (quizError) throw quizError;

      if (!quizzes || quizzes.length === 0) {
        // No quiz available, but module is complete
        setQuizState('not-ready');
        toast({
          title: 'Quiz não disponível',
          description: 'O quiz final deste módulo ainda não foi criado.',
        });
        return;
      }

      const quiz = quizzes[0];
      const quizContent = quiz.content as unknown as QuizExercise['content'];
      setQuizExercise({
        id: quiz.id,
        title: quiz.title,
        content: quizContent,
      });

      // Check for previous attempts
      const { data: completions } = await supabase
        .from('module_completions')
        .select('quiz_score, completed_at')
        .eq('user_id', user!.id)
        .eq('module_id', moduleId)
        .order('completed_at', { ascending: false });

      if (completions && completions.length > 0) {
        setPreviousAttempts(completions.map(c => ({
          score: c.quiz_score,
          date: c.completed_at,
        })));
      }

      setQuizState('ready');
    } catch (error) {
      console.error('Error fetching quiz data:', error);
      toast({
        title: 'Erro ao carregar quiz',
        description: 'Não foi possível carregar o quiz. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const startQuiz = () => {
    if (!quizExercise) return;
    
    setAnswers({});
    setCurrentQuestionIndex(0);
    setShowResults(false);
    
    if (quizExercise.content.timeLimit) {
      setTimeRemaining(quizExercise.content.timeLimit * 60);
    }
    
    setQuizState('in-progress');
  };

  const handleAnswer = (questionIndex: number, optionIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: optionIndex,
    }));
  };

  const handleSubmit = async () => {
    if (!quizExercise || !user) return;

    const questions = quizExercise.content.questions;
    let correct = 0;

    questions.forEach((q, index) => {
      if (answers[index] === q.correctIndex) {
        correct++;
      }
    });

    const calculatedScore = Math.round((correct / questions.length) * 100);
    setScore(calculatedScore);
    setShowResults(true);
    setQuizState('completed');

    // Save completion
    const success = await completeModule(moduleId!, calculatedScore);
    
    if (success) {
      toast({
        title: calculatedScore >= 90 ? '🎉 Parabéns!' : 'Quiz concluído',
        description: calculatedScore >= 90 
          ? `Você passou com ${calculatedScore}% e está certificado!`
          : `Você obteve ${calculatedScore}%. Precisa de 90% para certificação.`,
      });
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (quizState === 'loading') {
    return (
      <ContentProtection>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="pt-24 pb-16 flex items-center justify-center">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Carregando quiz...</span>
            </div>
          </main>
        </div>
      </ContentProtection>
    );
  }

  if (quizState === 'not-ready' || !module) {
    return (
      <ContentProtection>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="pt-24 pb-16">
            <div className="container mx-auto px-4 max-w-2xl text-center">
              <div className="bg-card rounded-2xl border border-border p-8">
                <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                <h1 className="font-serif text-2xl font-bold text-foreground mb-4">
                  Quiz não disponível
                </h1>
                <p className="text-muted-foreground mb-6">
                  Você precisa concluir todas as lições do módulo antes de fazer o quiz final.
                </p>
                <Button onClick={() => navigate(`/module/${moduleId}`)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao Módulo
                </Button>
              </div>
            </div>
          </main>
        </div>
      </ContentProtection>
    );
  }

  if (quizState === 'ready' && quizExercise) {
    const passingScore = quizExercise.content.passingScore || 90;
    const bestScore = previousAttempts.length > 0 
      ? Math.max(...previousAttempts.map(a => a.score))
      : null;

    return (
      <ContentProtection>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="pt-24 pb-16">
            <div className="container mx-auto px-4 max-w-2xl">
              <Button
                variant="ghost"
                className="mb-6"
                onClick={() => navigate(`/module/${moduleId}`)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Módulo
              </Button>

              <div className="bg-card rounded-2xl border border-border p-8 text-center">
                <div className="w-20 h-20 rounded-full gradient-gold flex items-center justify-center mx-auto mb-6 shadow-gold">
                  <Trophy className="w-10 h-10 text-secondary" />
                </div>

                <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
                  Quiz Final
                </h1>
                <p className="text-lg text-muted-foreground mb-2">
                  {module.title}
                </p>
                <p className="text-muted-foreground mb-8">
                  {quizExercise.title}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-8 max-w-sm mx-auto">
                  <div className="bg-muted/50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-foreground">
                      {quizExercise.content.questions.length}
                    </p>
                    <p className="text-sm text-muted-foreground">Perguntas</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-foreground">{passingScore}%</p>
                    <p className="text-sm text-muted-foreground">Para aprovação</p>
                  </div>
                </div>

                {quizExercise.content.timeLimit && (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground mb-6">
                    <Clock className="w-5 h-5" />
                    <span>Limite de tempo: {quizExercise.content.timeLimit} minutos</span>
                  </div>
                )}

                {bestScore !== null && (
                  <div className={`mb-6 p-4 rounded-xl ${bestScore >= passingScore ? 'bg-green-100 dark:bg-green-900/20' : 'bg-amber-100 dark:bg-amber-900/20'}`}>
                    <p className={`font-medium ${bestScore >= passingScore ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
                      {bestScore >= passingScore ? (
                        <>
                          <Award className="w-5 h-5 inline mr-2" />
                          Você já está certificado! Melhor nota: {bestScore}%
                        </>
                      ) : (
                        <>Sua melhor tentativa: {bestScore}%</>
                      )}
                    </p>
                  </div>
                )}

                <Button 
                  size="lg" 
                  className="gradient-gold text-secondary shadow-gold"
                  onClick={startQuiz}
                >
                  {previousAttempts.length > 0 ? 'Tentar Novamente' : 'Iniciar Quiz'}
                </Button>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </ContentProtection>
    );
  }

  if (quizState === 'in-progress' && quizExercise) {
    const questions = quizExercise.content.questions;
    const currentQuestion = questions[currentQuestionIndex];
    const progressPercent = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <ContentProtection>
        <div className="min-h-screen bg-background">
          {/* Quiz Header */}
          <div className="bg-card border-b border-border sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  Pergunta {currentQuestionIndex + 1} de {questions.length}
                </span>
                {timeRemaining !== null && (
                  <div className={`flex items-center gap-2 ${timeRemaining < 60 ? 'text-red-500' : 'text-muted-foreground'}`}>
                    <Clock className="w-4 h-4" />
                    <span className="font-mono">{formatTime(timeRemaining)}</span>
                  </div>
                )}
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          </div>

          <main className="container mx-auto px-4 py-8 max-w-2xl">
            <div className="bg-card rounded-2xl border border-border p-8">
              <h2 className="text-xl font-semibold text-foreground mb-6">
                {currentQuestion.question}
              </h2>

              <RadioGroup
                value={answers[currentQuestionIndex]?.toString() || ''}
                onValueChange={(value) => handleAnswer(currentQuestionIndex, parseInt(value))}
              >
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <div
                      key={index}
                      className={`
                        flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer
                        ${answers[currentQuestionIndex] === index
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                        }
                      `}
                      onClick={() => handleAnswer(currentQuestionIndex, index)}
                    >
                      <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>

              <div className="flex justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                  disabled={currentQuestionIndex === 0}
                >
                  Anterior
                </Button>

                {currentQuestionIndex < questions.length - 1 ? (
                  <Button
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    disabled={answers[currentQuestionIndex] === undefined}
                  >
                    Próxima
                  </Button>
                ) : (
                  <Button
                    className="gradient-gold text-secondary shadow-gold"
                    onClick={handleSubmit}
                    disabled={Object.keys(answers).length < questions.length}
                  >
                    Finalizar Quiz
                  </Button>
                )}
              </div>

              {/* Question Navigator */}
              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground mb-3">Navegação rápida:</p>
                <div className="flex flex-wrap gap-2">
                  {questions.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`
                        w-8 h-8 rounded-full text-sm font-medium transition-all
                        ${currentQuestionIndex === index
                          ? 'bg-primary text-primary-foreground'
                          : answers[index] !== undefined
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }
                      `}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </ContentProtection>
    );
  }

  if (quizState === 'completed' && quizExercise && showResults) {
    const questions = quizExercise.content.questions;
    const passingScore = quizExercise.content.passingScore || 90;
    const passed = score >= passingScore;

    return (
      <ContentProtection>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="pt-24 pb-16">
            <div className="container mx-auto px-4 max-w-2xl">
              <div className="bg-card rounded-2xl border border-border p-8 text-center mb-8">
                <div className={`
                  w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6
                  ${passed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}
                `}>
                  {passed ? (
                    <Award className="w-12 h-12 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertTriangle className="w-12 h-12 text-amber-600 dark:text-amber-400" />
                  )}
                </div>

                <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
                  {passed ? 'Parabéns!' : 'Quase lá!'}
                </h1>
                <p className="text-muted-foreground mb-6">
                  {passed 
                    ? 'Você foi aprovado e está certificado neste módulo!'
                    : `Você precisa de ${passingScore}% para aprovação. Tente novamente!`
                  }
                </p>

                <div className="text-6xl font-bold mb-2" style={{ 
                  color: passed ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' 
                }}>
                  {score}%
                </div>
                <p className="text-muted-foreground mb-8">
                  {Object.values(answers).filter((a, i) => a === questions[i].correctIndex).length} de {questions.length} corretas
                </p>

                <div className="flex gap-4 justify-center">
                  {!passed && (
                    <Button variant="outline" onClick={startQuiz}>
                      Tentar Novamente
                    </Button>
                  )}
                  <Button 
                    className="gradient-gold text-secondary shadow-gold"
                    onClick={() => navigate('/dashboard')}
                  >
                    Voltar ao Dashboard
                  </Button>
                </div>
              </div>

              {/* Answer Review */}
              <div className="bg-card rounded-2xl border border-border p-6">
                <h3 className="font-semibold text-foreground mb-4">Revisão das Respostas</h3>
                <div className="space-y-4">
                  {questions.map((q, index) => {
                    const isCorrect = answers[index] === q.correctIndex;
                    return (
                      <div 
                        key={index}
                        className={`p-4 rounded-xl border ${
                          isCorrect 
                            ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' 
                            : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-foreground mb-2">{q.question}</p>
                            <p className="text-sm">
                              <span className="text-muted-foreground">Sua resposta: </span>
                              <span className={isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                                {q.options[answers[index]] || 'Não respondida'}
                              </span>
                            </p>
                            {!isCorrect && (
                              <p className="text-sm mt-1">
                                <span className="text-muted-foreground">Resposta correta: </span>
                                <span className="text-green-700 dark:text-green-400">{q.options[q.correctIndex]}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </ContentProtection>
    );
  }

  return null;
};

export default ModuleQuiz;