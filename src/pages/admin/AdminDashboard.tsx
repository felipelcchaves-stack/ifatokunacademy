import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  Settings, 
  CreditCard,
  BarChart3,
  LogOut,
  ChevronRight,
  Plus,
  FileText,
  CheckCircle,
  Clock,
  Upload,
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface ModuleData {
  id: string;
  title: string;
  type: string;
  is_published: boolean;
  created_at: string;
  color: string | null;
  lesson_count: number;
}

interface UserData {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  is_admin: boolean;
}

interface Stats {
  totalModules: number;
  activeUsers: number;
  totalLessons: number;
  completionRate: number;
}

const AdminDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, isAdmin } = useAuth();

  const [modules, setModules] = useState<ModuleData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalModules: 0,
    activeUsers: 0,
    totalLessons: 0,
    completionRate: 0
  });
  const [loading, setLoading] = useState(true);

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Admin';

  // Redirect if not admin - handled by ProtectedRoute now
  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch modules with lesson count
        const { data: modulesData, error: modulesError } = await supabase
          .from('modules')
          .select('id, title, type, is_published, created_at, color')
          .order('created_at', { ascending: false })
          .limit(4);

        if (modulesError) throw modulesError;

        // Get lesson count for each module
        const modulesWithCount = await Promise.all(
          (modulesData || []).map(async (module) => {
            const { count } = await supabase
              .from('lessons')
              .select('*', { count: 'exact', head: true })
              .eq('module_id', module.id);
            
            return {
              ...module,
              lesson_count: count || 0
            };
          })
        );

        setModules(modulesWithCount);

        // Fetch profiles/users
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        if (profilesError) throw profilesError;

        // Check admin status for each user
        const usersWithAdmin = await Promise.all(
          (profilesData || []).map(async (userProfile) => {
            const { data: isAdminResult } = await supabase
              .rpc('is_admin', { user_id: userProfile.id });
            
            return {
              ...userProfile,
              is_admin: isAdminResult || false
            };
          })
        );

        setUsers(usersWithAdmin);

        // Fetch stats
        const { count: totalModules } = await supabase
          .from('modules')
          .select('*', { count: 'exact', head: true });

        const { count: totalUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        const { count: totalLessons } = await supabase
          .from('lessons')
          .select('*', { count: 'exact', head: true });

        const { count: totalCompletions } = await supabase
          .from('module_completions')
          .select('*', { count: 'exact', head: true });

        // Calculate completion rate (completions / (users * modules) * 100)
        const possibleCompletions = (totalUsers || 0) * (totalModules || 0);
        const completionRate = possibleCompletions > 0 
          ? Math.round(((totalCompletions || 0) / possibleCompletions) * 100) 
          : 0;

        setStats({
          totalModules: totalModules || 0,
          activeUsers: totalUsers || 0,
          totalLessons: totalLessons || 0,
          completionRate
        });

      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const sidebarItems = [
    { icon: LayoutDashboard, label: 'Visão Geral', path: '/admin' },
    { icon: BookOpen, label: 'Módulos', path: '/admin/modules' },
    { icon: FileText, label: 'Lições', path: '/admin/lessons' },
    { icon: Upload, label: 'Importar Odu', path: '/admin/import-odu' },
    { icon: Users, label: 'Usuários', path: '/admin/users' },
    { icon: CreditCard, label: 'Pagamentos', path: '/admin/payments' },
    { icon: BarChart3, label: 'Relatórios', path: '/admin/reports' },
    { icon: Settings, label: 'Configurações', path: '/admin/settings' },
  ];

  const statsDisplay = [
    { label: 'Total de Módulos', value: stats.totalModules.toString(), change: 'Criados no sistema' },
    { label: 'Usuários Ativos', value: stats.activeUsers.toString(), change: 'Cadastrados' },
    { label: 'Lições Criadas', value: stats.totalLessons.toString(), change: 'No total' },
    { label: 'Taxa de Conclusão', value: `${stats.completionRate}%`, change: 'Média geral' },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short'
    });
  };

  // If viewing a specific admin page, render the outlet
  if (location.pathname !== '/admin') {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border z-50">
        <div className="flex flex-col h-full">
          {/* Logo */}
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

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {/* Botão Área do Aluno */}
            <Link
              to="/dashboard"
              className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors mb-2 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Área do Aluno</span>
            </Link>

            <div className="border-b border-sidebar-border my-2" />

            {sidebarItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                  ${isActive(item.path) 
                    ? 'bg-sidebar-accent text-sidebar-primary' 
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* User */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-sidebar-primary/20 flex items-center justify-center">
                <span className="text-sm font-medium text-sidebar-primary">
                  {displayName?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</p>
                <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8" data-allow-context-menu data-allow-copy>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">
              Painel de Controle
            </h1>
            <p className="text-muted-foreground mt-1">
              Bem-vindo de volta, {displayName?.split(' ')[0]}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/admin/modules')}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Módulo
            </Button>
            <Button className="gradient-gold text-secondary shadow-gold" onClick={() => navigate('/admin/lessons')}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Lição
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl p-6 border border-border shadow-soft">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))
          ) : (
            statsDisplay.map((stat, index) => (
              <div key={index} className="bg-card rounded-xl p-6 border border-border shadow-soft">
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-primary mt-2">{stat.change}</p>
              </div>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Modules */}
          <div className="bg-card rounded-xl border border-border shadow-soft">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-serif text-lg font-semibold text-foreground">Módulos Recentes</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/modules')}>
                Ver todos <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-8 w-16" />
                  </div>
                ))
              ) : modules.length === 0 ? (
                <div className="p-8 text-center">
                  <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground mb-4">Nenhum módulo criado ainda</p>
                  <Button variant="outline" size="sm" onClick={() => navigate('/admin/modules')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Módulo
                  </Button>
                </div>
              ) : (
                modules.map((module) => (
                  <div key={module.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: module.color || '#8B5CF6' }}
                    >
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{module.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {module.lesson_count} lições • {module.type === 'proficiency' ? 'Proficiência' : 'Temático'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={module.is_published ? 'default' : 'secondary'} className="text-xs">
                        {module.is_published ? 'Publicado' : 'Rascunho'}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/modules?edit=${module.id}`)}>
                        Editar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Users */}
          <div className="bg-card rounded-xl border border-border shadow-soft">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="font-serif text-lg font-semibold text-foreground">Usuários Recentes</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')}>
                Ver todos <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))
              ) : users.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">Nenhum usuário cadastrado ainda</p>
                </div>
              ) : (
                users.map((userItem) => (
                  <div key={userItem.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-primary">
                        {(userItem.full_name || userItem.email || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {userItem.full_name || 'Sem nome'}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">{userItem.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {userItem.is_admin && (
                        <Badge variant="outline" className="text-primary border-primary text-xs">
                          Admin
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(userItem.created_at)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Integrations Status */}
        <div className="bg-card rounded-xl border border-border shadow-soft p-6">
          <h2 className="font-serif text-lg font-semibold text-foreground mb-6">Status das Integrações</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-foreground">Lovable Cloud</p>
                <p className="text-sm text-green-600 dark:text-green-400">Conectado</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="font-medium text-foreground">ElevenLabs</p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">Pendente</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="font-medium text-foreground">Pagar.me</p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">Pendente</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="font-medium text-foreground">Checkout Guru</p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">Pendente</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
