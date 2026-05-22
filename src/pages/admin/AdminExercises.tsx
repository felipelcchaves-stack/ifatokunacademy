import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  BookOpen,
  Mic,
  Layers,
  Columns,
  CreditCard,
  MousePointer,
  Video,
  Brain,
  HelpCircle,
  Sparkles,
  MessageSquare
} from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ExerciseEditor from '@/components/admin/ExerciseEditor';
import QuizExerciseEditor from '@/components/admin/QuizExerciseEditor';
import PedagogicalExerciseGenerator from '@/components/admin/PedagogicalExerciseGenerator';
import MediaUploader from '@/components/admin/MediaUploader';
import { Textarea } from '@/components/ui/textarea';
import AdminErrorBoundary from '@/components/errors/AdminErrorBoundary';
import { useAdminOrganization } from '@/hooks/useAdminOrganization';

interface Exercise {
  id: string;
  lesson_id: string;
  type: 'reading' | 'drag-drop' | 'fill-columns' | 'flashcard' | 'video' | 'memorization' | 'quiz' | 'tap-complete' | 'interpretation';
  title: string;
  content: Record<string, any>;
  display_order: number;
  is_published: boolean;
  created_at: string;
}

interface Lesson {
  id: string;
  title: string;
  module_id: string;
}

interface Module {
  id: string;
  title: string;
  organization_id: string | null;
}

const exerciseTypes = [
  { value: 'reading', label: 'Leitura Guiada', icon: BookOpen, description: 'Texto com áudio sincronizado' },
  { value: 'flashcard', label: 'Flash Cards', icon: CreditCard, description: 'Cartões de memorização' },
  { value: 'drag-drop', label: 'Arrastar e Soltar', icon: Layers, description: 'Conectar itens correspondentes' },
  { value: 'fill-columns', label: 'Preencher Colunas', icon: Columns, description: 'Completar tabelas' },
  { value: 'video', label: 'Vídeo Aula', icon: Video, description: 'Conteúdo em vídeo' },
  { value: 'memorization', label: 'Memorização', icon: Brain, description: 'Técnicas de memorização' },
  { value: 'quiz', label: 'Quiz', icon: HelpCircle, description: 'Questionário com múltipla escolha' },
  { value: 'tap-complete', label: 'Ordenar Palavras', icon: MousePointer, description: 'Ordenar palavras para formar texto' },
  { value: 'interpretation', label: 'Interpretação', icon: MessageSquare, description: 'Escrever conselhos baseados no texto (orientador)' },
];

