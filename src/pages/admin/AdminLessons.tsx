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
  EyeOff
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
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

const AdminLessons: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
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
  });

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
      setNewLesson({ title: '', description: '', duration_minutes: 30, is_published: false });
      
      toast({
        title: 'Lição criada!',
        description: `A lição "${newLesson.title}" foi criada com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao criar lição',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateLesson = async () => {
    if (!editingLesson) return;
    
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

  const togglePublish = async (lesson: Lesson) => {
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

  const filteredLessons = lessons.filter(lesson =>
    lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lesson.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Módulo não encontrado</p>
        <Button onClick={() => navigate('/admin/modules')}>Voltar aos Módulos</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30" data-allow-context-menu data-allow-copy>
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border z-50">
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-sidebar-border">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center shadow-gold">
                <span className="font-serif text-lg font-bold text-secondary">O</span>
              </div>
              <div>
                <h1 className="font-serif font-semibold text-sidebar-foreground">Admin</h1>
                <p className="text-xs text-sidebar-foreground/60">Offe Orunmila</p>
              </div>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
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
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-serif">Criar Nova Lição</DialogTitle>
                <DialogDescription>
                  Preencha as informações da nova lição
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título da Lição</Label>
                  <Input
                    id="title"
                    placeholder="Ex: Introdução aos Orixás"
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
                  />
                </div>
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
          <div className="space-y-3">
            {filteredLessons.map((lesson, index) => (
              <div 
                key={lesson.id}
                className="bg-card rounded-xl border border-border shadow-soft p-4 flex items-center gap-4 group hover:shadow-elevated transition-shadow"
              >
                <div className="cursor-grab text-muted-foreground hover:text-foreground">
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
                    <DropdownMenuItem onClick={() => {
                      setEditingLesson(lesson);
                      setIsEditDialogOpen(true);
                    }}>
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => togglePublish(lesson)}>
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
                      onClick={() => handleDeleteLesson(lesson)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </main>

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
    </div>
  );
};

export default AdminLessons;
