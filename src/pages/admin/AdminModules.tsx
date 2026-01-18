import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  MoreVertical, 
  BookOpen, 
  Edit, 
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  Image,
  Wand2,
  RefreshCw,
  ImageOff
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAdminOrganization } from '@/hooks/useAdminOrganization';
import MediaUploader from '@/components/admin/MediaUploader';
import BannerGenerator from '@/components/admin/BannerGenerator';
import BatchBannerGenerator from '@/components/admin/BatchBannerGenerator';

interface Module {
  id: string;
  title: string;
  description: string | null;
  type: 'proficiency' | 'thematic';
  level: string | null;
  theme: string | null;
  image_url: string | null;
  color: string | null;
  display_order: number;
  is_published: boolean;
  created_at: string;
  organization_id: string | null;
  lessons_count?: number;
}

const colorOptions = [
  { value: 'from-amber-500 to-orange-600', label: 'Dourado' },
  { value: 'from-emerald-500 to-teal-600', label: 'Esmeralda' },
  { value: 'from-violet-500 to-purple-600', label: 'Violeta' },
  { value: 'from-rose-500 to-pink-600', label: 'Rosa' },
  { value: 'from-blue-500 to-indigo-600', label: 'Azul' },
  { value: 'from-red-500 to-orange-600', label: 'Vermelho' },
];

