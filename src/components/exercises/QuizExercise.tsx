import React, { useState } from 'react';
import { CheckCircle, XCircle, Trophy, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface QuizExerciseProps {
  questions: QuizQuestion[];
  passingScore?: number;
  onComplete: (passed: boolean, score: number) => void;
}

const QuizExercise: React.FC<QuizExerciseProps> = ({
  questions,
  passingScore = 90,
  onComplete,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(questions.length).fill(null));
  const [isFinished, setIsFinished] = useState(false);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const handleSelectAnswer = (optionIndex: number) => {
    if (showResult) return;
    setSelectedAnswer(optionIndex);
  };

  const handleConfirm = () => {
    if (selectedAnswer === null) return;
    
    const newAnswers = [...answers];
    newAnswers[currentIndex] = selectedAnswer;
    setAnswers(newAnswers);
    setShowResult(true);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    const correctCount = answers.reduce((count, answer, idx) => {
      if (answer === questions[idx].correctIndex) {
        return count + 1;
      }
      return count;
    }, 0);
    
    // Check last answer
    const finalCorrectCount = selectedAnswer === currentQuestion.correctIndex 
      ? correctCount + 1 
      : correctCount;
    
    const score = Math.round((finalCorrectCount / questions.length) * 100);
    setIsFinished(true);
    onComplete(score >= passingScore, score);
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setAnswers(new Array(questions.length).fill(null));
    setIsFinished(false);
  };

  // Calculate current score
  const correctSoFar = answers.filter((a, idx) => a === questions[idx].correctIndex).length;
  const currentScore = Math.round((correctSoFar / questions.length) * 100);

  if (isFinished) {
    const finalScore = answers.reduce((count, answer, idx) => {
      if (answer === questions[idx].correctIndex) return count + 1;
      return count;
    }, 0);
    const percentage = Math.round((finalScore / questions.length) * 100);
    const passed = percentage >= passingScore;

    return (
      <div className="max-w-2xl mx-auto bg-card rounded-2xl p-8 shadow-soft border border-border text-center">
        <div className={cn(
          "w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center",
          passed ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
        )}>
          {passed ? (
            <Trophy className="w-10 h-10" />
          ) : (
            <XCircle className="w-10 h-10" />
          )}
        </div>

        <h2 className="font-serif text-2xl font-bold text-foreground mb-2">
          {passed ? 'Parabéns!' : 'Quase lá!'}
        </h2>
        
        <p className="text-muted-foreground mb-6">
          {passed 
            ? 'Você foi aprovado no quiz e pode avançar para o próximo nível!'
            : `Você precisa de ${passingScore}% para passar. Tente novamente!`}
        </p>

        <div className="bg-muted/50 rounded-xl p-6 mb-6">
          <div className="text-4xl font-bold text-foreground mb-2">
            {percentage}%
          </div>
          <p className="text-sm text-muted-foreground">
            {finalScore} de {questions.length} corretas
          </p>
          <Progress 
            value={percentage} 
            className={cn("h-3 mt-4", passed ? "bg-green-100" : "bg-red-100")} 
          />
        </div>

        {!passed && (
          <Button 
            onClick={handleRetry}
            className="gradient-gold text-secondary shadow-gold"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Header */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">
            Pergunta {currentIndex + 1} de {questions.length}
          </span>
          <span className="font-medium text-primary">
            Acertos: {correctSoFar}/{currentIndex}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <div className="bg-card rounded-2xl p-8 shadow-soft border border-border">
        <h2 className="font-serif text-xl font-semibold text-foreground mb-6 text-center">
          {currentQuestion.question}
        </h2>

        <div className="space-y-3 mb-8">
          {currentQuestion.options.map((option, idx) => {
            const isSelected = selectedAnswer === idx;
            const isCorrect = idx === currentQuestion.correctIndex;
            
            let optionClass = "border-border hover:border-primary/50 hover:bg-primary/5";
            
            if (showResult) {
              if (isCorrect) {
                optionClass = "border-green-500 bg-green-50 text-green-700";
              } else if (isSelected && !isCorrect) {
                optionClass = "border-red-500 bg-red-50 text-red-700";
              }
            } else if (isSelected) {
              optionClass = "border-primary bg-primary/10";
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelectAnswer(idx)}
                disabled={showResult}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-3",
                  optionClass
                )}
              >
                <span className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0",
                  showResult && isCorrect ? "bg-green-500 text-white" :
                  showResult && isSelected && !isCorrect ? "bg-red-500 text-white" :
                  isSelected ? "bg-primary text-primary-foreground" :
                  "bg-muted text-muted-foreground"
                )}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="flex-1">{option}</span>
                {showResult && isCorrect && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
                {showResult && isSelected && !isCorrect && (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          {!showResult ? (
            <Button
              onClick={handleConfirm}
              disabled={selectedAnswer === null}
              className="gradient-gold text-secondary shadow-gold"
            >
              Confirmar
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              className="gradient-gold text-secondary shadow-gold"
            >
              {currentIndex === questions.length - 1 ? 'Ver Resultado' : 'Próxima'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizExercise;
