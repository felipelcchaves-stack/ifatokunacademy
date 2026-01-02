import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Wand2, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  BookOpen,
  FileText,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Module {
  id: string;
  title: string;
  type: string;
}

interface LessonWithContext {
  id: string;
  title: string;
  contextText: string;
  contextExerciseId: string;
  hasPhase1: boolean;
  phase1Count: number;
  phase2Count: number;
}

interface GenerationResult {
  success: boolean;
  lessonTitle: string;
  lessonId: string;
  exercisesCreated?: number;
  error?: string;
}

const AdminGeneratePhase1: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  const [lessons, setLessons] = useState<LessonWithContext[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [options, setOptions] = useState({
    publishExercises: true,
    onlyMissingPhase1: true,
  });

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('id, title, type')
        .order('display_order');
      
      if (error) throw error;
      setModules(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar módulos',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const analyzeLessons = async () => {
    if (!selectedModuleId) {
      toast({
        title: 'Selecione um módulo',
        description: 'Escolha o módulo para analisar.',
        variant: 'destructive',
      });
      return;
    }

    setAnalyzing(true);
    setLessons([]);

    try {
      // Fetch lessons for the module
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('id, title')
        .eq('module_id', selectedModuleId)
        .order('display_order');

      if (lessonsError) throw lessonsError;

      const analyzedLessons: LessonWithContext[] = [];

      for (const lesson of lessonsData || []) {
        // Fetch exercises for each lesson
        const { data: exercises, error: exError } = await supabase
          .from('exercises')
          .select('id, title, type, content')
          .eq('lesson_id', lesson.id)
          .order('display_order');

        if (exError) throw exError;

        // Find context exercise
        const contextExercise = exercises?.find(e => 
          e.title.startsWith('Contexto:')
        );

        // Count Phase 1 and Phase 2 exercises
        const phase1Exercises = exercises?.filter(e => 
          e.title.startsWith('Fase 1')
        ) || [];
        const phase2Exercises = exercises?.filter(e => 
          e.title.startsWith('Fase 2')
        ) || [];

        if (contextExercise) {
          const content = contextExercise.content as any;
          analyzedLessons.push({
            id: lesson.id,
            title: lesson.title,
            contextText: content?.text || '',
            contextExerciseId: contextExercise.id,
            hasPhase1: phase1Exercises.length >= 5,
            phase1Count: phase1Exercises.length,
            phase2Count: phase2Exercises.length,
          });
        }
      }

      setLessons(analyzedLessons);
      
      const missingPhase1 = analyzedLessons.filter(l => !l.hasPhase1);
      toast({
        title: 'Análise concluída!',
        description: `${analyzedLessons.length} lições analisadas. ${missingPhase1.length} precisam de exercícios Fase 1.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro na análise',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const splitContextIntoParts = (text: string): string[] => {
    // Split by sentences, aiming for 5-7 parts
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim());
    
    if (sentences.length <= 7) {
      return sentences;
    }

    // Group sentences into 6-7 parts
    const targetParts = 7;
    const sentencesPerPart = Math.ceil(sentences.length / targetParts);
    const parts: string[] = [];
    
    for (let i = 0; i < sentences.length; i += sentencesPerPart) {
      parts.push(sentences.slice(i, i + sentencesPerPart).join(' '));
    }
    
    return parts;
  };

  const generatePhase1Exercises = (lessonTitle: string, contextText: string) => {
    const exercises: any[] = [];
    const parts = splitContextIntoParts(contextText);
    const cleanTitle = lessonTitle.replace(/^(Contexto:\s*)?/, '');

    // Exercise 1: Memorizar Contexto (memorization with full text in lines)
    exercises.push({
      type: 'memorization',
      title: `Fase 1 - Memorizar Contexto: ${cleanTitle}`,
      display_order: 1,
      content: {
        items: parts.map((part, idx) => ({
          text: part,
          hint: `Parte ${idx + 1}`,
        })),
      },
    });

    // Exercise 2: Ordenar Contexto (drag-drop)
    const targets = parts.map((_, idx) => `${idx + 1}ª Parte`);
    const correctMatches: Record<string, string> = {};
    parts.forEach((part, idx) => {
      correctMatches[part] = `${idx + 1}ª Parte`;
    });
    
    exercises.push({
      type: 'drag-drop',
      title: `Fase 1 - Ordenar Contexto: ${cleanTitle}`,
      display_order: 2,
      content: {
        items: parts,
        targets: targets,
        correctMatches: correctMatches,
      },
    });

    // Exercise 3: Completar Contexto (fill-columns) - pick key words from each part
    const rows: string[][] = [];
    const blankPositions: { row: number; col: number }[] = [];
    
    parts.slice(0, 5).forEach((part, idx) => {
      const words = part.split(/\s+/).filter(w => w.length > 4);
      if (words.length >= 2) {
        // Pick a significant word (not common words)
        const significantWords = words.filter(w => 
          !['para', 'como', 'quando', 'onde', 'porque', 'porém', 'assim', 'então', 'também', 'ainda', 'sobre', 'depois', 'antes'].includes(w.toLowerCase())
        );
        
        if (significantWords.length > 0) {
          const wordToBlank = significantWords[Math.floor(significantWords.length / 2)];
          const lineWithBlank = part.replace(wordToBlank, '___');
          rows.push([lineWithBlank, wordToBlank]);
          blankPositions.push({ row: idx, col: 1 });
        } else {
          rows.push([part, '']);
        }
      } else {
        rows.push([part, '']);
      }
    });

    if (rows.length > 0 && blankPositions.length > 0) {
      exercises.push({
        type: 'fill-columns',
        title: `Fase 1 - Completar Contexto: ${cleanTitle}`,
        display_order: 3,
        content: {
          columns: ['Frase', 'Palavra Faltante'],
          rows: rows,
          blankPositions: blankPositions,
        },
      });
    }

    // Exercise 4: Revisão Contexto (flashcard) - questions about the context
    const flashcardCards = generateFlashcardsFromContext(contextText, cleanTitle);
    
    exercises.push({
      type: 'flashcard',
      title: `Fase 1 - Revisão Contexto: ${cleanTitle}`,
      display_order: 4,
      content: {
        cards: flashcardCards,
      },
    });

    // Exercise 5: Fixação do Contexto (memorization) - shorter parts for final memorization
    exercises.push({
      type: 'memorization',
      title: `Fase 1 - Fixação do Contexto: ${cleanTitle}`,
      display_order: 5,
      content: {
        items: parts.map((part, idx) => ({
          text: part,
          hint: `Parte ${idx + 1}`,
        })),
      },
    });

    return exercises;
  };

  const generateFlashcardsFromContext = (contextText: string, title: string): Array<{front: string; back: string}> => {
    const cards: Array<{front: string; back: string}> = [];
    
    // Generic questions that work for most contexts
    cards.push({
      front: `Quem é o personagem principal deste contexto?`,
      back: `Verifique no texto: "${contextText.slice(0, 150)}..."`,
    });

    // Find key elements in the text
    if (contextText.includes('Òrúnmìlà') || contextText.includes('Orunmila')) {
      cards.push({
        front: 'Quem foi consultado para orientação espiritual?',
        back: 'Òrúnmìlà - o grande sacerdote de Ifá',
      });
    }

    if (contextText.includes('èbó') || contextText.includes('ebo')) {
      cards.push({
        front: 'O que foi prescrito como solução espiritual?',
        back: 'Um èbó (sacrifício/oferenda) conforme orientação de Ifá.',
      });
    }

    if (contextText.includes('iré') || contextText.includes('ire')) {
      cards.push({
        front: 'Qual tipo de destino foi revelado?',
        back: 'Iré (boa sorte, bênção) - o caminho positivo indicado por Ifá.',
      });
    }

    // Add context summary card
    cards.push({
      front: `Qual é o ensinamento principal de ${title}?`,
      back: contextText.length > 200 
        ? `${contextText.slice(-200)}` 
        : contextText,
    });

    // Ensure at least 5 cards
    while (cards.length < 5) {
      cards.push({
        front: `Resuma a parte ${cards.length + 1} do contexto.`,
        back: 'Releia o contexto e pratique a memorização.',
      });
    }

    return cards.slice(0, 7);
  };

  const handleGenerate = async () => {
    const lessonsToProcess = options.onlyMissingPhase1 
      ? lessons.filter(l => !l.hasPhase1)
      : lessons;

    if (lessonsToProcess.length === 0) {
      toast({
        title: 'Nenhuma lição para processar',
        description: options.onlyMissingPhase1 
          ? 'Todas as lições já possuem exercícios Fase 1.'
          : 'Nenhuma lição encontrada.',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);
    setProgress(0);
    setResults([]);

    const generationResults: GenerationResult[] = [];

    for (let i = 0; i < lessonsToProcess.length; i++) {
      const lesson = lessonsToProcess[i];
      
      try {
        // Generate exercises
        const exercises = generatePhase1Exercises(lesson.title, lesson.contextText);
        let exercisesCreated = 0;

        // Delete existing Phase 1 exercises if regenerating
        if (!options.onlyMissingPhase1 || lesson.phase1Count > 0) {
          const { error: deleteError } = await supabase
            .from('exercises')
            .delete()
            .eq('lesson_id', lesson.id)
            .like('title', 'Fase 1%');

          if (deleteError) {
            console.warn('Error deleting old Phase 1 exercises:', deleteError);
          }
        }

        // Insert new exercises
        for (const exercise of exercises) {
          const { error: insertError } = await supabase
            .from('exercises')
            .insert({
              lesson_id: lesson.id,
              title: exercise.title,
              type: exercise.type,
              content: exercise.content,
              display_order: exercise.display_order,
              is_published: options.publishExercises,
            });

          if (!insertError) {
            exercisesCreated++;
          } else {
            console.error('Error inserting exercise:', insertError);
          }
        }

        generationResults.push({
          success: true,
          lessonTitle: lesson.title,
          lessonId: lesson.id,
          exercisesCreated,
        });
      } catch (error: any) {
        generationResults.push({
          success: false,
          lessonTitle: lesson.title,
          lessonId: lesson.id,
          error: error.message,
        });
      }

      setProgress(((i + 1) / lessonsToProcess.length) * 100);
    }

    setResults(generationResults);
    setGenerating(false);
    setShowResultsDialog(true);

    const successCount = generationResults.filter(r => r.success).length;
    const totalExercises = generationResults.reduce((sum, r) => sum + (r.exercisesCreated || 0), 0);

    toast({
      title: 'Geração concluída!',
      description: `${successCount} lições processadas. ${totalExercises} exercícios criados.`,
    });

    // Refresh analysis
    if (selectedModuleId) {
      analyzeLessons();
    }
  };

  const lessonsNeedingPhase1 = lessons.filter(l => !l.hasPhase1);

  return (
    <div data-allow-context-menu data-allow-copy>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link to="/admin" className="hover:text-foreground">Admin</Link>
        <span>/</span>
        <span className="text-foreground">Gerar Fase 1</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={() => navigate('/admin')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div className="flex-1">
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Gerar Exercícios Fase 1 em Lote
          </h1>
          <p className="text-muted-foreground mt-1">
            Crie automaticamente os 5 exercícios da Fase 1 (baseados no contexto) para todas as lições
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="font-serif flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              Configuração
            </CardTitle>
            <CardDescription>
              Selecione o módulo e as opções de geração
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Module Selection */}
            <div className="space-y-2">
              <Label>Módulo</Label>
              <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um módulo" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((mod) => (
                    <SelectItem key={mod.id} value={mod.id}>
                      {mod.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Analyze Button */}
            <Button 
              onClick={analyzeLessons} 
              disabled={!selectedModuleId || analyzing}
              className="w-full"
              variant="outline"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Analisar Lições
                </>
              )}
            </Button>

            {/* Options */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="only-missing">Apenas sem Fase 1</Label>
                  <p className="text-xs text-muted-foreground">
                    Gerar apenas para lições sem exercícios
                  </p>
                </div>
                <Switch
                  id="only-missing"
                  checked={options.onlyMissingPhase1}
                  onCheckedChange={(checked) => 
                    setOptions(prev => ({ ...prev, onlyMissingPhase1: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="publish">Publicar exercícios</Label>
                  <p className="text-xs text-muted-foreground">
                    Publicar automaticamente ao criar
                  </p>
                </div>
                <Switch
                  id="publish"
                  checked={options.publishExercises}
                  onCheckedChange={(checked) => 
                    setOptions(prev => ({ ...prev, publishExercises: checked }))
                  }
                />
              </div>
            </div>

            {/* Generate Button */}
            {lessons.length > 0 && (
              <Button 
                onClick={handleGenerate} 
                disabled={generating || lessonsNeedingPhase1.length === 0}
                className="w-full gradient-gold text-secondary shadow-gold"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Gerar {options.onlyMissingPhase1 ? lessonsNeedingPhase1.length : lessons.length} Lições
                  </>
                )}
              </Button>
            )}

            {generating && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-center text-muted-foreground">
                  {Math.round(progress)}% concluído
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lessons Analysis */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-serif flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Lições Analisadas
              {lessons.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {lessons.length} total
                </Badge>
              )}
              {lessonsNeedingPhase1.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {lessonsNeedingPhase1.length} sem Fase 1
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Status dos exercícios Fase 1 em cada lição
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lessons.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Selecione um módulo e clique em "Analisar Lições"</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {lessons.map((lesson) => (
                    <div 
                      key={lesson.id}
                      className={`p-4 rounded-lg border ${
                        lesson.hasPhase1 
                          ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                          : 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{lesson.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Contexto: {lesson.contextText.length} caracteres
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Badge variant={lesson.hasPhase1 ? "default" : "secondary"}>
                            Fase 1: {lesson.phase1Count}
                          </Badge>
                          <Badge variant="outline">
                            Fase 2: {lesson.phase2Count}
                          </Badge>
                          {lesson.hasPhase1 ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Alert */}
      <Alert className="mt-6">
        <Wand2 className="h-4 w-4" />
        <AlertTitle>Como funciona a geração automática</AlertTitle>
        <AlertDescription>
          <p className="mb-2">
            A ferramenta gera 5 exercícios da Fase 1 baseados no texto do exercício "Contexto" de cada lição:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li><strong>Memorizar Contexto</strong> - Divide o contexto em partes para memorização progressiva</li>
            <li><strong>Ordenar Contexto</strong> - Exercício de arrastar e soltar para ordenar as partes</li>
            <li><strong>Completar Contexto</strong> - Preencher lacunas com palavras-chave do texto</li>
            <li><strong>Revisão Contexto</strong> - Flashcards com perguntas sobre o conteúdo</li>
            <li><strong>Fixação do Contexto</strong> - Memorização final das partes do texto</li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* Results Dialog */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">Resultados da Geração</DialogTitle>
            <DialogDescription>
              {results.filter(r => r.success).length} de {results.length} lições processadas com sucesso
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {results.map((result, idx) => (
              <div 
                key={idx}
                className={`p-3 rounded-lg border flex items-center gap-3 ${
                  result.success 
                    ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' 
                    : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
                }`}
              >
                {result.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{result.lessonTitle}</p>
                  <p className="text-sm text-muted-foreground">
                    {result.success 
                      ? `${result.exercisesCreated} exercícios criados`
                      : result.error
                    }
                  </p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminGeneratePhase1;
