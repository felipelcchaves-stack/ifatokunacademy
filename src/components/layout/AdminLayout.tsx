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
  Upload,
  FileText,
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Admin';

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

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path);
  };

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
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
