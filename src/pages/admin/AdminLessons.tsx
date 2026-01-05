import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  MoreVertical, 
  BookOpen, 
  Edit, 
  Trash2,
  GripVertical,
  Clock,
  Eye,
  EyeOff,
  Sparkles,
  MousePointer,
  RefreshCw
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import PedagogicalExerciseGenerator from '@/components/admin/PedagogicalExerciseGenerator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  display_order: number;
  is_published: boolean;
  created_at: string;
}

interface Module {
  id: string;
  title: string;
  type: string;
  level: string | null;
  theme: string | null;
  color: string | null;
}

interface SortableLessonItemProps {
  lesson: Lesson;
  index: number;
  moduleId: string;
  navigate: (path: string) => void;
  onEdit: (lesson: Lesson) => void;
  onTogglePublish: (lesson: Lesson) => void;
  onDelete: (lesson: Lesson) => void;
  onRegenerate: (lesson: Lesson) => void;
}

const SortableLessonItem: React.FC<SortableLessonItemProps> = ({
  lesson,
  index,
  moduleId,
  navigate,
  onEdit,
  onTogglePublish,
  onDelete,
  onRegenerate,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card rounded-xl border border-border shadow-soft p-4 flex items-center gap-4 group hover:shadow-elevated transition-shadow ${
        isDragging ? 'opacity-50 shadow-lg z-50' : ''
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
      >
        <GripVertical className="w-5 h-5" />
      </div>

      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <span className="font-serif font-bold text-primary">{index + 1}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground truncate">{lesson.title}</h3>
          {lesson.is_published ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              Publicada
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
              Rascunho
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {lesson.description || 'Sem descrição'}
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span>{lesson.duration_minutes || 30} min</span>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate(`/admin/modules/${moduleId}/lessons/${lesson.id}/exercises`)}
      >
        Exercícios
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(lesson)}>
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onRegenerate(lesson)}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Regenerar Exercícios
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onTogglePublish(lesson)}>
            {lesson.is_published ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Despublicar
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Publicar
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => onDelete(lesson)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

const AdminLessons: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session } = useAuth();

  // Helper function to ensure valid session before write operations
  const ensureSession = async (): Promise<boolean> => {
    // First check from context
    if (session?.access_token) {
      return true;
    }
    
    // Try to get fresh session
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    
    if (!currentSession) {
      toast({
        title: 'Sessão expirada',
        description: 'Por favor, faça login novamente.',
        variant: 'destructive',
      });
      navigate('/login');
      return false;
    }
    
    return true;
  };
  
  const [module, setModule] = useState<Module | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [newLesson, setNewLesson] = useState({
    title: '',
    description: '',
    duration_minutes: 30,
    is_published: false,
    contextText: '',
    fullText: '',
    autoGenerateTapComplete: true,
    autoGenerateDragDrop: true,
  });

  // State for post-creation flow
  const [createdLessonData, setCreatedLessonData] = useState<{id: string; title: string} | null>(null);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const [isPedagogicalGeneratorOpen, setIsPedagogicalGeneratorOpen] = useState(false);
  const [pendingTexts, setPendingTexts] = useState({ context: '', full: '' });

  useEffect(() => {
    if (moduleId) {
      fetchModuleAndLessons();
    }
  }, [moduleId]);

  const fetchModuleAndLessons = async () => {
    try {
      setLoading(true);
      
      // Fetch module
      const { data: moduleData, error: moduleError } = await supabase
        .from('modules')
        .select('*')
        .eq('id', moduleId)
        .maybeSingle();

      if (moduleError) throw moduleError;
      setModule(moduleData);

      // Fetch lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('module_id', moduleId)
        .order('display_order', { ascending: true });

      if (lessonsError) throw lessonsError;
      setLessons(lessonsData || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLesson = async () => {
    // Ensure valid session before write operation
    if (!await ensureSession()) return;
    
    try {
      const maxOrder = lessons.reduce((max, l) => Math.max(max, l.display_order), -1);
      
      const { data, error } = await supabase
        .from('lessons')
        .insert({
          module_id: moduleId,
          title: newLesson.title,
          description: newLesson.description || null,
          duration_minutes: newLesson.duration_minutes,
          display_order: maxOrder + 1,
          is_published: newLesson.is_published,
        })
        .select()
        .single();

      if (error) throw error;

      setLessons([...lessons, data]);
      setIsCreateDialogOpen(false);
      
      // Check if texts are provided
      const hasContextText = newLesson.contextText.trim().length > 0;
      const hasFullText = newLesson.fullText.trim().length > 0;
      const textsArray = [
        hasContextText ? newLesson.contextText : null,
        hasFullText ? newLesson.fullText : null,
      ].filter(Boolean) as string[];
      
      // Auto-generate TapComplete exercises if enabled
      if (newLesson.autoGenerateTapComplete && textsArray.length > 0) {
        await generateTapCompleteForLesson(data.id, textsArray);
      }
      
      // Auto-generate DragDrop exercises if enabled
      if (newLesson.autoGenerateDragDrop && textsArray.length > 0) {
        await generateDragDropForLesson(data.id, textsArray);
      }
      
      // Check if both texts are provided for full pedagogical generation
      if (hasContextText && hasFullText) {
        // Store data and show confirmation
        setCreatedLessonData({ id: data.id, title: data.title });
        setPendingTexts({ context: newLesson.contextText, full: newLesson.fullText });
        setShowGenerateConfirm(true);
      } else {
        const autoGenMsg = [];
        if (newLesson.autoGenerateTapComplete && textsArray.length > 0) autoGenMsg.push('TapComplete');
        if (newLesson.autoGenerateDragDrop && textsArray.length > 0) autoGenMsg.push('DragDrop');
        toast({
          title: 'Lição criada!',
          description: `A lição "${newLesson.title}" foi criada com sucesso.${autoGenMsg.length > 0 ? ` Exercícios ${autoGenMsg.join(' e ')} gerados.` : ''}`,
        });
      }
      
      // Reset form
      setNewLesson({ title: '', description: '', duration_minutes: 30, is_published: false, contextText: '', fullText: '', autoGenerateTapComplete: true, autoGenerateDragDrop: true });
    } catch (error: any) {
      toast({
        title: 'Erro ao criar lição',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const generateTapCompleteForLesson = async (lessonId: string, texts: string[]) => {
    try {
      // Get max display_order for this lesson
      const { data: existingExercises } = await supabase
        .from('exercises')
        .select('display_order')
        .eq('lesson_id', lessonId)
        .order('display_order', { ascending: false })
        .limit(1);

      let maxOrder = existingExercises?.[0]?.display_order ?? -1;
      let createdCount = 0;

      for (const text of texts) {
        if (!text || text.split(/\s+/).filter(Boolean).length < 3) continue;

        maxOrder++;

        const { error: insertError } = await supabase
          .from('exercises')
          .insert({
            lesson_id: lessonId,
            type: 'tap-complete',
            title: `Fase 1 - Ordenar: ${text.substring(0, 40)}${text.length > 40 ? '...' : ''}`,
            content: { text, audioUrl: '' },
            display_order: maxOrder,
            is_published: true,
          });

        if (!insertError) createdCount++;
      }

      if (createdCount > 0) {
        console.log(`Generated ${createdCount} TapComplete exercises for lesson ${lessonId}`);
      }
    } catch (error) {
      console.error('Error generating TapComplete exercises:', error);
    }
  };

  const generateDragDropForLesson = async (lessonId: string, texts: string[]) => {
    try {
      // Get max display_order for this lesson
      const { data: existingExercises } = await supabase
        .from('exercises')
        .select('display_order')
        .eq('lesson_id', lessonId)
        .order('display_order', { ascending: false })
        .limit(1);

      let maxOrder = existingExercises?.[0]?.display_order ?? -1;
      let createdCount = 0;

      for (const text of texts) {
        // Need at least 4 words for a meaningful drag-drop
        const words = text.trim().split(/\s+/).filter(Boolean);
        if (words.length < 4) continue;

        maxOrder++;

        // Shuffle words for drag-drop items
        const shuffledWords = [...words].sort(() => Math.random() - 0.5);

        const { error: insertError } = await supabase
          .from('exercises')
          .insert({
            lesson_id: lessonId,
            type: 'drag-drop',
            title: `Ordenar: ${text.substring(0, 40)}${text.length > 40 ? '...' : ''}`,
            content: { 
              sourceText: text.trim(),
              items: shuffledWords 
            },
            display_order: maxOrder,
            is_published: true,
          });

        if (!insertError) createdCount++;
      }

      if (createdCount > 0) {
        console.log(`Generated ${createdCount} DragDrop exercises for lesson ${lessonId}`);
      }
    } catch (error) {
      console.error('Error generating DragDrop exercises:', error);
    }
  };

  const handleOpenGenerator = () => {
    setShowGenerateConfirm(false);
    setIsPedagogicalGeneratorOpen(true);
  };

  const handleSkipGenerator = () => {
    setShowGenerateConfirm(false);
    if (createdLessonData) {
      toast({
        title: 'Lição criada!',
        description: `A lição "${createdLessonData.title}" foi criada. Você pode gerar os exercícios depois.`,
      });
    }
    setCreatedLessonData(null);
    setPendingTexts({ context: '', full: '' });
  };

  const handleGeneratorSuccess = () => {
    setIsPedagogicalGeneratorOpen(false);
    setCreatedLessonData(null);
    setPendingTexts({ context: '', full: '' });
    toast({
      title: 'Lição e exercícios criados!',
      description: 'Sua lição foi criada com os 11 exercícios pedagógicos.',
    });
  };

  const handleUpdateLesson = async () => {
    if (!editingLesson) return;
    
    // Ensure valid session before write operation
    if (!await ensureSession()) return;
    
    try {
      const { error } = await supabase
        .from('lessons')
        .update({
          title: editingLesson.title,
          description: editingLesson.description,
          duration_minutes: editingLesson.duration_minutes,
          is_published: editingLesson.is_published,
        })
        .eq('id', editingLesson.id);

      if (error) throw error;

      setLessons(lessons.map(l => l.id === editingLesson.id ? editingLesson : l));
      setIsEditDialogOpen(false);
      setEditingLesson(null);
      
      toast({
        title: 'Lição atualizada!',
        description: `A lição foi atualizada com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar lição',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteLesson = async (lesson: Lesson) => {
    // Ensure valid session before write operation
    if (!await ensureSession()) return;
    
    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lesson.id);

      if (error) throw error;

      setLessons(lessons.filter(l => l.id !== lesson.id));
      
      toast({
        title: 'Lição excluída',
        description: `A lição "${lesson.title}" foi excluída.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir lição',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRegenerateExercises = async (lesson: Lesson) => {
    if (!await ensureSession()) return;
    
    try {
      toast({
        title: 'Regenerando exercícios...',
        description: 'Buscando textos e recriando exercícios.',
      });

      // Fetch existing exercises to extract texts
      const { data: exercises, error: fetchError } = await supabase
        .from('exercises')
        .select('type, content')
        .eq('lesson_id', lesson.id)
        .in('type', ['tap-complete', 'drag-drop']);

      if (fetchError) throw fetchError;

      // Extract unique texts from existing exercises
      const textsSet = new Set<string>();
      
      for (const ex of exercises || []) {
        const content = ex.content as { text?: string; sourceText?: string; items?: string[] };
        if (ex.type === 'tap-complete' && content?.text) {
          textsSet.add(content.text.trim());
        } else if (ex.type === 'drag-drop') {
          const text = content?.sourceText?.trim() || content?.items?.join(' ').trim();
          if (text) textsSet.add(text);
        }
      }

      const texts = Array.from(textsSet);

      if (texts.length === 0) {
        toast({
          title: 'Nenhum texto encontrado',
          description: 'Não foi possível extrair textos dos exercícios existentes.',
          variant: 'destructive',
        });
        return;
      }

      // Delete existing TapComplete and DragDrop exercises
      const { error: deleteError } = await supabase
        .from('exercises')
        .delete()
        .eq('lesson_id', lesson.id)
        .in('type', ['tap-complete', 'drag-drop']);

      if (deleteError) throw deleteError;

      // Regenerate exercises
      await generateTapCompleteForLesson(lesson.id, texts);
      await generateDragDropForLesson(lesson.id, texts);

      toast({
        title: 'Exercícios regenerados!',
        description: `${texts.length} texto(s) processado(s). TapComplete e DragDrop recriados.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao regenerar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const togglePublish = async (lesson: Lesson) => {
    // Ensure valid session before write operation
    if (!await ensureSession()) return;
    
    try {
      const { error } = await supabase
        .from('lessons')
        .update({ is_published: !lesson.is_published })
        .eq('id', lesson.id);

      if (error) throw error;

      setLessons(lessons.map(l => 
        l.id === lesson.id ? { ...l, is_published: !l.is_published } : l
      ));
      
      toast({
        title: lesson.is_published ? 'Lição despublicada' : 'Lição publicada',
        description: `A lição "${lesson.title}" foi ${lesson.is_published ? 'despublicada' : 'publicada'}.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao alterar status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    // Ensure valid session before write operation
    if (!await ensureSession()) return;
    const oldIndex = lessons.findIndex(l => l.id === active.id);
    const newIndex = lessons.findIndex(l => l.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;
    
    const reordered = arrayMove(lessons, oldIndex, newIndex);
    setLessons(reordered);
    
    // Persist to database
    try {
      const updates = reordered.map((lesson, i) => 
        supabase
          .from('lessons')
          .update({ display_order: i })
          .eq('id', lesson.id)
      );
      
      await Promise.all(updates);
      
      toast({
        title: 'Ordem atualizada',
        description: 'A ordem das lições foi salva.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar ordem',
        description: error.message,
        variant: 'destructive',
      });
      // Revert on error
      fetchModuleAndLessons();
    }
  };

  const filteredLessons = lessons.filter(lesson =>
    lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lesson.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Módulo não encontrado</p>
        <Button onClick={() => navigate('/admin/modules')}>Voltar aos Módulos</Button>
      </div>
    );
  }

  return (
    <div data-allow-context-menu data-allow-copy>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link to="/admin" className="hover:text-foreground">Admin</Link>
          <span>/</span>
          <Link to="/admin/modules" className="hover:text-foreground">Módulos</Link>
          <span>/</span>
          <span className="text-foreground">{module.title}</span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate('/admin/modules')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="flex-1">
            <h1 className="font-serif text-3xl font-bold text-foreground">
              Lições: {module.title}
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie as lições deste módulo
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-gold text-secondary shadow-gold">
                <Plus className="w-4 h-4 mr-2" />
                Nova Lição
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-serif">Criar Nova Lição</DialogTitle>
                <DialogDescription>
                  Preencha as informações e os textos base para gerar automaticamente os exercícios pedagógicos.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título da Lição *</Label>
                  <Input
                    id="title"
                    placeholder="Ex: Ogbe Meji - Verso 1"
                    value={newLesson.title}
                    onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva o conteúdo da lição..."
                    value={newLesson.description}
                    onChange={(e) => setNewLesson({ ...newLesson, description: e.target.value })}
                    className="min-h-[60px]"
                  />
                </div>

                {/* Context Text */}
                <div className="space-y-2 p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
                  <Label htmlFor="contextText" className="text-blue-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Texto Resumido (Contexto) - Fase 1
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Este texto será usado para gerar os 6 exercícios da Fase 1 (contexto e preparação).
                  </p>
                  <Textarea
                    id="contextText"
                    placeholder="Cole aqui o texto resumido/contexto..."
                    value={newLesson.contextText}
                    onChange={(e) => setNewLesson({ ...newLesson, contextText: e.target.value })}
                    className="min-h-[100px] font-mono text-sm"
                  />
                </div>

                {/* Full Text */}
                <div className="space-y-2 p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
                  <Label htmlFor="fullText" className="text-purple-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Texto Completo (Verso) - Fase 2
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Este texto será usado para gerar os 5 exercícios da Fase 2 (memorização profunda).
                  </p>
                  <Textarea
                    id="fullText"
                    placeholder="Cole aqui o texto completo/verso..."
                    value={newLesson.fullText}
                    onChange={(e) => setNewLesson({ ...newLesson, fullText: e.target.value })}
                    className="min-h-[100px] font-mono text-sm"
                  />
                </div>

                {/* Auto-generate options */}
                {(newLesson.contextText.trim() || newLesson.fullText.trim()) && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 border border-accent/50">
                      <Switch
                        id="autoTapComplete"
                        checked={newLesson.autoGenerateTapComplete}
                        onCheckedChange={(checked) => setNewLesson({ ...newLesson, autoGenerateTapComplete: checked })}
                      />
                      <div className="flex-1">
                        <Label htmlFor="autoTapComplete" className="flex items-center gap-2 cursor-pointer">
                          <MousePointer className="w-4 h-4 text-primary" />
                          Gerar TapComplete automaticamente
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Cria exercícios de ordenar palavras (tocar para completar)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 border border-accent/50">
                      <Switch
                        id="autoDragDrop"
                        checked={newLesson.autoGenerateDragDrop}
                        onCheckedChange={(checked) => setNewLesson({ ...newLesson, autoGenerateDragDrop: checked })}
                      />
                      <div className="flex-1">
                        <Label htmlFor="autoDragDrop" className="flex items-center gap-2 cursor-pointer">
                          <GripVertical className="w-4 h-4 text-primary" />
                          Gerar DragDrop automaticamente
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Cria exercícios de arrastar e soltar palavras na ordem correta
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duração (minutos)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min={1}
                      value={newLesson.duration_minutes}
                      onChange={(e) => setNewLesson({ ...newLesson, duration_minutes: parseInt(e.target.value) || 30 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Publicar?</Label>
                    <div className="flex items-center gap-2 h-10">
                      <Switch
                        checked={newLesson.is_published}
                        onCheckedChange={(checked) => setNewLesson({ ...newLesson, is_published: checked })}
                      />
                      <span className="text-sm text-muted-foreground">
                        {newLesson.is_published ? 'Publicada' : 'Rascunho'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info about auto-generation */}
                {(newLesson.contextText.trim() && newLesson.fullText.trim()) && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
                    <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Geração automática disponível!</span>{' '}
                      Após criar a lição, você poderá gerar automaticamente os 11 exercícios do método pedagógico.
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  className="gradient-gold text-secondary" 
                  onClick={handleCreateLesson}
                  disabled={!newLesson.title}
                >
                  Criar Lição
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar lições..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Lessons List */}
        {filteredLessons.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif text-lg font-semibold text-foreground mb-2">
              Nenhuma lição encontrada
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Tente uma busca diferente' : 'Comece criando sua primeira lição'}
            </p>
            {!searchQuery && (
              <Button 
                className="gradient-gold text-secondary"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Lição
              </Button>
            )}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredLessons.map(l => l.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {filteredLessons.map((lesson, index) => (
                  <SortableLessonItem
                    key={lesson.id}
                    lesson={lesson}
                    index={index}
                    moduleId={moduleId!}
                    navigate={navigate}
                    onEdit={(l) => {
                      setEditingLesson(l);
                      setIsEditDialogOpen(true);
                    }}
                    onTogglePublish={togglePublish}
                    onDelete={handleDeleteLesson}
                    onRegenerate={handleRegenerateExercises}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">Editar Lição</DialogTitle>
            <DialogDescription>
              Atualize as informações da lição
            </DialogDescription>
          </DialogHeader>
          {editingLesson && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Título da Lição</Label>
                <Input
                  id="edit-title"
                  value={editingLesson.title}
                  onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Descrição</Label>
                <Textarea
                  id="edit-description"
                  value={editingLesson.description || ''}
                  onChange={(e) => setEditingLesson({ ...editingLesson, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-duration">Duração (minutos)</Label>
                  <Input
                    id="edit-duration"
                    type="number"
                    min={1}
                    value={editingLesson.duration_minutes || 30}
                    onChange={(e) => setEditingLesson({ ...editingLesson, duration_minutes: parseInt(e.target.value) || 30 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex items-center gap-2 h-10">
                    <Switch
                      checked={editingLesson.is_published}
                      onCheckedChange={(checked) => setEditingLesson({ ...editingLesson, is_published: checked })}
                    />
                    <span className="text-sm text-muted-foreground">
                      {editingLesson.is_published ? 'Publicada' : 'Rascunho'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="gradient-gold text-secondary" 
              onClick={handleUpdateLesson}
              disabled={!editingLesson?.title}
            >
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Confirmation Dialog */}
      <AlertDialog open={showGenerateConfirm} onOpenChange={setShowGenerateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Lição criada com sucesso!
            </AlertDialogTitle>
            <AlertDialogDescription>
              Detectamos que você preencheu os textos de contexto e verso. 
              Deseja gerar automaticamente os <span className="font-semibold text-foreground">11 exercícios do método pedagógico</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSkipGenerator}>
              Fazer Depois
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleOpenGenerator} className="gradient-gold text-secondary">
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar Exercícios
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pedagogical Exercise Generator */}
      {createdLessonData && (
        <PedagogicalExerciseGenerator
          lessonId={createdLessonData.id}
          lessonTitle={createdLessonData.title}
          open={isPedagogicalGeneratorOpen}
          onOpenChange={setIsPedagogicalGeneratorOpen}
          onExercisesGenerated={handleGeneratorSuccess}
          defaultContextText={pendingTexts.context}
          defaultFullText={pendingTexts.full}
        />
      )}
    </div>
  );
};

export default AdminLessons;
