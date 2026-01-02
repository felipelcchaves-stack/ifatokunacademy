import React, { useState } from 'react';
import { ArrowLeft, Save, Eye, EyeOff, Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface QuizContent {
  questions: QuizQuestion[];
  passingScore: number;
  timeLimit: number | null;
}

interface Exercise {
  id: string;
  lesson_id: string;
  type: 'reading' | 'drag-drop' | 'fill-columns' | 'flashcard' | 'video' | 'memorization' | 'quiz';
  title: string;
  content: Record<string, any>;
  display_order: number;
  is_published: boolean;
  created_at: string;
}

interface QuizExerciseEditorProps {
  exercise: Exercise;
  onSave: (exercise: Exercise) => void;
  onCancel: () => void;
}

const QuizExerciseEditor: React.FC<QuizExerciseEditorProps> = ({ exercise, onSave, onCancel }) => {
  const { toast } = useToast();
  const [editedExercise, setEditedExercise] = useState<Exercise>(exercise);
  
  const content = editedExercise.content as QuizContent;
  const questions = content.questions || [{ question: '', options: ['', '', '', ''], correctIndex: 0 }];
  const passingScore = content.passingScore || 90;
  const timeLimit = content.timeLimit;

  const updateContent = (key: string, value: any) => {
    setEditedExercise({
      ...editedExercise,
      content: {
        ...editedExercise.content,
        [key]: value,
      },
    });
  };

  const addQuestion = () => {
    updateContent('questions', [
      ...questions,
      { question: '', options: ['', '', '', ''], correctIndex: 0 },
    ]);
  };

  const removeQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    updateContent('questions', newQuestions);
  };

  const updateQuestion = (index: number, field: keyof QuizQuestion, value: any) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    updateContent('questions', newQuestions);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const newQuestions = [...questions];
    const newOptions = [...newQuestions[questionIndex].options];
    newOptions[optionIndex] = value;
    newQuestions[questionIndex] = { ...newQuestions[questionIndex], options: newOptions };
    updateContent('questions', newQuestions);
  };

  const handleSave = () => {
    // Validate
    if (!editedExercise.title.trim()) {
      toast({
        title: 'Título obrigatório',
        description: 'Por favor, adicione um título ao exercício.',
        variant: 'destructive',
      });
      return;
    }

    if (questions.length === 0) {
      toast({
        title: 'Perguntas obrigatórias',
        description: 'Adicione pelo menos uma pergunta ao quiz.',
        variant: 'destructive',
      });
      return;
    }

    const invalidQuestions = questions.filter(q => 
      !q.question.trim() || q.options.some(o => !o.trim())
    );

    if (invalidQuestions.length > 0) {
      toast({
        title: 'Perguntas incompletas',
        description: 'Todas as perguntas devem ter texto e todas as opções preenchidas.',
        variant: 'destructive',
      });
      return;
    }

    onSave(editedExercise);
  };

  return (
    <div className="min-h-screen bg-muted/30" data-allow-context-menu data-allow-copy>
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-serif text-xl font-bold text-foreground">
                Editar Quiz
              </h1>
              <p className="text-sm text-muted-foreground">
                {editedExercise.is_published ? 'Publicado' : 'Rascunho'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="publish"
                checked={editedExercise.is_published}
                onCheckedChange={(checked) => 
                  setEditedExercise({ ...editedExercise, is_published: checked })
                }
              />
              <Label htmlFor="publish" className="text-sm">
                {editedExercise.is_published ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <Eye className="w-4 h-4" /> Publicado
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <EyeOff className="w-4 h-4" /> Rascunho
                  </span>
                )}
              </Label>
            </div>
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button className="gradient-gold text-secondary shadow-gold" onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Salvar Quiz
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Title */}
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <Label htmlFor="title" className="text-base font-semibold">
            Título do Quiz
          </Label>
          <Input
            id="title"
            value={editedExercise.title}
            onChange={(e) => setEditedExercise({ ...editedExercise, title: e.target.value })}
            placeholder="Ex: Avaliação Final - Módulo Akapo"
            className="mt-2"
          />
        </div>

        {/* Settings */}
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <h3 className="font-semibold text-foreground mb-4">Configurações do Quiz</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="passingScore">Nota Mínima para Aprovação (%)</Label>
              <Input
                id="passingScore"
                type="number"
                min={0}
                max={100}
                value={passingScore}
                onChange={(e) => updateContent('passingScore', parseInt(e.target.value) || 90)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                O aluno precisa acertar pelo menos {passingScore}% para avançar.
              </p>
            </div>
            <div>
              <Label htmlFor="timeLimit">Limite de Tempo (minutos, opcional)</Label>
              <Input
                id="timeLimit"
                type="number"
                min={0}
                value={timeLimit || ''}
                onChange={(e) => updateContent('timeLimit', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Sem limite"
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-foreground">
              Perguntas ({questions.length})
            </h3>
            <Button onClick={addQuestion} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Pergunta
            </Button>
          </div>

          <div className="space-y-6">
            {questions.map((question, qIndex) => (
              <div
                key={qIndex}
                className="bg-muted/50 rounded-lg p-4 border border-border"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="cursor-grab text-muted-foreground mt-2">
                    <GripVertical className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="font-medium">Pergunta {qIndex + 1}</Label>
                      {questions.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(qIndex)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <Textarea
                      value={question.question}
                      onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                      placeholder="Digite a pergunta..."
                      rows={2}
                    />
                  </div>
                </div>

                <div className="ml-8">
                  <Label className="text-sm text-muted-foreground mb-3 block">
                    Opções (selecione a correta):
                  </Label>
                  <RadioGroup
                    value={question.correctIndex.toString()}
                    onValueChange={(value) => updateQuestion(qIndex, 'correctIndex', parseInt(value))}
                  >
                    <div className="space-y-2">
                      {question.options.map((option, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-3">
                          <RadioGroupItem
                            value={oIndex.toString()}
                            id={`q${qIndex}-o${oIndex}`}
                          />
                          <Input
                            value={option}
                            onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                            placeholder={`Opção ${oIndex + 1}`}
                            className={`flex-1 ${
                              question.correctIndex === oIndex
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                : ''
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground mt-2">
                    Selecione o botão ao lado da resposta correta.
                  </p>
                </div>
              </div>
            ))}
          </div>

          {questions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma pergunta adicionada.</p>
              <Button onClick={addQuestion} variant="outline" className="mt-2">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar primeira pergunta
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizExerciseEditor;