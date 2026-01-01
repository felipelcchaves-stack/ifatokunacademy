import React, { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface QuizEditorProps {
  questions: QuizQuestion[];
  onChange: (questions: QuizQuestion[]) => void;
  passingScore?: number;
  onPassingScoreChange?: (score: number) => void;
}

const QuizEditor: React.FC<QuizEditorProps> = ({
  questions,
  onChange,
  passingScore = 90,
  onPassingScoreChange,
}) => {
  const addQuestion = () => {
    onChange([
      ...questions,
      {
        question: '',
        options: ['', '', '', ''],
        correctIndex: 0,
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    onChange(newQuestions);
  };

  const updateQuestion = (index: number, field: keyof QuizQuestion, value: any) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    onChange(newQuestions);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const newQuestions = [...questions];
    const newOptions = [...newQuestions[questionIndex].options];
    newOptions[optionIndex] = value;
    newQuestions[questionIndex] = { ...newQuestions[questionIndex], options: newOptions };
    onChange(newQuestions);
  };

  const addOption = (questionIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[questionIndex].options.length < 6) {
      newQuestions[questionIndex].options.push('');
      onChange(newQuestions);
    }
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[questionIndex].options.length > 2) {
      newQuestions[questionIndex].options.splice(optionIndex, 1);
      // Adjust correct index if needed
      if (newQuestions[questionIndex].correctIndex >= optionIndex) {
        newQuestions[questionIndex].correctIndex = Math.max(0, newQuestions[questionIndex].correctIndex - 1);
      }
      onChange(newQuestions);
    }
  };

  return (
    <div className="space-y-6">
      {/* Passing Score */}
      <div className="bg-muted/50 rounded-lg p-4 mb-6">
        <Label className="mb-2 block">Nota Mínima para Aprovação</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={50}
            max={100}
            value={passingScore}
            onChange={(e) => onPassingScoreChange?.(parseInt(e.target.value) || 90)}
            className="w-24"
          />
          <span className="text-muted-foreground">%</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          O aluno precisa acertar pelo menos {passingScore}% das questões para passar.
        </p>
      </div>

      {/* Questions */}
      {questions.map((question, qIndex) => (
        <div 
          key={qIndex} 
          className="bg-card rounded-xl border border-border p-6 space-y-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <GripVertical className="w-5 h-5 cursor-grab" />
              <span className="font-medium">Pergunta {qIndex + 1}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => removeQuestion(qIndex)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Pergunta</Label>
            <Textarea
              placeholder="Digite a pergunta..."
              value={question.question}
              onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-3">
            <Label>Opções (selecione a correta)</Label>
            <RadioGroup
              value={question.correctIndex.toString()}
              onValueChange={(value) => updateQuestion(qIndex, 'correctIndex', parseInt(value))}
            >
              {question.options.map((option, oIndex) => (
                <div key={oIndex} className="flex items-center gap-3">
                  <RadioGroupItem value={oIndex.toString()} id={`q${qIndex}-o${oIndex}`} />
                  <Input
                    placeholder={`Opção ${String.fromCharCode(65 + oIndex)}`}
                    value={option}
                    onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                    className="flex-1"
                  />
                  {question.options.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeOption(qIndex, oIndex)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </RadioGroup>
            
            {question.options.length < 6 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => addOption(qIndex)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar Opção
              </Button>
            )}
          </div>
        </div>
      ))}

      {/* Add Question Button */}
      <Button
        variant="outline"
        onClick={addQuestion}
        className="w-full border-dashed"
      >
        <Plus className="w-4 h-4 mr-2" />
        Adicionar Pergunta
      </Button>
    </div>
  );
};

export default QuizEditor;
