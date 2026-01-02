import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Settings, BookOpen, Lock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';

const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, profile, isAuthenticated, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Usuário';

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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center shadow-gold">
              <span className="font-serif text-lg font-bold text-secondary">O</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-serif text-lg font-semibold text-foreground">
                Offe Orunmila
              </h1>
              <p className="text-xs text-muted-foreground -mt-1">Learning</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link 
              to="/modules" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Módulos
            </Link>
            <Link 
              to="/about" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sobre
            </Link>
            <Link 
              to="/pricing" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Planos
            </Link>
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 h-auto py-1.5">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-primary/20 text-primary">
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
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
                  
                  <DropdownMenuItem onClick={() => navigate('/dashboard')} className="py-2.5">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Meu Aprendizado
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
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
            <nav className="flex flex-col gap-4">
              <Link 
                to="/modules" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Módulos
              </Link>
              <Link 
                to="/about" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sobre
              </Link>
              <Link 
                to="/pricing" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Planos
              </Link>
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                {isAuthenticated ? (
                  <>
                    {/* Mobile User Info */}
                    <div className="flex items-center gap-3 px-2 py-3 mb-2">
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
                    
                    <Button 
                      variant="ghost" 
                      className="justify-start"
                      onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }}
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Meu Aprendizado
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start"
                      onClick={() => { navigate('/settings'); setMobileMenuOpen(false); }}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Configurações
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="justify-start"
                      onClick={() => { navigate('/settings?tab=security'); setMobileMenuOpen(false); }}
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Alterar Senha
                    </Button>
                    {isAdmin && (
                      <Button 
                        variant="ghost" 
                        className="justify-start"
                        onClick={() => { navigate('/admin'); setMobileMenuOpen(false); }}
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Painel Admin
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      className="justify-start text-destructive"
                      onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sair
                    </Button>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
