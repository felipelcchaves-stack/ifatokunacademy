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
  Home,
  UserPlus,
  MousePointer,
  GripVertical,
  Building2,
  ChevronDown,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useAdminOrganization } from '@/hooks/useAdminOrganization';

const AdminLayout: React.FC = () => {
  const { platformName } = usePlatformSettings();
  const displayPlatformName = platformName?.split(' ').slice(0, 2).join(' ') || 'Offe Orunmila';
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, isAdmin } = useAuth();
  const { organization, isOrgAdmin } = useOrganization();
  const { activeOrg, organizations, loading: orgsLoading, switchOrganization } = useAdminOrganization();

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Admin';

  // Itens do menu para admin global
  const globalAdminItems = [
    { icon: LayoutDashboard, label: 'Visão Geral', path: '/admin' },
    { icon: BookOpen, label: 'Módulos', path: '/admin/modules' },
    { icon: FileText, label: 'Lições', path: '/admin/lessons' },
    { icon: Upload, label: 'Importar Odu', path: '/admin/import-odu' },
    { icon: MousePointer, label: 'Gerar TapComplete', path: '/admin/generate-tap-complete' },
    { icon: GripVertical, label: 'Gerar Drag & Drop', path: '/admin/generate-drag-drop' },
    { icon: Users, label: 'Usuários', path: '/admin/users' },
    { icon: UserPlus, label: 'Convites', path: '/admin/invites' },
    { icon: Building2, label: 'Organizações', path: '/admin/organizations' },
    { icon: CreditCard, label: 'Pagamentos', path: '/admin/payments' },
    { icon: BarChart3, label: 'Relatórios', path: '/admin/reports' },
    { icon: Settings, label: 'Configurações', path: '/admin/settings' },
  ];

  // Itens do menu para org admin (não global)
  const orgAdminItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/org-dashboard' },
    { icon: BookOpen, label: 'Módulos', path: '/admin/modules' },
    { icon: FileText, label: 'Lições', path: '/admin/lessons' },
    { icon: Users, label: 'Usuários', path: '/admin/users' },
    { icon: UserPlus, label: 'Convites', path: '/admin/invites' },
    { icon: BarChart3, label: 'Relatórios', path: '/admin/reports' },
  ];

  // Usar menu apropriado baseado no tipo de admin
  const sidebarItems = isAdmin ? globalAdminItems : orgAdminItems;

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin';
    if (path === '/admin/org-dashboard') return location.pathname === '/admin/org-dashboard';
    return location.pathname.startsWith(path);
  };

  // Determinar a URL da área do aluno baseado na org ativa
  const studentAreaUrl = activeOrg?.slug 
    ? `/org/${activeOrg.slug}/dashboard`
    : '/dashboard';

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border z-50">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-sidebar-border">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center shadow-gold">
                <span className="font-serif text-lg font-bold text-secondary">{displayPlatformName.charAt(0)}</span>
              </div>
              <div>
                <h1 className="font-serif font-semibold text-sidebar-foreground">
                  {isAdmin ? 'Admin' : 'Org Admin'}
                </h1>
                <p className="text-xs text-sidebar-foreground/60">
                  {isAdmin ? displayPlatformName : (organization?.name || displayPlatformName)}
                </p>
              </div>
            </Link>
          </div>

          {/* Seletor de Organização */}
          {organizations.length > 0 && (
            <div className="px-4 py-3 border-b border-sidebar-border">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between bg-sidebar-accent/50 border-sidebar-border hover:bg-sidebar-accent"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="truncate text-sm font-medium">
                        {orgsLoading ? 'Carregando...' : (activeOrg?.name || 'Selecionar Org')}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Gerenciando
                  </div>
                  <DropdownMenuSeparator />
                  {organizations.map((org) => (
                    <DropdownMenuItem
                      key={org.id}
                      onClick={() => switchOrganization(org.id)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ backgroundColor: (org.branding as any)?.primaryColor || '#8B5CF6' }}
                        >
                          {org.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="truncate">{org.name}</span>
                      </div>
                      {activeOrg?.id === org.id && (
                        <Check className="w-4 h-4 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {/* Botão Área do Aluno */}
            <Link
              to={studentAreaUrl}
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
