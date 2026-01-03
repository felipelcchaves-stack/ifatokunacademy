import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MousePointer, 
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

const AdminGenerateTapComplete: React.FC = () => {
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
    const texts: string[] = [];
    
    for (const item of items) {
      if (item.summary && item.summary.split(/\s+/).filter(Boolean).length >= 3) {
        texts.push(item.summary);
      }
      if (item.intermediate && item.intermediate.split(/\s+/).filter(Boolean).length >= 3) {
        texts.push(item.intermediate);
      }
      if (item.text && item.text.split(/\s+/).filter(Boolean).length >= 3) {
        texts.push(item.text);
      }
    }
    
    return texts;
  };

  const fetchMemorizationExercises = async () => {
    try {
      setLoading(true);
      
      // Fetch memorization exercises
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

      // Transform data structure
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

      // Get all lesson IDs to fetch existing tap-complete exercises
      const lessonIds = [...new Set(transformed.map(e => e.lesson_id))];
      
      // Fetch all existing tap-complete exercises for these lessons
      const { data: existingTapComplete } = await supabase
        .from('exercises')
        .select('lesson_id, content')
        .eq('type', 'tap-complete')
        .in('lesson_id', lessonIds);

      // Calculate status for each memorization exercise
      const statusMap: Record<string, ExerciseStatus> = {};
      
      for (const exercise of transformed) {
        const texts = getTextsFromExercise(exercise);
        const lessonTapCompletes = existingTapComplete?.filter(
          tc => tc.lesson_id === exercise.lesson_id
        ) || [];
        
        // Count how many texts already have tap-complete (exact match)
        let existingCount = 0;
        for (const text of texts) {
          const exists = lessonTapCompletes.some(tc => {
            const tcContent = tc.content as { text?: string };
            return tcContent?.text === text;
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

  const generateTapCompleteExercises = async () => {
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
        // Get max display_order for this lesson
        const { data: existingExercises } = await supabase
          .from('exercises')
          .select('display_order')
          .eq('lesson_id', exercise.lesson_id)
          .order('display_order', { ascending: false })
          .limit(1);

        let maxOrder = existingExercises?.[0]?.display_order ?? -1;

        // Fetch existing tap-complete for this lesson with exact content
        const { data: existingTapComplete } = await supabase
          .from('exercises')
          .select('content')
          .eq('lesson_id', exercise.lesson_id)
          .eq('type', 'tap-complete');

        const existingTexts = new Set(
          (existingTapComplete || []).map(tc => {
            const content = tc.content as { text?: string };
            return content?.text;
          }).filter(Boolean)
        );

        // Extract texts from memorization items
        const texts = getTextsFromExercise(exercise);
        let createdCount = 0;

        for (const text of texts) {
          // Skip if tap-complete already exists (exact match)
          if (existingTexts.has(text)) continue;

          maxOrder++;

          const { error: insertError } = await supabase
            .from('exercises')
            .insert({
              lesson_id: exercise.lesson_id,
              type: 'tap-complete',
              title: `Ordenar: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
              content: { 
                text,
                audioUrl: '', 
              },
              display_order: maxOrder,
              is_published: true,
            });

          if (insertError) throw insertError;
          createdCount++;
          
          // Add to set to prevent duplicates within the same run
          existingTexts.add(text);
        }

        newResults.push({
          exerciseId: exercise.id,
          success: true,
          message: createdCount > 0 
            ? `${createdCount} exercício(s) criado(s) e publicado(s)` 
            : 'Todos os textos já têm TapComplete',
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
      description: `${totalCreated} exercícios TapComplete criados e publicados de ${successCount}/${selected.length} exercícios processados.`,
    });

    // Refresh status after generation
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
        <span className="text-foreground">Gerar TapComplete</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/admin')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div className="flex-1">
          <h1 className="font-serif text-2xl font-bold text-foreground">
            Gerar Exercícios TapComplete
          </h1>
          <p className="text-muted-foreground">
            Crie exercícios de ordenar palavras a partir dos textos de memorização
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <div className="flex gap-3">
          <MousePointer className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">Como funciona:</p>
            <ul className="text-sm text-muted-foreground mt-1 space-y-1">
              <li>• Para cada exercício de memorização selecionado, serão criados exercícios TapComplete</li>
              <li>• Cada nível (resumo, intermediário, completo) com 3+ palavras gera um exercício</li>
              <li>• Os exercícios são criados e <strong>publicados automaticamente</strong></li>
              <li>• Textos que já têm TapComplete são ignorados (sem duplicatas)</li>
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
          <p className="text-sm text-muted-foreground">TapComplete pendentes</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {Object.values(exerciseStatus).reduce((sum, s) => sum + s.existingCount, 0)}
          </p>
          <p className="text-sm text-muted-foreground">TapComplete existentes</p>
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
              onClick={generateTapCompleteExercises}
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
                ? 'Todos os exercícios já têm TapComplete completos!' 
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

export default AdminGenerateTapComplete;
