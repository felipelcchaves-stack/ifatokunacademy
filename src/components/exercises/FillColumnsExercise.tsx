import React, { useState } from 'react';
import { CheckCircle, XCircle, RotateCcw, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FillColumnsExerciseProps {
  columns: string[];
  rows: string[][];
  blankPositions?: { row: number; col: number }[];
  onComplete?: () => void;
}

const FillColumnsExercise: React.FC<FillColumnsExerciseProps> = ({
  columns,
  rows,
  blankPositions,
  onComplete,
}) => {
  // Determine which cells should be blank (fillable)
  const blanks = blankPositions || rows.flatMap((row, rowIndex) => 
    row.map((_, colIndex) => ({ row: rowIndex, col: colIndex }))
      .filter((_, i) => i % 2 === 1) // Default: every other cell is blank
  );

  const isBlank = (rowIndex: number, colIndex: number) => 
    blanks.some(b => b.row === rowIndex && b.col === colIndex);

  // Initialize answers state
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    blanks.forEach(({ row, col }) => {
      initial[`${row}-${col}`] = '';
    });
    return initial;
  });

  const [results, setResults] = useState<Record<string, boolean | null>>({});
  const [showAnswers, setShowAnswers] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  const handleAnswerChange = (rowIndex: number, colIndex: number, value: string) => {
    const key = `${rowIndex}-${colIndex}`;
    setAnswers(prev => ({ ...prev, [key]: value }));
    // Clear result when typing
    if (results[key] !== undefined) {
      setResults(prev => ({ ...prev, [key]: null }));
    }
  };

  const handleCheck = () => {
    const newResults: Record<string, boolean> = {};
    let allCorrect = true;

    blanks.forEach(({ row, col }) => {
      const key = `${row}-${col}`;
      const userAnswer = answers[key]?.trim().toLowerCase() || '';
      const correctAnswer = rows[row][col].trim().toLowerCase();
      const isCorrect = userAnswer === correctAnswer;
      newResults[key] = isCorrect;
      if (!isCorrect) allCorrect = false;
    });

    setResults(newResults);
    setIsChecked(true);

    if (allCorrect) {
      onComplete?.();
    }
  };

  const handleReset = () => {
    const resetAnswers: Record<string, string> = {};
    blanks.forEach(({ row, col }) => {
      resetAnswers[`${row}-${col}`] = '';
    });
    setAnswers(resetAnswers);
    setResults({});
    setShowAnswers(false);
    setIsChecked(false);
  };

  const toggleShowAnswers = () => {
    setShowAnswers(!showAnswers);
  };

  const getCorrectCount = () => {
    return Object.values(results).filter(r => r === true).length;
  };

  const getTotalBlanks = () => blanks.length;

  return (
    <div className="bg-card rounded-xl border border-border shadow-soft p-6">
      <h3 className="font-serif text-xl font-semibold text-foreground mb-6">
        Complete a tabela
      </h3>

      {/* Table */}
      <div className="overflow-x-auto mb-6">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {columns.map((col, index) => (
                <th
                  key={index}
                  className="bg-muted/50 border border-border px-4 py-3 text-left font-semibold text-foreground"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => {
                  const key = `${rowIndex}-${colIndex}`;
                  const isCellBlank = isBlank(rowIndex, colIndex);
                  const result = results[key];
                  
                  return (
                    <td
                      key={colIndex}
                      className={`border border-border px-4 py-3 ${
                        isCellBlank 
                          ? result === true 
                            ? 'bg-green-50' 
                            : result === false 
                              ? 'bg-red-50' 
                              : 'bg-background'
                          : 'bg-muted/30'
                      }`}
                    >
                      {isCellBlank ? (
                        <div className="relative">
                          <Input
                            value={showAnswers ? cell : answers[key]}
                            onChange={(e) => handleAnswerChange(rowIndex, colIndex, e.target.value)}
                            placeholder="..."
                            disabled={showAnswers}
                            className={`
                              ${result === true ? 'border-green-500 bg-green-50' : ''}
                              ${result === false ? 'border-red-500 bg-red-50' : ''}
                              ${showAnswers ? 'bg-primary/10 text-primary font-medium' : ''}
                            `}
                          />
                          {result === true && (
                            <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                          )}
                          {result === false && (
                            <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                          )}
                        </div>
                      ) : (
                        <span className="text-foreground">{cell}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Results */}
      {isChecked && (
        <div className={`mb-6 p-4 rounded-lg ${
          getCorrectCount() === getTotalBlanks() 
            ? 'bg-green-100 text-green-800' 
            : 'bg-amber-100 text-amber-800'
        }`}>
          <div className="flex items-center gap-2">
            {getCorrectCount() === getTotalBlanks() ? (
              <>
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Parabéns! Você acertou tudo!</span>
              </>
            ) : (
              <>
                <span className="font-medium">
                  Você acertou {getCorrectCount()} de {getTotalBlanks()} respostas.
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleReset} variant="outline">
          <RotateCcw className="w-4 h-4 mr-2" />
          Recomeçar
        </Button>
        <Button onClick={toggleShowAnswers} variant="outline">
          <Eye className="w-4 h-4 mr-2" />
          {showAnswers ? 'Ocultar Respostas' : 'Ver Respostas'}
        </Button>
        <Button 
          onClick={handleCheck} 
          className="gradient-gold text-secondary shadow-gold"
          disabled={showAnswers}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Verificar Respostas
        </Button>
      </div>
    </div>
  );
};

export default FillColumnsExercise;
