import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Search, 
  Eye,
  EyeOff,
  Clock,
  Layers,
  FileText,
  ChevronRight,
  Home,
  GraduationCap,
  Users,
  CreditCard,
  BarChart3,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { NavLink } from '@/components/NavLink';

interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  display_order: number;
  is_published: boolean;
  module_title: string;
  module_color: string | null;
}

interface ModuleGroup {
  id: string;
  title: string;
  color: string | null;
  lessons: Lesson[];
}

const sidebarLinks = [
  { to: '/admin', icon: Home, label: 'Dashboard' },
  { to: '/admin/modules', icon: Layers, label: 'Módulos' },
  { to: '/admin/lessons', icon: BookOpen, label: 'Lições' },
  { to: '/admin/users', icon: Users, label: 'Usuários' },
  { to: '/admin/payments', icon: CreditCard, label: 'Pagamentos' },
  { to: '/admin/reports', icon: BarChart3, label: 'Relatórios' },
  { to: '/admin/settings', icon: Settings, label: 'Configurações' },
];

const AdminLessonsOverview: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAllLessons();
  }, []);

  const fetchAllLessons = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          id,
          module_id,
          title,
          description,
          duration_minutes,
          display_order,
          is_published,
          modules!inner (
            title,
            color
          )
        `)
        .order('display_order', { ascending: true });

      if (error) throw error;

      const formattedLessons: Lesson[] = (data || []).map((lesson: any) => ({
        id: lesson.id,
        module_id: lesson.module_id,
        title: lesson.title,
        description: lesson.description,
        duration_minutes: lesson.duration_minutes,
        display_order: lesson.display_order,
        is_published: lesson.is_published,
        module_title: lesson.modules.title,
        module_color: lesson.modules.color,
      }));

      setLessons(formattedLessons);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar lições',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredLessons = lessons.filter(lesson =>
    lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lesson.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lesson.module_title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group lessons by module
  const groupedByModule = filteredLessons.reduce<Record<string, ModuleGroup>>((acc, lesson) => {
    if (!acc[lesson.module_id]) {
      acc[lesson.module_id] = {
        id: lesson.module_id,
        title: lesson.module_title,
        color: lesson.module_color,
        lessons: [],
      };
    }
    acc[lesson.module_id].lessons.push(lesson);
    return acc;
  }, {});

  const moduleGroups = Object.values(groupedByModule);

  // Statistics
  const totalLessons = lessons.length;
  const publishedLessons = lessons.filter(l => l.is_published).length;
  const draftLessons = totalLessons - publishedLessons;
  const totalDuration = lessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);

  return (
    <div className="min-h-screen bg-muted/30 flex w-full" data-allow-context-menu data-allow-copy>
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
          
          <nav className="flex-1 p-4 space-y-1">
            {sidebarLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/admin'}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
              >
                <link.icon className="w-5 h-5" />
                <span>{link.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">Todas as Lições</h1>
            <p className="text-muted-foreground mt-1">
              Visualize e gerencie todas as lições de todos os módulos
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-border shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Lições</CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{totalLessons}</div>
              )}
            </CardContent>
          </Card>
          
          <Card className="border-border shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Publicadas</CardTitle>
              <Eye className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-green-600">{publishedLessons}</div>
              )}
            </CardContent>
          </Card>
          
          <Card className="border-border shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rascunhos</CardTitle>
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{draftLessons}</div>
              )}
            </CardContent>
          </Card>
          
          <Card className="border-border shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Duração Total</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{Math.round(totalDuration / 60)}h {totalDuration % 60}min</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar lições ou módulos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-4">
                <Skeleton className="h-6 w-48 mb-4" />
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : moduleGroups.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif text-lg font-semibold text-foreground mb-2">
              Nenhuma lição encontrada
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Tente uma busca diferente' : 'Crie módulos e adicione lições para começar'}
            </p>
            {!searchQuery && (
              <Button 
                className="gradient-gold text-secondary"
                onClick={() => navigate('/admin/modules')}
              >
                <Layers className="w-4 h-4 mr-2" />
                Ir para Módulos
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {moduleGroups.map((group) => (
              <div key={group.id} className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
                <div 
                  className="p-4 border-b border-border flex items-center justify-between"
                  style={{ borderLeftWidth: 4, borderLeftColor: group.color || '#8B5CF6' }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${group.color || '#8B5CF6'}20` }}
                    >
                      <GraduationCap className="w-5 h-5" style={{ color: group.color || '#8B5CF6' }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{group.title}</h3>
                      <p className="text-sm text-muted-foreground">{group.lessons.length} lições</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/admin/modules/${group.id}/lessons`)}
                  >
                    Gerenciar
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                
                <div className="divide-y divide-border">
                  {group.lessons.map((lesson) => (
                    <div 
                      key={lesson.id}
                      className="p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/admin/modules/${lesson.module_id}/lessons/${lesson.id}/exercises`)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground truncate">{lesson.title}</span>
                          {lesson.is_published ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 flex-shrink-0">
                              Publicada
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground flex-shrink-0">
                              Rascunho
                            </span>
                          )}
                        </div>
                        {lesson.description && (
                          <p className="text-sm text-muted-foreground truncate">{lesson.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-shrink-0">
                        <Clock className="w-4 h-4" />
                        <span>{lesson.duration_minutes || 30} min</span>
                      </div>

                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminLessonsOverview;
