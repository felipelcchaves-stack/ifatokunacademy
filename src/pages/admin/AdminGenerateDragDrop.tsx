import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  GripVertical, 
  Loader2, 
  CheckCircle, 
  XCircle,
  Play,
  Brain,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MemorizationExercise {
  id: string;
  title: string;
  lesson_id: string;
  content: {
    items?: Array<{ text?: string; summary?: string; intermediate?: string }>;
  };
  lesson?: {
    id: string;
    title: string;
    module?: {
      id: string;
      title: string;
    };
  };
}

interface GenerationResult {
  exerciseId: string;
  success: boolean;
  message: string;
  createdCount: number;
}

interface ExerciseStatus {
  totalTexts: number;
  existingCount: number;
  pendingCount: number;
}

const AdminGenerateDragDrop: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [exercises, setExercises] = useState<MemorizationExercise[]>([]);
  const [exerciseStatus, setExerciseStatus] = useState<Record<string, ExerciseStatus>>({});
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [showOnlyPending, setShowOnlyPending] = useState(true);

  useEffect(() => {
    fetchMemorizationExercises();
  }, []);

  const getTextsFromExercise = (exercise: MemorizationExercise): string[] => {
    const items = exercise.content?.items || [];
    const textsSet = new Set<string>();
    
    for (const item of items) {
      // For drag-drop, we use texts with at least 4 words to split into parts
      if (item.summary && item.summary.split(/\s+/).filter(Boolean).length >= 4) {
        textsSet.add(item.summary.trim());
      }
      if (item.intermediate && item.intermediate.split(/\s+/).filter(Boolean).length >= 4) {
        textsSet.add(item.intermediate.trim());
      }
      if (item.text && item.text.split(/\s+/).filter(Boolean).length >= 4) {
        textsSet.add(item.text.trim());
      }
    }
    
    return Array.from(textsSet);
  };

  const fetchMemorizationExercises = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('exercises')
        .select(`
          id,
          title,
          lesson_id,
          content,
          lessons!inner (
            id,
            title,
            modules!inner (
              id,
              title
            )
          )
        `)
        .eq('type', 'memorization')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformed: MemorizationExercise[] = (data || []).map((ex: any) => ({
        id: ex.id,
        title: ex.title,
        lesson_id: ex.lesson_id,
        content: ex.content,
        lesson: {
          id: ex.lessons.id,
          title: ex.lessons.title,
          module: {
            id: ex.lessons.modules.id,
            title: ex.lessons.modules.title,
          },
        },
      }));

      const lessonIds = [...new Set(transformed.map(e => e.lesson_id))];
      
      const { data: existingDragDrop } = await supabase
        .from('exercises')
        .select('lesson_id, content')
        .eq('type', 'drag-drop')
        .in('lesson_id', lessonIds);

      const statusMap: Record<string, ExerciseStatus> = {};
      
      for (const exercise of transformed) {
        const texts = getTextsFromExercise(exercise);
        const lessonDragDrops = existingDragDrop?.filter(
          dd => dd.lesson_id === exercise.lesson_id
        ) || [];
        
        let existingCount = 0;
        for (const text of texts) {
          const exists = lessonDragDrops.some(dd => {
            const ddContent = dd.content as { sourceText?: string };
            return ddContent?.sourceText?.trim() === text.trim();
          });
          if (exists) existingCount++;
        }
        
        statusMap[exercise.id] = {
          totalTexts: texts.length,
          existingCount,
          pendingCount: texts.length - existingCount,
        };
      }

      setExercises(transformed);
      setExerciseStatus(statusMap);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar exercícios',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleExercise = (id: string) => {
    setSelectedExercises(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const filteredExercises = showOnlyPending
    ? exercises.filter(e => (exerciseStatus[e.id]?.pendingCount || 0) > 0)
    : exercises;

  const selectAll = () => {
    if (selectedExercises.size === filteredExercises.length) {
      setSelectedExercises(new Set());
    } else {
      setSelectedExercises(new Set(filteredExercises.map(e => e.id)));
    }
  };

  // Generate drag-drop content from text
  const generateDragDropContent = (text: string) => {
    const words = text.split(/\s+/).filter(Boolean);
    
    // Split into ~3-4 parts for drag and drop
    const partCount = Math.min(4, Math.max(3, Math.ceil(words.length / 3)));
    const wordsPerPart = Math.ceil(words.length / partCount);
    
    const items: string[] = [];
    const targets: string[] = [];
    const correctMatches: Record<string, string> = {};
    
    for (let i = 0; i < partCount; i++) {
      const start = i * wordsPerPart;
      const end = Math.min(start + wordsPerPart, words.length);
      const part = words.slice(start, end).join(' ');
      
      if (part) {
        const itemLabel = part;
        const targetLabel = `Posição ${i + 1}`;
        
        items.push(itemLabel);
        targets.push(targetLabel);
        correctMatches[itemLabel] = targetLabel;
      }
    }
    
    return {
      items,
      targets,
      correctMatches,
      sourceText: text,
    };
  };

  const generateDragDropExercises = async () => {
    if (selectedExercises.size === 0) {
      toast({
        title: 'Selecione exercícios',
        description: 'Selecione pelo menos um exercício de memorização.',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);
    setProgress(0);
    setResults([]);

    const selected = exercises.filter(e => selectedExercises.has(e.id));
    const newResults: GenerationResult[] = [];

    for (let i = 0; i < selected.length; i++) {
      const exercise = selected[i];
      
      try {
        const { data: existingExercises } = await supabase
          .from('exercises')
          .select('display_order')
          .eq('lesson_id', exercise.lesson_id)
          .order('display_order', { ascending: false })
          .limit(1);

        let maxOrder = existingExercises?.[0]?.display_order ?? -1;

        const { data: existingDragDrop } = await supabase
          .from('exercises')
          .select('content')
          .eq('lesson_id', exercise.lesson_id)
          .eq('type', 'drag-drop');

        const existingTexts = new Set(
          (existingDragDrop || []).map(dd => {
            const content = dd.content as { sourceText?: string };
            return content?.sourceText?.trim();
          }).filter(Boolean)
        );

        const texts = getTextsFromExercise(exercise);
        let createdCount = 0;

        for (const text of texts) {
          if (existingTexts.has(text.trim())) continue;

          maxOrder++;

          const content = generateDragDropContent(text);

          const { error: insertError } = await supabase
            .from('exercises')
            .insert({
              lesson_id: exercise.lesson_id,
              type: 'drag-drop',
              title: `Ordenar: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
              content,
              display_order: maxOrder,
              is_published: true,
            });

          if (insertError) throw insertError;
          createdCount++;
          
          existingTexts.add(text);
        }

        newResults.push({
          exerciseId: exercise.id,
          success: true,
          message: createdCount > 0 
            ? `${createdCount} exercício(s) criado(s) e publicado(s)` 
            : 'Todos os textos já têm Drag & Drop',
          createdCount,
        });
      } catch (error: any) {
        newResults.push({
          exerciseId: exercise.id,
          success: false,
          message: error.message,
          createdCount: 0,
        });
      }

      setProgress(((i + 1) / selected.length) * 100);
      setResults([...newResults]);
    }

    setGenerating(false);

    const totalCreated = newResults.reduce((sum, r) => sum + r.createdCount, 0);
    const successCount = newResults.filter(r => r.success).length;

    toast({
      title: 'Geração concluída!',
      description: `${totalCreated} exercícios Drag & Drop criados e publicados de ${successCount}/${selected.length} exercícios processados.`,
    });

    fetchMemorizationExercises();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalPending = Object.values(exerciseStatus).reduce((sum, s) => sum + s.pendingCount, 0);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/admin" className="hover:text-foreground">Admin</Link>
        <span>/</span>
        <span className="text-foreground">Gerar Drag & Drop</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/admin')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div className="flex-1">
          <h1 className="font-serif text-2xl font-bold text-foreground">
            Gerar Exercícios Drag & Drop
          </h1>
          <p className="text-muted-foreground">
            Crie exercícios de arrastar e soltar a partir dos textos de memorização
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <div className="flex gap-3">
          <GripVertical className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">Como funciona:</p>
            <ul className="text-sm text-muted-foreground mt-1 space-y-1">
              <li>• Para cada exercício de memorização selecionado, serão criados exercícios Drag & Drop</li>
              <li>• Cada nível (resumo, intermediário, completo) com 4+ palavras gera um exercício</li>
              <li>• O texto é dividido em partes que o aluno deve reorganizar na ordem correta</li>
              <li>• Os exercícios são criados e <strong>publicados automaticamente</strong></li>
              <li>• Textos que já têm Drag & Drop são ignorados (sem duplicatas)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{exercises.length}</p>
          <p className="text-sm text-muted-foreground">Exercícios de memorização</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{totalPending}</p>
          <p className="text-sm text-muted-foreground">Drag & Drop pendentes</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {Object.values(exerciseStatus).reduce((sum, s) => sum + s.existingCount, 0)}
          </p>
          <p className="text-sm text-muted-foreground">Drag & Drop existentes</p>
        </div>
      </div>

      {/* Progress */}
      {generating && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground font-medium">Gerando exercícios...</span>
            <span className="text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Results */}
      {results.length > 0 && !generating && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="font-medium text-foreground">Resultados:</h3>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {results.map((result, idx) => {
              const exercise = exercises.find(e => e.id === result.exerciseId);
              return (
                <div 
                  key={idx}
                  className={`flex items-center gap-2 text-sm p-2 rounded-lg ${
                    result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span className="truncate">{exercise?.title}</span>
                  <span className="text-xs opacity-75 ml-auto flex-shrink-0">
                    {result.message}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selection */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Checkbox 
              checked={selectedExercises.size === filteredExercises.length && filteredExercises.length > 0}
              onCheckedChange={selectAll}
            />
            <span className="font-medium text-foreground">
              {selectedExercises.size} de {filteredExercises.length} selecionados
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="show-pending"
                checked={showOnlyPending}
                onCheckedChange={setShowOnlyPending}
              />
              <Label htmlFor="show-pending" className="text-sm text-muted-foreground flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Só pendentes
              </Label>
            </div>
            <Button
              onClick={generateDragDropExercises}
              disabled={generating || selectedExercises.size === 0}
              className="gradient-gold text-secondary shadow-gold"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Gerar e Publicar
                </>
              )}
            </Button>
          </div>
        </div>

        {filteredExercises.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>
              {showOnlyPending 
                ? 'Todos os exercícios já têm Drag & Drop completos!' 
                : 'Nenhum exercício de memorização encontrado.'
              }
            </p>
            {showOnlyPending && exercises.length > 0 && (
              <Button
                variant="link"
                onClick={() => setShowOnlyPending(false)}
                className="mt-2"
              >
                Ver todos os exercícios
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredExercises.map(exercise => {
              const status = exerciseStatus[exercise.id];
              const result = results.find(r => r.exerciseId === exercise.id);
              const isComplete = status?.pendingCount === 0;
              
              return (
                <div 
                  key={exercise.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    selectedExercises.has(exercise.id) 
                      ? 'bg-primary/5 border-primary/30' 
                      : 'bg-muted/30 border-border hover:border-primary/20'
                  } ${result ? (result.success ? 'ring-1 ring-green-300' : 'ring-1 ring-red-300') : ''}`}
                >
                  <Checkbox
                    checked={selectedExercises.has(exercise.id)}
                    onCheckedChange={() => toggleExercise(exercise.id)}
                    disabled={generating || isComplete}
                  />
                  <Brain className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{exercise.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {exercise.lesson?.module?.title} → {exercise.lesson?.title}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {isComplete ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Completo
                      </Badge>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-primary">
                          {status?.pendingCount || 0} pendentes
                        </p>
                        <p className="text-xs text-muted-foreground">
                          de {status?.totalTexts || 0} textos
                        </p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminGenerateDragDrop;
