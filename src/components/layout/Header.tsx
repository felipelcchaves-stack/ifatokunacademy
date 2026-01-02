import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, Settings, Lock, Shield, LayoutDashboard, Brain, Trophy, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { useExperience } from '@/hooks/useExperience';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { cn } from '@/lib/utils';

// Links para visitantes (não logados)
const visitorLinks = [
  { label: 'Módulos', to: '/modules' },
  { label: 'Sobre', to: '/about' },
  { label: 'Planos', to: '/pricing' },
];

// Links para alunos (logados)
const studentLinks = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Revisar', to: '/spaced-review', icon: Brain },
  { label: 'Desafios', to: '/challenge', icon: Trophy },
  { label: 'Estatísticas', to: '/review/stats', icon: BarChart3 },
];

const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, profile, isAuthenticated, isAdmin, signOut } = useAuth();
  const { experience, getProgressToNextLevel, getXPForNextLevel } = useExperience();
  const { platformName } = usePlatformSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const displayPlatformName = platformName?.split(' ').slice(0, 2).join(' ') || 'Offe Orunmila';
  const displayPlatformSuffix = platformName?.split(' ').slice(2).join(' ') || 'Learning';

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const levelProgress = getProgressToNextLevel();
  const xpForNext = getXPForNextLevel();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const isActiveLink = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center shadow-gold">
              <span className="font-serif text-lg font-bold text-secondary">{displayPlatformName.charAt(0)}</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-serif text-lg font-semibold text-foreground">
                {displayPlatformName}
              </h1>
              <p className="text-xs text-muted-foreground -mt-1">{displayPlatformSuffix}</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {isAuthenticated ? (
              // Links para aluno logado
              studentLinks.map(link => (
                <Link 
                  key={link.to} 
                  to={link.to} 
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors",
                    isActiveLink(link.to) 
                      ? "text-primary" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              ))
            ) : (
              // Links para visitante
              visitorLinks.map(link => (
                <Link 
                  key={link.to} 
                  to={link.to} 
                  className={cn(
                    "text-sm font-medium transition-colors",
                    isActiveLink(link.to) 
                      ? "text-primary" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              ))
            )}
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 h-auto py-1.5">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative">
                            <Avatar className="w-8 h-8 ring-2 ring-primary/30">
                              <AvatarImage src={profile?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs bg-primary/20 text-primary">
                                {getInitials(displayName)}
                              </AvatarFallback>
                            </Avatar>
                            {/* Level badge */}
                            {experience && (
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[10px] font-bold text-primary-foreground shadow-sm">
                                {experience.current_level}
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="w-56 p-3">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold">{experience?.level_name || 'Kékeré'}</span>
                              <span className="text-xs text-muted-foreground">Nível {experience?.current_level || 1}</span>
                            </div>
                            <Progress value={levelProgress} className="h-2" />
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{experience?.total_xp || 0} XP</span>
                              <span>Próximo: {xpForNext} XP</span>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className="text-sm font-medium">{displayName}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {/* Cabeçalho com info do usuário */}
                  <div className="flex items-center gap-3 p-3 border-b border-border">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-sm bg-primary/20 text-primary">
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">{profile?.email || user?.email}</p>
                    </div>
                  </div>
                  
                  <DropdownMenuItem onClick={() => navigate('/settings')} className="py-2.5">
                    <Settings className="w-4 h-4 mr-2" />
                    Configurações
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings?tab=security')} className="py-2.5">
                    <Lock className="w-4 h-4 mr-2" />
                    Alterar Senha
                  </DropdownMenuItem>
                  
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate('/admin')} className="py-2.5">
                        <Shield className="w-4 h-4 mr-2" />
                        Painel Admin
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="py-2.5 text-destructive focus:text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" onClick={() => navigate('/login')}>
                  Entrar
                </Button>
                <Button 
                  className="gradient-gold text-secondary font-semibold shadow-gold hover:opacity-90 transition-opacity"
                  onClick={() => navigate('/register')}
                >
                  Começar Agora
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in-up">
            <nav className="flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  {/* Mobile User Info */}
                  <div className="flex items-center gap-3 px-2 py-3 mb-2 border-b border-border">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-sm bg-primary/20 text-primary">
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">{profile?.email || user?.email}</p>
                    </div>
                  </div>

                  {/* Student Navigation Links */}
                  {studentLinks.map(link => (
                    <Link 
                      key={link.to}
                      to={link.to} 
                      className={cn(
                        "flex items-center gap-3 px-2 py-2.5 text-sm font-medium rounded-md transition-colors",
                        isActiveLink(link.to) 
                          ? "bg-primary/10 text-primary" 
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <link.icon className="w-4 h-4" />
                      {link.label}
                    </Link>
                  ))}

                  <div className="border-t border-border mt-2 pt-2">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => { navigate('/settings'); setMobileMenuOpen(false); }}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Configurações
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => { navigate('/settings?tab=security'); setMobileMenuOpen(false); }}
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Alterar Senha
                    </Button>
                    {isAdmin && (
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start"
                        onClick={() => { navigate('/admin'); setMobileMenuOpen(false); }}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Painel Admin
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-destructive"
                      onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sair
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* Visitor Navigation Links */}
                  {visitorLinks.map(link => (
                    <Link 
                      key={link.to}
                      to={link.to} 
                      className={cn(
                        "px-2 py-2.5 text-sm font-medium rounded-md transition-colors",
                        isActiveLink(link.to) 
                          ? "bg-primary/10 text-primary" 
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                  
                  <div className="flex flex-col gap-2 pt-4 border-t border-border mt-2">
                    <Button 
                      variant="ghost"
                      onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
                    >
                      Entrar
                    </Button>
                    <Button 
                      className="gradient-gold text-secondary font-semibold"
                      onClick={() => { navigate('/register'); setMobileMenuOpen(false); }}
                    >
                      Começar Agora
                    </Button>
                  </div>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