const AdminExercises: React.FC = () => {
  const { moduleId, lessonId } = useParams<{ moduleId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeOrg, loading: orgLoading } = useAdminOrganization();
  
  const [module, setModule] = useState<Module | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [selectedType, setSelectedType] = useState<Exercise['type'] | ''>('');
  const [newExerciseTitle, setNewExerciseTitle] = useState('');
  
  // Drag and drop state
  const [draggedExercise, setDraggedExercise] = useState<Exercise | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Delete confirmation state
  const [deleteConfirmExercise, setDeleteConfirmExercise] = useState<Exercise | null>(null);
  
  // Pedagogical generator state
  const [isPedagogicalGeneratorOpen, setIsPedagogicalGeneratorOpen] = useState(false);

  // Quick video lesson state
  const [isQuickVideoOpen, setIsQuickVideoOpen] = useState(false);
  const [quickVideoTitle, setQuickVideoTitle] = useState('');
  const [quickVideoUrl, setQuickVideoUrl] = useState('');
  const [quickVideoDescription, setQuickVideoDescription] = useState('');
  const [quickVideoSaving, setQuickVideoSaving] = useState(false);


  useEffect(() => {
    if (moduleId && lessonId && !orgLoading && activeOrg) {
      fetchData();
    }
  }, [moduleId, lessonId, activeOrg, orgLoading]);

  const fetchData = async () => {
    if (!activeOrg) return;
    
    try {
      setLoading(true);
      
      // Fetch module with organization_id
      const { data: moduleData, error: moduleError } = await supabase
        .from('modules')
        .select('id, title, organization_id')
        .eq('id', moduleId)
        .maybeSingle();

      if (moduleError) throw moduleError;
      
      // Validate that module belongs to active organization
      if (moduleData && moduleData.organization_id !== activeOrg.id) {
        toast({
          title: 'Acesso negado',
          description: 'Este módulo pertence a outra organização.',
          variant: 'destructive',
        });
        navigate('/admin/modules');
        return;
      }
      
      setModule(moduleData);

      // Fetch lesson
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select('id, title, module_id')
        .eq('id', lessonId)
        .maybeSingle();

      if (lessonError) throw lessonError;
      setLesson(lessonData);

      // Fetch exercises
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('exercises')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('display_order', { ascending: true });

      if (exercisesError) throw exercisesError;
      setExercises((exercisesData || []) as Exercise[]);
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

  const handleCreateExercise = async () => {
    if (!selectedType || !newExerciseTitle) return;

    try {
      const maxOrder = exercises.reduce((max, e) => Math.max(max, e.display_order), -1);
      
      const defaultContent = getDefaultContent(selectedType);
      
      const { data, error } = await supabase
        .from('exercises')
        .insert({
          lesson_id: lessonId,
          type: selectedType,
          title: newExerciseTitle,
          content: defaultContent,
          display_order: maxOrder + 1,
          is_published: false,
        })
        .select()
        .single();

      if (error) throw error;

      const newExercise = data as Exercise;
      setExercises([...exercises, newExercise]);
      setIsCreateDialogOpen(false);
      setSelectedType('');
      setNewExerciseTitle('');
      
      // Open editor for the new exercise
      setEditingExercise(newExercise);
      setIsEditorOpen(true);
      
      toast({
        title: 'Exercício criado!',
        description: 'Agora edite o conteúdo do exercício.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao criar exercício',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openQuickVideo = () => {
    setQuickVideoTitle(lesson?.title || '');
    setQuickVideoUrl('');
    setQuickVideoDescription('');
    setIsQuickVideoOpen(true);
  };

  const handleCreateVideoLesson = async () => {
    if (!quickVideoTitle.trim()) {
      toast({ title: 'Informe um título', variant: 'destructive' });
      return;
    }
    try {
      setQuickVideoSaving(true);
      const maxOrder = exercises.reduce((max, e) => Math.max(max, e.display_order), -1);
      const hasUrl = quickVideoUrl.trim().length > 0;

      const { data, error } = await supabase
        .from('exercises')
        .insert({
          lesson_id: lessonId,
          type: 'video',
          title: quickVideoTitle.trim(),
          content: {
            videoUrl: quickVideoUrl.trim(),
            description: quickVideoDescription.trim(),
          },
          display_order: maxOrder + 1,
          is_published: hasUrl,
        })
        .select()
        .single();

      if (error) throw error;

      setExercises([...exercises, data as Exercise]);
      setIsQuickVideoOpen(false);

      toast({
        title: hasUrl ? 'Vídeo aula publicada' : 'Salva como rascunho',
        description: hasUrl
          ? 'A aula em vídeo já está disponível para os alunos.'
          : 'Adicione a URL do vídeo para publicar.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao criar vídeo aula',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setQuickVideoSaving(false);
    }
  };


  const getDefaultContent = (type: Exercise['type']): Record<string, any> => {
    switch (type) {
      case 'reading':
        return { text: '', audioUrl: '' };
      case 'flashcard':
        return { cards: [{ front: '', back: '' }] };
      case 'drag-drop':
        return { items: [], targets: [], correctMatches: {} };
      case 'fill-columns':
        return { columns: [], rows: [] };
      case 'video':
        return { videoUrl: '', description: '' };
      case 'memorization':
        return { items: [] };
      case 'quiz':
        return { 
          questions: [{ question: '', options: ['', '', '', ''], correctIndex: 0 }],
          passingScore: 90,
          timeLimit: null
        };
      case 'tap-complete':
        return { text: '', audioUrl: '' };
      case 'interpretation':
        return { 
          text: '', 
          title: 'Exercício de Interpretação',
          minCounsels: 5,
          isOptional: true
        };
      default:
        return {};
    }
  };

  const handleSaveExercise = async (exercise: Exercise) => {
    try {
      const { error } = await supabase
        .from('exercises')
        .update({
          title: exercise.title,
          content: exercise.content,
          is_published: exercise.is_published,
        })
        .eq('id', exercise.id);

      if (error) throw error;

      setExercises(exercises.map(e => e.id === exercise.id ? exercise : e));
      setIsEditorOpen(false);
      setEditingExercise(null);
      
      toast({
        title: 'Exercício salvo!',
        description: 'As alterações foram salvas com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar exercício',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteExercise = async (exercise: Exercise) => {
    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', exercise.id);

      if (error) throw error;

      setExercises(exercises.filter(e => e.id !== exercise.id));
      
      toast({
        title: 'Exercício excluído',
        description: `O exercício "${exercise.title}" foi excluído.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir exercício',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const togglePublish = async (exercise: Exercise) => {
    // Block publishing video exercises without a videoUrl
    if (!exercise.is_published && exercise.type === 'video') {
      const videoUrl = exercise.content?.videoUrl;
      if (!videoUrl || (typeof videoUrl === 'string' && videoUrl.trim() === '')) {
        toast({
          title: 'Não é possível publicar',
          description: 'Exercícios de vídeo precisam ter uma URL de vídeo configurada antes de serem publicados.',
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('exercises')
        .update({ is_published: !exercise.is_published })
        .eq('id', exercise.id);

      if (error) throw error;

      setExercises(exercises.map(e => 
        e.id === exercise.id ? { ...e, is_published: !e.is_published } : e
      ));
      
      toast({
        title: exercise.is_published ? 'Exercício despublicado' : 'Exercício publicado',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao alterar status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getExerciseIcon = (type: Exercise['type']) => {
    const exerciseType = exerciseTypes.find(t => t.value === type);
    return exerciseType?.icon || BookOpen;
  };

  const getExerciseLabel = (type: Exercise['type']) => {
    const exerciseType = exerciseTypes.find(t => t.value === type);
    return exerciseType?.label || type;
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, exercise: Exercise) => {
    setDraggedExercise(exercise);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', exercise.id);
    // Add a slight delay to allow the drag image to be captured
    setTimeout(() => {
      const target = e.target as HTMLElement;
      target.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    target.style.opacity = '1';
    setDraggedExercise(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only reset if leaving the container entirely
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    if (!draggedExercise) return;
    
    const currentIndex = exercises.findIndex(ex => ex.id === draggedExercise.id);
    if (currentIndex === targetIndex) return;

    // Reorder locally first for instant feedback
    const newExercises = [...exercises];
    const [removed] = newExercises.splice(currentIndex, 1);
    newExercises.splice(targetIndex, 0, removed);
    
    // Update display_order for all affected exercises
    const updatedExercises = newExercises.map((ex, idx) => ({
      ...ex,
      display_order: idx,
    }));
    
    setExercises(updatedExercises);
    
    // Persist to database
    try {
      const updates = updatedExercises.map((ex, idx) => ({
        id: ex.id,
        display_order: idx,
      }));
      
      // Update all exercises in parallel for better performance
      await Promise.all(
        updates.map(update =>
          supabase
            .from('exercises')
            .update({ display_order: update.display_order })
            .eq('id', update.id)
            .then(({ error }) => {
              if (error) throw error;
            })
        )
      );
      
      toast({
        title: 'Ordem atualizada',
        description: 'A ordem dos exercícios foi salva.',
      });
    } catch (error: any) {
      // Revert on error
      fetchData();
      toast({
        title: 'Erro ao reordenar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredExercises = searchQuery
    ? exercises.filter(exercise =>
        exercise.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : exercises;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!module || !lesson) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Dados não encontrados</p>
        <Button onClick={() => navigate('/admin/modules')}>Voltar aos Módulos</Button>
      </div>
    );
  }

  if (isEditorOpen && editingExercise) {
    const handleEditorBack = () => {
      setIsEditorOpen(false);
      setEditingExercise(null);
    };

    if (editingExercise.type === 'quiz') {
      return (
        <AdminErrorBoundary
          fallbackTitle="Erro ao carregar o editor de quiz"
          onBack={handleEditorBack}
          onReset={handleEditorBack}
        >
          <QuizExerciseEditor
            exercise={editingExercise}
            onSave={(e) => handleSaveExercise(e as Exercise)}
            onCancel={handleEditorBack}
          />
        </AdminErrorBoundary>
      );
    }
    
    return (
      <AdminErrorBoundary
        fallbackTitle="Erro ao carregar o editor de exercício"
        onBack={handleEditorBack}
        onReset={handleEditorBack}
      >
        <ExerciseEditor
          exercise={editingExercise}
          onSave={handleSaveExercise}
          onCancel={handleEditorBack}
        />
      </AdminErrorBoundary>
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
          <Link to={`/admin/modules/${moduleId}/lessons`} className="hover:text-foreground">{module.title}</Link>
          <span>/</span>
          <span className="text-foreground">{lesson.title}</span>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate(`/admin/modules/${moduleId}/lessons`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="flex-1">
            <h1 className="font-serif text-3xl font-bold text-foreground">
              Exercícios: {lesson.title}
            </h1>
            <p className="text-muted-foreground mt-1">
              Crie e gerencie os exercícios desta lição
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="gradient-gold text-secondary shadow-gold"
              onClick={openQuickVideo}
            >
              <Video className="w-4 h-4 mr-2" />
              Adicionar Vídeo Aula
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Exercício
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsPedagogicalGeneratorOpen(true)}
              className="border-primary/50 text-primary hover:bg-primary/10"
              title="Gera múltiplos exercícios a partir de um texto base"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar Método Pedagógico
            </Button>
          </div>
        </div>


        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar exercícios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Exercises List */}
        {filteredExercises.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif text-lg font-semibold text-foreground mb-2">
              Nenhum exercício encontrado
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Tente uma busca diferente' : 'Comece criando seu primeiro exercício'}
            </p>
            {!searchQuery && (
              <Button 
                className="gradient-gold text-secondary"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Exercício
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {searchQuery && (
              <p className="text-sm text-muted-foreground mb-4">
                Arraste e solte desativado durante a busca
              </p>
            )}
            {filteredExercises.map((exercise, index) => {
              const Icon = getExerciseIcon(exercise.type);
              const isDragging = draggedExercise?.id === exercise.id;
              const isDropTarget = dragOverIndex === index && !isDragging;
              
              return (
                <div 
                  key={exercise.id}
                  draggable={!searchQuery}
                  onDragStart={(e) => handleDragStart(e, exercise)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => !searchQuery && handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => !searchQuery && handleDrop(e, index)}
                  className={`
                    bg-card rounded-xl border shadow-soft p-4 flex items-center gap-4 group 
                    transition-all duration-200
                    ${isDragging ? 'opacity-50 scale-[0.98]' : 'hover:shadow-elevated'}
                    ${isDropTarget 
                      ? 'border-primary border-2 bg-primary/5 translate-y-1' 
                      : 'border-border'
                    }
                    ${!searchQuery ? 'cursor-move' : ''}
                  `}
                >
                  <div 
                    className={`
                      text-muted-foreground transition-colors
                      ${!searchQuery ? 'cursor-grab active:cursor-grabbing hover:text-foreground' : 'opacity-30'}
                    `}
                  >
                    <GripVertical className="w-5 h-5" />
                  </div>
                  
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground truncate">{exercise.title}</h3>
                      {exercise.is_published ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Publicado
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                          Rascunho
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getExerciseLabel(exercise.type)}
                    </p>
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setEditingExercise(exercise);
                      setIsEditorOpen(true);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar Conteúdo
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => togglePublish(exercise)}>
                        {exercise.is_published ? (
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
                        onClick={() => setDeleteConfirmExercise(exercise)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        )}
      

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmExercise} onOpenChange={() => setDeleteConfirmExercise(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir exercício?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O exercício "{deleteConfirmExercise?.title}" será permanentemente excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirmExercise) {
                  handleDeleteExercise(deleteConfirmExercise);
                  setDeleteConfirmExercise(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Exercise Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif">Criar Novo Exercício</DialogTitle>
            <DialogDescription>
              Escolha o tipo de exercício e dê um título
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="exercise-title">Título do Exercício</Label>
              <Input
                id="exercise-title"
                placeholder="Ex: Vocabulário Básico Yorubá"
                value={newExerciseTitle}
                onChange={(e) => setNewExerciseTitle(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label>Tipo de Exercício</Label>
              <div className="grid grid-cols-2 gap-3">
                {exerciseTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      onClick={() => setSelectedType(type.value as Exercise['type'])}
                      className={`
                        flex items-start gap-3 p-4 rounded-xl border text-left transition-all
                        ${selectedType === type.value 
                          ? 'border-primary bg-primary/5 shadow-gold' 
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        }
                      `}
                    >
                      <div className={`
                        w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                        ${selectedType === type.value ? 'bg-primary/20' : 'bg-muted'}
                      `}>
                        <Icon className={`w-5 h-5 ${selectedType === type.value ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className={`font-medium ${selectedType === type.value ? 'text-primary' : 'text-foreground'}`}>
                          {type.label}
                        </p>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="gradient-gold text-secondary" 
              onClick={handleCreateExercise}
              disabled={!selectedType || !newExerciseTitle}
            >
              Criar e Editar Conteúdo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Video Lesson Dialog */}
      <Dialog open={isQuickVideoOpen} onOpenChange={setIsQuickVideoOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              Adicionar Vídeo Aula
            </DialogTitle>
            <DialogDescription>
              Publique uma aula em vídeo sem precisar criar outros exercícios.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="quick-video-title">Título</Label>
              <Input
                id="quick-video-title"
                placeholder="Ex: Aula ao Vivo - Introdução"
                value={quickVideoTitle}
                onChange={(e) => setQuickVideoTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Upload de vídeo (opcional)</Label>
              <MediaUploader
                lessonId={lessonId}
                acceptedTypes="video/*"
                label="Selecione um arquivo de vídeo"
                currentUrl={quickVideoUrl}
                onUploadComplete={(url) => setQuickVideoUrl(url)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick-video-url">Ou cole a URL (YouTube, Vimeo, Drive...)</Label>
              <Input
                id="quick-video-url"
                placeholder="https://..."
                value={quickVideoUrl}
                onChange={(e) => setQuickVideoUrl(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick-video-description">Descrição (opcional)</Label>
              <Textarea
                id="quick-video-description"
                placeholder="Breve descrição da aula..."
                value={quickVideoDescription}
                onChange={(e) => setQuickVideoDescription(e.target.value)}
                rows={3}
              />
            </div>

            {quickVideoUrl && /youtube|vimeo|drive\.google\.com/.test(quickVideoUrl) && (
              <div className="aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center text-sm text-muted-foreground">
                Pré-visualização disponível após salvar
              </div>
            )}

            {!quickVideoUrl.trim() && (
              <p className="text-xs text-muted-foreground">
                Sem URL, a aula será salva como rascunho. Você pode publicar depois.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQuickVideoOpen(false)} disabled={quickVideoSaving}>
              Cancelar
            </Button>
            <Button
              className="gradient-gold text-secondary"
              onClick={handleCreateVideoLesson}
              disabled={quickVideoSaving || !quickVideoTitle.trim()}
            >
              {quickVideoSaving ? 'Salvando...' : (quickVideoUrl.trim() ? 'Publicar Vídeo Aula' : 'Salvar Rascunho')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pedagogical Exercise Generator */}
      <PedagogicalExerciseGenerator
        lessonId={lessonId!}
        lessonTitle={lesson.title}
        existingExercises={exercises.map(e => ({ id: e.id, title: e.title, type: e.type }))}
        open={isPedagogicalGeneratorOpen}
        onOpenChange={setIsPedagogicalGeneratorOpen}
        onExercisesGenerated={fetchData}
      />
    </div>

  );
};

export default AdminExercises;