const AdminModules: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeOrg, loading: orgLoading } = useAdminOrganization();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [regeneratingBanner, setRegeneratingBanner] = useState<string | null>(null);
  const [newModule, setNewModule] = useState({
    title: '',
    description: '',
    type: 'proficiency' as 'proficiency' | 'thematic',
    level: 'akapo',
    theme: '',
    color: 'from-amber-500 to-orange-600',
    image_url: '',
    is_published: false,
  });

  useEffect(() => {
    if (!orgLoading && activeOrg) {
      fetchModules();
    }
  }, [activeOrg, orgLoading]);

  const fetchModules = async () => {
    if (!activeOrg) return;
    
    try {
      setLoading(true);
      
      // Fetch modules with lessons count - FILTERED BY ORGANIZATION
      const { data, error } = await supabase
        .from('modules')
        .select(`
          *,
          lessons:lessons(count)
        `)
        .eq('organization_id', activeOrg.id)
        .order('display_order', { ascending: true });

      if (error) throw error;

      const modulesWithCount = (data || []).map((m: any) => ({
        ...m,
        lessons_count: m.lessons?.[0]?.count || 0,
      }));

      setModules(modulesWithCount);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar módulos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateModule = async () => {
    try {
      const maxOrder = modules.reduce((max, m) => Math.max(max, m.display_order), -1);
      
      const { data, error } = await supabase
        .from('modules')
        .insert({
          title: newModule.title,
          description: newModule.description || null,
          type: newModule.type,
          level: newModule.type === 'proficiency' ? newModule.level : null,
          theme: newModule.type === 'thematic' ? newModule.theme : null,
          color: newModule.color,
          image_url: newModule.image_url || null,
          display_order: maxOrder + 1,
          is_published: newModule.is_published,
          organization_id: activeOrg?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newModuleData = data as Module;
      setModules([...modules, { ...newModuleData, lessons_count: 0 }]);
      setIsCreateDialogOpen(false);
      setNewModule({
        title: '',
        description: '',
        type: 'proficiency',
        level: 'akapo',
        theme: '',
        color: 'from-amber-500 to-orange-600',
        image_url: '',
        is_published: false,
      });
      
      toast({
        title: 'Módulo criado!',
        description: `O módulo "${newModule.title}" foi criado com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao criar módulo',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateModule = async () => {
    if (!editingModule) return;

    try {
      const { error } = await supabase
        .from('modules')
        .update({
          title: editingModule.title,
          description: editingModule.description,
          type: editingModule.type,
          level: editingModule.type === 'proficiency' ? editingModule.level : null,
          theme: editingModule.type === 'thematic' ? editingModule.theme : null,
          color: editingModule.color,
          image_url: editingModule.image_url,
          is_published: editingModule.is_published,
        })
        .eq('id', editingModule.id);

      if (error) throw error;

      setModules(modules.map(m => m.id === editingModule.id ? editingModule : m));
      setIsEditDialogOpen(false);
      setEditingModule(null);
      
      toast({
        title: 'Módulo atualizado!',
        description: 'As alterações foram salvas com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar módulo',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteModule = async (module: Module) => {
    try {
      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', module.id);

      if (error) throw error;

      setModules(modules.filter(m => m.id !== module.id));
      
      toast({
        title: 'Módulo excluído',
        description: `O módulo "${module.title}" foi excluído.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir módulo',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const togglePublish = async (module: Module) => {
    try {
      const { error } = await supabase
        .from('modules')
        .update({ is_published: !module.is_published })
        .eq('id', module.id);

      if (error) throw error;

      setModules(modules.map(m => 
        m.id === module.id ? { ...m, is_published: !m.is_published } : m
      ));
      
      toast({
        title: module.is_published ? 'Módulo despublicado' : 'Módulo publicado',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao alterar status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const filteredModules = modules.filter(module =>
    module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    module.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleQuickRegenerate = async (module: Module) => {
    setRegeneratingBanner(module.id);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast({
          title: 'Sessão expirada',
          description: 'Faça login novamente para continuar.',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-module-banner', {
        body: {
          moduleId: module.id,
          title: module.title,
          description: module.description,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      if (data?.imageUrl) {
        setModules(modules.map(m => 
          m.id === module.id ? { ...m, image_url: data.imageUrl } : m
        ));
        
        toast({
          title: 'Banner regenerado!',
          description: `Nova imagem gerada para "${module.title}".`,
        });
      }
    } catch (error: any) {
      console.error('Error regenerating banner:', error);
      toast({
        title: 'Erro ao regenerar banner',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setRegeneratingBanner(null);
    }
  };

  return (
    <div data-allow-context-menu data-allow-copy>
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate('/admin')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div className="flex-1">
            <h1 className="font-serif text-3xl font-bold text-foreground">
              Gerenciar Módulos
            </h1>
            <p className="text-muted-foreground mt-1">
              Crie, edite e organize os módulos da plataforma
            </p>
          </div>
          <BatchBannerGenerator 
            modules={modules}
            onBannersGenerated={fetchModules}
          />
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-gold text-secondary shadow-gold">
                <Plus className="w-4 h-4 mr-2" />
                Novo Módulo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="font-serif">Criar Novo Módulo</DialogTitle>
                <DialogDescription>
                  Preencha as informações do novo módulo
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Título do Módulo</Label>
                  <Input
                    id="title"
                    placeholder="Ex: Akapo - Fundamentos"
                    value={newModule.title}
                    onChange={(e) => setNewModule({ ...newModule, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva o conteúdo do módulo..."
                    value={newModule.description}
                    onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={newModule.type}
                      onValueChange={(value) => setNewModule({ ...newModule, type: value as 'proficiency' | 'thematic' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="proficiency">Proficiência</SelectItem>
                        <SelectItem value="thematic">Temático</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newModule.type === 'proficiency' ? (
                    <div className="space-y-2">
                      <Label>Nível</Label>
                      <Select
                        value={newModule.level}
                        onValueChange={(value) => setNewModule({ ...newModule, level: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="akapo">Akapo</SelectItem>
                          <SelectItem value="awo">Awo</SelectItem>
                          <SelectItem value="oluwo">Oluwo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="theme">Tema</Label>
                      <Input
                        id="theme"
                        placeholder="Ex: Língua Yoruba"
                        value={newModule.theme}
                        onChange={(e) => setNewModule({ ...newModule, theme: e.target.value })}
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Cor do Módulo</Label>
                  <Select
                    value={newModule.color}
                    onValueChange={(value) => setNewModule({ ...newModule, color: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded bg-gradient-to-br ${color.value}`} />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Imagem de Capa</Label>
                  <MediaUploader
                    onUploadComplete={(url) => setNewModule({ ...newModule, image_url: url })}
                    acceptedTypes="image/*"
                    maxSizeMB={10}
                    label="Enviar Imagem"
                    currentUrl={newModule.image_url}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newModule.is_published}
                    onCheckedChange={(checked) => setNewModule({ ...newModule, is_published: checked })}
                  />
                  <Label>Publicar imediatamente</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  className="gradient-gold text-secondary" 
                  onClick={handleCreateModule}
                  disabled={!newModule.title}
                >
                  Criar Módulo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar módulos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Modules Grid */}
        {filteredModules.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif text-lg font-semibold text-foreground mb-2">
              Nenhum módulo encontrado
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Tente uma busca diferente' : 'Comece criando seu primeiro módulo'}
            </p>
            {!searchQuery && (
              <Button 
                className="gradient-gold text-secondary"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Módulo
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredModules.map((module, index) => (
              <div 
                key={module.id}
                className={`
                  bg-card rounded-xl overflow-hidden group transition-all duration-300
                  ${module.image_url 
                    ? 'border border-sacred-300/40 hover:border-sacred-400/60 hover:shadow-sacred' 
                    : 'border border-border hover:border-primary/30 hover:shadow-soft'
                  }
                  ${!module.is_published ? 'opacity-80' : ''}
                  animate-fade-in
                `}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Banner Area - Expanded */}
                <div className={`aspect-[16/9] bg-gradient-to-br ${module.color || 'from-amber-500 to-orange-600'} relative overflow-hidden`}>
                  {module.image_url ? (
                    <>
                      <img 
                        src={module.image_url} 
                        alt={module.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                      {/* Shimmer overlay when regenerating */}
                      {regeneratingBanner === module.id && (
                        <div className="absolute inset-0 module-card-shimmer" />
                      )}
                    </>
                  ) : (
                    /* Placeholder for modules without banner */
                    <div className="absolute inset-0 flex items-center justify-center pattern-adinkra">
                      <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20 transition-transform duration-300 group-hover:scale-110">
                        <Wand2 className="w-8 h-8 text-white/70" />
                      </div>
                    </div>
                  )}
                  
                  {/* Subtle gradient overlay - only at bottom */}
                  <div className="absolute inset-0 module-card-overlay pointer-events-none" />
                  
                  {/* Badges - Top Right */}
                  <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
                    <span className="px-2.5 py-1 bg-black/40 backdrop-blur-md rounded-full text-xs font-medium text-white border border-white/20">
                      {module.type === 'proficiency' 
                        ? `Nível ${module.level?.charAt(0).toUpperCase()}${module.level?.slice(1)}` 
                        : module.theme}
                    </span>
                    {module.is_published ? (
                      <span className="px-2.5 py-1 bg-green-500/80 backdrop-blur-md rounded-full text-xs font-medium text-white flex items-center gap-1.5 shadow-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        Publicado
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-gray-600/80 backdrop-blur-md rounded-full text-xs font-medium text-white/80">
                        Rascunho
                      </span>
                    )}
                  </div>
                  
                  {/* Module Title - Bottom with backdrop */}
                  <div className="absolute bottom-0 inset-x-0 p-4 pt-10">
                    <h3 className="font-serif text-lg font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] line-clamp-1">
                      {module.title}
                    </h3>
                  </div>
                  
                  {/* Drag handle */}
                  <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-5 h-5 text-white/60 cursor-grab drop-shadow-lg" />
                  </div>
                </div>

                {/* Content Area */}
                <div className="p-4 relative">
                  {/* Decorative golden line */}
                  <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-sacred-400/40 to-transparent" />
                  
                  <div className="flex items-start justify-between pt-1 mb-2">
                    <div className="flex-1 min-w-0">
                      {!module.image_url && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 mb-2 bg-orange-500/10 rounded text-xs font-medium text-orange-600 dark:text-orange-400">
                          <ImageOff className="w-3 h-3" />
                          Sem banner
                        </span>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {module.description || 'Sem descrição'}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 ml-2">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setEditingModule(module);
                          setIsEditDialogOpen(true);
                        }}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => togglePublish(module)}>
                          {module.is_published ? (
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
                          onClick={() => handleQuickRegenerate(module)}
                          disabled={regeneratingBanner === module.id}
                        >
                          {regeneratingBanner === module.id ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Gerando...
                            </>
                          ) : (
                            <>
                              <Wand2 className="w-4 h-4 mr-2" />
                              {module.image_url ? 'Regenerar Banner' : 'Gerar Banner'}
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDeleteModule(module)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-border/50">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <BookOpen className="w-4 h-4" />
                      <span>{module.lessons_count || 0} lições</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="hover:bg-sacred-100 hover:text-sacred-700 hover:border-sacred-300 dark:hover:bg-sacred-900/20 dark:hover:text-sacred-400"
                      onClick={() => navigate(`/admin/modules/${module.id}/lessons`)}
                    >
                      Gerenciar Lições
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-serif">Editar Módulo</DialogTitle>
            <DialogDescription>
              Atualize as informações do módulo
            </DialogDescription>
          </DialogHeader>
          {editingModule && (
            <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Título do Módulo</Label>
                <Input
                  id="edit-title"
                  value={editingModule.title}
                  onChange={(e) => setEditingModule({ ...editingModule, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Descrição</Label>
                <Textarea
                  id="edit-description"
                  value={editingModule.description || ''}
                  onChange={(e) => setEditingModule({ ...editingModule, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={editingModule.type}
                    onValueChange={(value) => setEditingModule({ ...editingModule, type: value as 'proficiency' | 'thematic' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proficiency">Proficiência</SelectItem>
                      <SelectItem value="thematic">Temático</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editingModule.type === 'proficiency' ? (
                  <div className="space-y-2">
                    <Label>Nível</Label>
                    <Select
                      value={editingModule.level || 'akapo'}
                      onValueChange={(value) => setEditingModule({ ...editingModule, level: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="akapo">Akapo</SelectItem>
                        <SelectItem value="awo">Awo</SelectItem>
                        <SelectItem value="oluwo">Oluwo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="edit-theme">Tema</Label>
                    <Input
                      id="edit-theme"
                      value={editingModule.theme || ''}
                      onChange={(e) => setEditingModule({ ...editingModule, theme: e.target.value })}
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Cor do Módulo</Label>
                <Select
                  value={editingModule.color || 'from-amber-500 to-orange-600'}
                  onValueChange={(value) => setEditingModule({ ...editingModule, color: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded bg-gradient-to-br ${color.value}`} />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Imagem de Capa</Label>
                <MediaUploader
                  moduleId={editingModule.id}
                  onUploadComplete={(url) => setEditingModule({ ...editingModule, image_url: url })}
                  acceptedTypes="image/*"
                  maxSizeMB={10}
                  label="Enviar Imagem"
                  currentUrl={editingModule.image_url || undefined}
                />
              </div>
              <div className="space-y-2">
                <Label>Gerar Banner com IA</Label>
                <BannerGenerator
                  moduleId={editingModule.id}
                  moduleTitle={editingModule.title}
                  moduleDescription={editingModule.description}
                  currentImageUrl={editingModule.image_url}
                  onBannerGenerated={(url) => setEditingModule({ ...editingModule, image_url: url })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editingModule.is_published}
                  onCheckedChange={(checked) => setEditingModule({ ...editingModule, is_published: checked })}
                />
                <Label>{editingModule.is_published ? 'Publicado' : 'Rascunho'}</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="gradient-gold text-secondary" 
              onClick={handleUpdateModule}
              disabled={!editingModule?.title}
            >
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminModules;
