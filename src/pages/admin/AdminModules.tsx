import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  MoreVertical, 
  BookOpen, 
  Edit, 
  Trash2,
  GripVertical
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
import { proficiencyModules, thematicModules, Module } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';

const AdminModules: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newModule, setNewModule] = useState({
    title: '',
    description: '',
    type: 'proficiency' as 'proficiency' | 'thematic',
    level: 'Akapo' as 'Akapo' | 'Awo' | 'Oluwo',
    theme: '',
  });

  const allModules = [...proficiencyModules, ...thematicModules];
  const filteredModules = allModules.filter(module =>
    module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    module.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateModule = () => {
    toast({
      title: 'Módulo criado!',
      description: `O módulo "${newModule.title}" foi criado com sucesso.`,
    });
    setIsCreateDialogOpen(false);
    setNewModule({ title: '', description: '', type: 'proficiency', level: 'Akapo', theme: '' });
  };

  const handleDeleteModule = (module: Module) => {
    toast({
      title: 'Módulo excluído',
      description: `O módulo "${module.title}" foi excluído.`,
    });
  };

  return (
    <div className="min-h-screen bg-muted/30" data-allow-context-menu data-allow-copy>
      {/* Sidebar (same as AdminDashboard) */}
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
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-gold text-secondary shadow-gold">
                <Plus className="w-4 h-4 mr-2" />
                Novo Módulo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-serif">Criar Novo Módulo</DialogTitle>
                <DialogDescription>
                  Preencha as informações do novo módulo
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
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
                        onValueChange={(value) => setNewModule({ ...newModule, level: value as 'Akapo' | 'Awo' | 'Oluwo' })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Akapo">Akapo</SelectItem>
                          <SelectItem value="Awo">Awo</SelectItem>
                          <SelectItem value="Oluwo">Oluwo</SelectItem>
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button className="gradient-gold text-secondary" onClick={handleCreateModule}>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModules.map((module) => (
            <div 
              key={module.id}
              className="bg-card rounded-xl border border-border shadow-soft overflow-hidden group"
            >
              {/* Header */}
              <div className={`h-24 bg-gradient-to-br ${module.color} relative pattern-adinkra`}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                  <span className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded text-xs font-medium text-white">
                    {module.type === 'proficiency' ? `Nível ${module.level}` : module.theme}
                  </span>
                  <GripVertical className="w-5 h-5 text-white/60 cursor-grab" />
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-serif text-lg font-semibold text-foreground">
                    {module.title}
                  </h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
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
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {module.description}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <BookOpen className="w-4 h-4" />
                    <span>{module.lessons.length} lições</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/admin/modules/${module.id}/lessons`)}
                  >
                    Gerenciar Lições
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AdminModules;
