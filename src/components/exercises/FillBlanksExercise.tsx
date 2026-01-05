import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, X, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FillBlanksExerciseProps {
  items: Array<{
    text: string; // Texto com {{blank}} para marcar lacunas
    answers: string[]; // Respostas esperadas para cada {{blank}}
    hint?: string;
  }>;
  onComplete?: () => void;
}

interface BlankState {
  value: string;
  isCorrect: boolean | null;
}

const FillBlanksExercise: React.FC<FillBlanksExerciseProps> = ({ items, onComplete }) => {
  // Estado para cada item, cada lacuna
  const [answers, setAnswers] = useState<BlankState[][]>(() =>
    items.map(item => {
      const blankCount = (item.text.match(/\{\{blank\}\}/g) || []).length;
      return Array(blankCount).fill(null).map(() => ({ value: '', isCorrect: null }));
    })
  );
  const [isChecked, setIsChecked] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);

  const handleInputChange = useCallback((itemIndex: number, blankIndex: number, value: string) => {
    setAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[itemIndex] = [...newAnswers[itemIndex]];
      newAnswers[itemIndex][blankIndex] = { value, isCorrect: null };
      return newAnswers;
    });
    setIsChecked(false);
  }, []);

  const handleCheck = useCallback(() => {
    const newAnswers = answers.map((itemAnswers, itemIndex) =>
      itemAnswers.map((blank, blankIndex) => {
        const correctAnswer = items[itemIndex].answers[blankIndex]?.toLowerCase().trim() || '';
        const userAnswer = blank.value.toLowerCase().trim();
        return {
          ...blank,
          isCorrect: userAnswer === correctAnswer
        };
      })
    );
    
    setAnswers(newAnswers);
    setIsChecked(true);

    // Verifica se todos estão corretos
    const allCorrect = newAnswers.every(item => item.every(blank => blank.isCorrect));
    if (allCorrect && onComplete) {
      onComplete();
    }
  }, [answers, items, onComplete]);

  const handleReset = useCallback(() => {
    setAnswers(
      items.map(item => {
        const blankCount = (item.text.match(/\{\{blank\}\}/g) || []).length;
        return Array(blankCount).fill(null).map(() => ({ value: '', isCorrect: null }));
      })
    );
    setIsChecked(false);
    setShowAnswers(false);
  }, [items]);

  const renderTextWithBlanks = (text: string, itemIndex: number) => {
    const parts = text.split(/(\{\{blank\}\})/g);
    let blankIndex = 0;

    return parts.map((part, partIndex) => {
      if (part === '{{blank}}') {
        const currentBlankIndex = blankIndex;
        const blankState = answers[itemIndex]?.[currentBlankIndex];
        const correctAnswer = items[itemIndex].answers[currentBlankIndex] || '';
        blankIndex++;

        return (
          <span key={partIndex} className="inline-flex items-center mx-1 align-baseline">
            <Input
              value={showAnswers ? correctAnswer : (blankState?.value || '')}
              onChange={(e) => handleInputChange(itemIndex, currentBlankIndex, e.target.value)}
              disabled={showAnswers}
              className={cn(
                "w-24 h-8 text-center text-sm inline-block px-2",
                isChecked && blankState?.isCorrect === true && "border-green-500 bg-green-50 dark:bg-green-950",
                isChecked && blankState?.isCorrect === false && "border-red-500 bg-red-50 dark:bg-red-950",
                showAnswers && "bg-amber-50 dark:bg-amber-950 border-amber-500"
              )}
              placeholder="..."
            />
            {isChecked && blankState?.isCorrect === true && (
              <Check className="w-4 h-4 text-green-600 ml-1" />
            )}
            {isChecked && blankState?.isCorrect === false && (
              <X className="w-4 h-4 text-red-600 ml-1" />
            )}
          </span>
        );
      }
      return <span key={partIndex}>{part}</span>;
    });
  };

  const getCorrectCount = () => {
    return answers.flat().filter(b => b.isCorrect === true).length;
  };

  const getTotalBlanks = () => {
    return answers.flat().length;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {items.map((item, itemIndex) => (
          <div key={itemIndex} className="p-4 bg-card rounded-lg border">
            <p className="text-lg leading-relaxed flex flex-wrap items-baseline">
              {renderTextWithBlanks(item.text, itemIndex)}
            </p>
            {item.hint && (
              <p className="text-sm text-muted-foreground mt-2 italic">
                Dica: {item.hint}
              </p>
            )}
          </div>
        ))}
      </div>

      {isChecked && (
        <div className={cn(
          "p-4 rounded-lg text-center",
          getCorrectCount() === getTotalBlanks() 
            ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
            : "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200"
        )}>
          {getCorrectCount() === getTotalBlanks() 
            ? "🎉 Parabéns! Todas as respostas estão corretas!"
            : `Você acertou ${getCorrectCount()} de ${getTotalBlanks()} lacunas.`}
        </div>
      )}

      <div className="flex flex-wrap gap-3 justify-center">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Recomeçar
        </Button>
        <Button variant="outline" onClick={() => setShowAnswers(!showAnswers)}>
          {showAnswers ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
          {showAnswers ? 'Ocultar Respostas' : 'Ver Respostas'}
        </Button>
        <Button onClick={handleCheck} disabled={showAnswers}>
          <Check className="w-4 h-4 mr-2" />
          Verificar
        </Button>
      </div>
    </div>
  );
};

export default FillBlanksExercise;
