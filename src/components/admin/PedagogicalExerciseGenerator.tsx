import React, { useState } from 'react';
import { Sparkles, Loader2, AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PedagogicalExerciseGeneratorProps {
  lessonId: string;
  lessonTitle: string;
  existingExercises?: Array<{ id: string; title: string; type: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExercisesGenerated: () => void;
  defaultContextText?: string;
  defaultFullText?: string;
}

interface GeneratedExercise {
  title: string;
  type: string;
  content: Record<string, any>;
  display_order: number;
}

const PedagogicalExerciseGenerator: React.FC<PedagogicalExerciseGeneratorProps> = ({
  lessonId,
  lessonTitle,
  existingExercises = [],
  open,
  onOpenChange,
  onExercisesGenerated,
  defaultContextText = '',
  defaultFullText = '',
}) => {
  const { toast } = useToast();
  const [contextoText, setContextoText] = useState(defaultContextText);
  const [versoText, setVersoText] = useState(defaultFullText);
  const [clearExisting, setClearExisting] = useState(false);
  const [autoPublish, setAutoPublish] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [generatedExercises, setGeneratedExercises] = useState<GeneratedExercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState({
    readingContexto: true,
    memorizationContexto: true,
    tapCompleteContexto: true,
    flashcardContexto: true,
    readingVerso: true,
    memorizationVerso: true,
    dragDropVerso: true,
  });

  const hasExistingExercises = existingExercises.length > 0;

  const needsContexto = selectedExercises.readingContexto || selectedExercises.memorizationContexto || selectedExercises.tapCompleteContexto || selectedExercises.flashcardContexto;
  const needsVerso = selectedExercises.readingVerso || selectedExercises.memorizationVerso || selectedExercises.dragDropVerso;
  const selectedCount = Object.values(selectedExercises).filter(Boolean).length;

  // Initialize with default texts when provided
  React.useEffect(() => {
    if (open && defaultContextText) {
      setContextoText(defaultContextText);
    }
    if (open && defaultFullText) {
      setVersoText(defaultFullText);
    }
  }, [open, defaultContextText, defaultFullText]);

  // Split text into lines, filtering empty ones
  const splitIntoLines = (text: string): string[] => {
    return text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  };

  // Generate flashcards from context text
  const generateFlashcards = (text: string, isContext: boolean): { front: string; back: string }[] => {
    const lines = splitIntoLines(text);
    const cards: { front: string; back: string }[] = [];

    lines.forEach((line, index) => {
      const words = line.split(' ');
      if (words.length >= 3) {
        // Create fill-in-the-blank style card
        const middleIndex = Math.floor(words.length / 2);
        const hiddenWord = words[middleIndex];
        const frontText = words.map((w, i) => i === middleIndex ? '______' : w).join(' ');
        cards.push({ front: frontText, back: hiddenWord });
      }

      // Add line order card for every 2nd line
      if (index % 2 === 0 && lines[index + 1]) {
        cards.push({
          front: `Qual verso vem depois de: "${line.substring(0, 50)}${line.length > 50 ? '...' : ''}"?`,
          back: lines[index + 1],
        });
      }
    });

    // Limit to 8 cards
    return cards.slice(0, 8);
  };

  // Generate memorization items from text
  const generateMemorizationItems = (text: string): string[] => {
    return splitIntoLines(text);
  };

  // Generate drag-drop items (lines to be ordered)
  const generateDragDropItems = (text: string): { items: string[]; targets: string[]; correctMatches: Record<string, string> } => {
    const lines = splitIntoLines(text);
    const items = [...lines].sort(() => Math.random() - 0.5); // Shuffle
    const targets = lines.map((_, i) => `Posição ${i + 1}`);
    const correctMatches: Record<string, string> = {};
    
    lines.forEach((line, i) => {
      correctMatches[`Posição ${i + 1}`] = line;
    });

    return { items, targets, correctMatches };
  };

  // Generate fill-blanks exercise - novo formato com {{blank}}
  const generateFillBlanks = (text: string): { items: { text: string; answers: string[]; hint: string }[] } => {
    const lines = splitIntoLines(text);
    const items = lines.map((line) => {
      const words = line.split(' ');
      const answers: string[] = [];
      // Hide some words (every 3rd word) and replace with {{blank}}
      const textWithBlanks = words.map((word, idx) => {
        if (idx % 3 === 1 && word.length > 0) {
          answers.push(word);
          return '{{blank}}';
        }
        return word;
      }).join(' ');
      return { text: textWithBlanks, answers, hint: '' };
    });
    return { items };
  };

  // Generate TapComplete consolidated content from text
  const generateTapCompleteContent = (text: string): { texts: string[] } => {
    const lines = splitIntoLines(text);
    // Take up to 5 lines for consolidated tap-complete
    return { texts: lines.slice(0, 5) };
  };

  const generateExercises = (): GeneratedExercise[] => {
    const exercises: GeneratedExercise[] = [];
    let order = 0;

    // ===== FASE 1 - Contexto =====
    if (selectedExercises.readingContexto) {
      exercises.push({
        title: `Contexto: ${lessonTitle}`,
        type: 'reading',
        content: { text: contextoText, audioUrl: '' },
        display_order: order++,
      });
    }
    if (selectedExercises.memorizationContexto) {
      exercises.push({
        title: `Fase 1 - Memorizar Contexto: ${lessonTitle}`,
        type: 'memorization',
        content: { items: generateMemorizationItems(contextoText) },
        display_order: order++,
      });
    }
    if (selectedExercises.tapCompleteContexto) {
      exercises.push({
        title: `Fase 1 - Ordenar Contexto: ${lessonTitle}`,
        type: 'tap-complete',
        content: generateTapCompleteContent(contextoText),
        display_order: order++,
      });
    }
    if (selectedExercises.flashcardContexto) {
      exercises.push({
        title: `Fase 1 - Revisão Contexto: ${lessonTitle}`,
        type: 'flashcard',
        content: { cards: generateFlashcards(contextoText, true) },
        display_order: order++,
      });
    }

    // ===== FASE 2 - Verso Completo =====
    if (selectedExercises.readingVerso) {
      exercises.push({
        title: `Fase 2 - Verso Completo: ${lessonTitle}`,
        type: 'reading',
        content: { text: versoText, audioUrl: '' },
        display_order: order++,
      });
    }
    if (selectedExercises.memorizationVerso) {
      exercises.push({
        title: `Fase 2 - Memorizar Verso: ${lessonTitle}`,
        type: 'memorization',
        content: { items: generateMemorizationItems(versoText) },
        display_order: order++,
      });
    }
    if (selectedExercises.dragDropVerso) {
      exercises.push({
        title: `Fase 2 - Ordenar Verso: ${lessonTitle}`,
        type: 'drag-drop',
        content: generateDragDropItems(versoText),
        display_order: order++,
      });
    }

    return exercises;
  };

  const handleGenerate = () => {
    if (selectedCount === 0) {
      toast({ title: 'Selecione ao menos 1 exercício', variant: 'destructive' });
      return;
    }
    if (needsContexto && !contextoText.trim()) {
      toast({ title: 'Texto do Contexto obrigatório', description: 'Preencha o campo de Contexto para os exercícios selecionados da Fase 1.', variant: 'destructive' });
      return;
    }
    if (needsVerso && !versoText.trim()) {
      toast({ title: 'Texto do Verso obrigatório', description: 'Preencha o campo de Verso para os exercícios selecionados da Fase 2.', variant: 'destructive' });
      return;
    }

    const exercises = generateExercises();
    setGeneratedExercises(exercises);

    if (hasExistingExercises && clearExisting) {
      setShowConfirmDialog(true);
    } else {
      saveExercises(exercises);
    }
  };

  const saveExercises = async (exercises: GeneratedExercise[]) => {
    setIsGenerating(true);

    try {
      // Clear existing exercises if requested
      if (clearExisting && hasExistingExercises) {
        const { error: deleteError } = await supabase
          .from('exercises')
          .delete()
          .eq('lesson_id', lessonId);

        if (deleteError) throw deleteError;
      }

      // Insert new exercises
      const exercisesToInsert = exercises.map(ex => ({
        lesson_id: lessonId,
        title: ex.title,
        type: ex.type,
        content: ex.content,
        display_order: clearExisting ? ex.display_order : ex.display_order + existingExercises.length,
        is_published: autoPublish,
      }));

      const { error: insertError } = await supabase
        .from('exercises')
        .insert(exercisesToInsert);

      if (insertError) throw insertError;

      toast({
        title: 'Exercícios gerados!',
        description: `${exercises.length} exercícios foram criados com sucesso.`,
      });

      onOpenChange(false);
      onExercisesGenerated();
      
      // Reset form
      setContextoText('');
      setVersoText('');
      setGeneratedExercises([]);
    } catch (error: any) {
      toast({
        title: 'Erro ao gerar exercícios',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const exerciseStructure = [
    { key: 'readingContexto' as const, phase: 'Fase 1', name: 'Contexto (Leitura)', type: 'reading' },
    { key: 'memorizationContexto' as const, phase: 'Fase 1', name: 'Memorizar Contexto', type: 'memorization' },
    { key: 'tapCompleteContexto' as const, phase: 'Fase 1', name: 'Ordenar Contexto', type: 'tap-complete' },
    { key: 'flashcardContexto' as const, phase: 'Fase 1', name: 'Revisão Contexto', type: 'flashcard' },
    { key: 'readingVerso' as const, phase: 'Fase 2', name: 'Verso Completo (Leitura)', type: 'reading' },
    { key: 'memorizationVerso' as const, phase: 'Fase 2', name: 'Memorizar Verso', type: 'memorization' },
    { key: 'dragDropVerso' as const, phase: 'Fase 2', name: 'Ordenar Verso', type: 'drag-drop' },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Gerar Método Pedagógico
            </DialogTitle>
            <DialogDescription>
              Gere automaticamente os 7 exercícios otimizados do método pedagógico a partir de dois textos base.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Warning if exercises exist */}
              {hasExistingExercises && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-500">Esta lição já possui {existingExercises.length} exercício(s)</p>
                    <p className="text-muted-foreground mt-1">
                      Você pode optar por limpar os exercícios existentes ou adicionar os novos ao final.
                    </p>
                  </div>
                </div>
              )}

              {/* Contexto Text */}
              <div className="space-y-2">
                <Label htmlFor="contexto" className="text-base font-semibold">
                  Texto Resumido (Contexto) - Fase 1
                </Label>
                <p className="text-sm text-muted-foreground">
                  Este texto será usado para gerar os 4 exercícios da Fase 1 (contexto e preparação).
                </p>
                <Textarea
                  id="contexto"
                  placeholder="Cole aqui o texto resumido/contexto da lição..."
                  value={contextoText}
                  onChange={(e) => setContextoText(e.target.value)}
                  className="min-h-[150px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {splitIntoLines(contextoText).length} linha(s) detectada(s)
                </p>
              </div>

              {/* Verso Text */}
              <div className="space-y-2">
                <Label htmlFor="verso" className="text-base font-semibold">
                  Texto Completo (Verso) - Fase 2
                </Label>
                <p className="text-sm text-muted-foreground">
                  Este texto será usado para gerar os 3 exercícios da Fase 2 (memorização profunda).
                </p>
                <Textarea
                  id="verso"
                  placeholder="Cole aqui o texto completo/verso da lição..."
                  value={versoText}
                  onChange={(e) => setVersoText(e.target.value)}
                  className="min-h-[150px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {splitIntoLines(versoText).length} linha(s) detectada(s)
                </p>
              </div>

              {/* Options */}
              <div className="space-y-4 pt-2 border-t">
                <h4 className="font-medium">Opções</h4>
                
                {hasExistingExercises && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="clearExisting"
                      checked={clearExisting}
                      onCheckedChange={(checked) => setClearExisting(checked === true)}
                    />
                    <label
                      htmlFor="clearExisting"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Limpar exercícios existentes antes de gerar
                    </label>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="autoPublish"
                    checked={autoPublish}
                    onCheckedChange={(checked) => setAutoPublish(checked === true)}
                  />
                  <label
                    htmlFor="autoPublish"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Publicar exercícios automaticamente
                  </label>
                </div>
              </div>

              {/* Exercise Selection */}
              <div className="space-y-3 pt-2 border-t">
                <h4 className="font-medium">Selecione os exercícios a gerar ({selectedCount} selecionado{selectedCount !== 1 ? 's' : ''})</h4>
                <div className="grid grid-cols-2 gap-2">
                  {exerciseStructure.map((ex, i) => (
                    <div 
                      key={i}
                      className={`flex items-center gap-2 p-2 rounded text-sm cursor-pointer transition-opacity ${
                        ex.phase === 'Fase 1' 
                          ? 'bg-primary/10 text-primary' 
                          : 'bg-accent/30 text-accent-foreground'
                      } ${!selectedExercises[ex.key] ? 'opacity-40' : ''}`}
                      onClick={() => setSelectedExercises(prev => ({ ...prev, [ex.key]: !prev[ex.key] }))}
                    >
                      <Checkbox
                        checked={selectedExercises[ex.key]}
                        onCheckedChange={(checked) => setSelectedExercises(prev => ({ ...prev, [ex.key]: checked === true }))}
                        className="pointer-events-none"
                      />
                      <span className="font-medium">{i}.</span>
                      <span>{ex.name}</span>
                      <span className="text-xs opacity-60">({ex.type})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleGenerate}
              disabled={isGenerating || !contextoText.trim() || !versoText.trim()}
              className="gradient-gold text-secondary"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar 7 Exercícios
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar substituição</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir {existingExercises.length} exercício(s) existente(s) e substituí-los por 11 novos exercícios do método pedagógico.
              <br /><br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirmDialog(false);
                saveExercises(generatedExercises);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, substituir tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PedagogicalExerciseGenerator;
