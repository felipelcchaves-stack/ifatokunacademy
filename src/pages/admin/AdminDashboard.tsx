import React from 'react';
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
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { proficiencyModules, thematicModules, mockUsers } from '@/data/mockData';

const AdminDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, isAdmin } = useAuth();

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Admin';

  // Redirect if not admin - handled by ProtectedRoute now
  React.useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
    }
  }, [isAdmin, navigate]);

  const sidebarItems = [
    { icon: LayoutDashboard, label: 'Visão Geral', path: '/admin' },
    { icon: BookOpen, label: 'Módulos', path: '/admin/modules' },
    { icon: FileText, label: 'Lições', path: '/admin/lessons' },
    { icon: Users, label: 'Usuários', path: '/admin/users' },
    { icon: CreditCard, label: 'Pagamentos', path: '/admin/payments' },
    { icon: BarChart3, label: 'Relatórios', path: '/admin/reports' },
    { icon: Settings, label: 'Configurações', path: '/admin/settings' },
  ];

  const stats = [
    { label: 'Total de Módulos', value: proficiencyModules.length + thematicModules.length, change: '+2 este mês' },
    { label: 'Usuários Ativos', value: mockUsers.length, change: '+15 esta semana' },
    { label: 'Lições Criadas', value: 45, change: '+8 este mês' },
    { label: 'Taxa de Conclusão', value: '68%', change: '+5% vs. mês anterior' },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
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
          {stats.map((stat, index) => (
            <div key={index} className="bg-card rounded-xl p-6 border border-border shadow-soft">
              <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-primary mt-2">{stat.change}</p>
            </div>
          ))}
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
              {[...proficiencyModules, ...thematicModules].slice(0, 4).map((module) => (
                <div key={module.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${module.color} flex items-center justify-center flex-shrink-0`}>
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{module.title}</p>
                    <p className="text-sm text-muted-foreground">{module.totalLessons} lições</p>
                  </div>
                  <Button variant="ghost" size="sm">Editar</Button>
                </div>
              ))}
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
              {mockUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-primary">
                      {user.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    {user.role === 'admin' ? 'Admin' : 'Estudante'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Integrations Status */}
        <div className="bg-card rounded-xl border border-border shadow-soft p-6">
          <h2 className="font-serif text-lg font-semibold text-foreground mb-6">Status das Integrações</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <span className="text-orange-600 font-bold text-sm">XI</span>
              </div>
              <div>
                <p className="font-medium text-foreground">ElevenLabs</p>
                <p className="text-sm text-muted-foreground">Pendente configuração</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <span className="text-green-600 font-bold text-sm">PG</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Pagar.me</p>
                <p className="text-sm text-muted-foreground">Pendente configuração</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-bold text-sm">CG</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Checkout Guru</p>
                <p className="text-sm text-muted-foreground">Pendente configuração</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
