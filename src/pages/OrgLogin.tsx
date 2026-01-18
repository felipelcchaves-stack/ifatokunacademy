import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import loginBg from '@/assets/login-bg.jpg';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import MFAVerification from '@/components/auth/MFAVerification';
import { OrganizationBranding } from '@/contexts/OrganizationContext';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

interface Organization {
  id: string;
  name: string;
  slug: string;
  branding: OrganizationBranding | null;
  is_active: boolean;
}

const defaultBranding: OrganizationBranding = {
  logo_url: null,
  favicon_url: null,
  primary_color: '263 70% 50%',
  secondary_color: '263 30% 25%',
  accent_color: '45 93% 47%',
  font_family: 'Inter',
  login_background_url: null,
};

const OrgLogin: React.FC = () => {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showMFA, setShowMFA] = useState(false);
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });
  const parallaxRef = useRef<HTMLDivElement>(null);
  const hasCheckedMFA = useRef(false);
  const loginInProgress = useRef(false);
  
  // Organization state
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgError, setOrgError] = useState<string | null>(null);
  
  const { signIn, isAuthenticated, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [accessDenied, setAccessDenied] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);

  // Fetch organization by slug
  useEffect(() => {
    const fetchOrganization = async () => {
      if (!orgSlug) {
        setOrgError('Organização não especificada');
        setOrgLoading(false);
        return;
      }

      try {
        setOrgLoading(true);
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, slug, branding, is_active')
          .eq('slug', orgSlug)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            setOrgError('Organização não encontrada');
          } else {
            setOrgError('Erro ao carregar organização');
          }
          return;
        }

        if (!data.is_active) {
          setOrgError('Esta organização está desativada');
          return;
        }

        // Parse branding
        const rawBranding = data.branding as Record<string, unknown> | null;
        const branding: OrganizationBranding = {
          ...defaultBranding,
          ...(rawBranding || {}) as Partial<OrganizationBranding>
        };

        setOrganization({
          ...data,
          branding,
        });
      } catch (err) {
        console.error('Error fetching organization:', err);
        setOrgError('Erro ao carregar organização');
      } finally {
        setOrgLoading(false);
      }
    };

    fetchOrganization();
  }, [orgSlug]);

  // Dynamic branding from organization
  const branding = organization?.branding || defaultBranding;
  const orgName = organization?.name || 'Plataforma de Ensino';
  const displayPlatformName = orgName.split(' ').slice(0, 2).join(' ') || 'Plataforma';
  const displayPlatformSuffix = orgName.split(' ').slice(2).join(' ') || '';
  
  // Dynamic background image
  const backgroundImage = branding?.login_background_url || loginBg;
  
  // Dynamic logo
  const logoUrl = branding?.logo_url;

  const basePath = `/org/${orgSlug}`;
  const from = (location.state as any)?.from?.pathname || `${basePath}/dashboard`;
  const safeFrom = from.startsWith('/admin') ? `${basePath}/dashboard` : from;

  // Apply dynamic CSS variables for this page
  useEffect(() => {
    if (branding) {
      const root = document.documentElement;
      
      // Store original values
      const originalPrimary = getComputedStyle(root).getPropertyValue('--primary');
      const originalSecondary = getComputedStyle(root).getPropertyValue('--secondary');
      const originalAccent = getComputedStyle(root).getPropertyValue('--accent');
      
      // Apply tenant branding
      if (branding.primary_color) {
        root.style.setProperty('--primary', branding.primary_color);
      }
      if (branding.secondary_color) {
        root.style.setProperty('--secondary', branding.secondary_color);
      }
      if (branding.accent_color) {
        root.style.setProperty('--accent', branding.accent_color);
      }
      
      // Cleanup on unmount - restore original values
      return () => {
        root.style.setProperty('--primary', originalPrimary);
        root.style.setProperty('--secondary', originalSecondary);
        root.style.setProperty('--accent', originalAccent);
      };
    }
  }, [branding]);

  // Effect to handle post-login navigation with organization access check
  useEffect(() => {
    const checkUserOrgAccess = async () => {
      if (!user || !organization) return;
      
      setCheckingAccess(true);
      try {
        // Check if user is global admin
        if (isAdmin) {
          // Global admins have access to all orgs
          return true;
        }
        
        // Check if user belongs to this organization
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();
        
        if (profile?.organization_id === organization.id) {
          return true;
        }
        
        // Check if user is an org admin for this organization
        const { data: orgAdminCheck } = await supabase
          .from('organization_admins')
          .select('id')
          .eq('organization_id', organization.id)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (orgAdminCheck) {
          return true;
        }
        
        // User doesn't have access
        return false;
      } catch (err) {
        console.error('Error checking org access:', err);
        return false;
      } finally {
        setCheckingAccess(false);
      }
    };

    const handleNavigation = async () => {
      if (!isAuthenticated || showMFA) return;
      
      // If just logged in, check MFA first
      if (loginInProgress.current && !hasCheckedMFA.current) {
        hasCheckedMFA.current = true;
        setTimeout(() => {
          checkMFAStatus(safeFrom);
        }, 100);
        return;
      }
      
      // For already authenticated users, verify org access
      if (!loginInProgress.current) {
        const hasAccess = await checkUserOrgAccess();
        
        if (hasAccess) {
          navigate(safeFrom, { replace: true });
        } else {
          setAccessDenied(true);
        }
      }
    };

    handleNavigation();
  }, [isAuthenticated, showMFA, safeFrom, navigate, user, organization, isAdmin]);

  // Parallax effect on mouse movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!parallaxRef.current) return;
      
      const rect = parallaxRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const offsetX = ((e.clientX - centerX) / rect.width) * 15;
      const offsetY = ((e.clientY - centerY) / rect.height) * 15;
      
      setParallaxOffset({ x: offsetX, y: offsetY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const checkMFAStatus = async (targetPath: string) => {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (error || !data) {
        toast({
          title: 'Bem-vindo!',
          description: 'Login realizado com sucesso.',
        });
        navigate(targetPath, { replace: true });
        return;
      }

      if (data.currentLevel === 'aal1' && data.nextLevel === 'aal2') {
        setShowMFA(true);
      } else {
        toast({
          title: 'Bem-vindo!',
          description: 'Login realizado com sucesso.',
        });
        navigate(targetPath, { replace: true });
      }
    } catch (error) {
      console.error('Error checking MFA status:', error);
      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso.',
      });
      navigate(targetPath, { replace: true });
    }
  };

  const handleMFAVerified = () => {
    setShowMFA(false);
    toast({
      title: 'Bem-vindo!',
      description: 'Login realizado com sucesso.',
    });
    navigate(safeFrom, { replace: true });
  };

  const handleMFACancel = async () => {
    await supabase.auth.signOut();
    setShowMFA(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    loginInProgress.current = true;
    hasCheckedMFA.current = false;

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        let message = 'Ocorreu um erro ao fazer login.';
        
        if (error.message.includes('Invalid login credentials')) {
          message = 'E-mail ou senha incorretos.';
        } else if (error.message.includes('Email not confirmed')) {
          message = 'Por favor, confirme seu e-mail antes de fazer login.';
        }
        
        toast({
          variant: 'destructive',
          title: 'Erro no login',
          description: message,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Ocorreu um erro ao fazer login.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (orgLoading || checkingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (orgError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center max-w-md p-8">
          <AlertCircle className="w-16 h-16 text-destructive" />
          <h1 className="text-2xl font-bold text-foreground">{orgError}</h1>
          <p className="text-muted-foreground">
            Verifique se o endereço está correto ou entre em contato com o administrador.
          </p>
          <Link to="/login">
            <Button variant="outline">Ir para a página principal</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Access denied - user is logged in but doesn't belong to this org
  if (accessDenied) {
    const handleLogoutAndStay = async () => {
      await supabase.auth.signOut();
      setAccessDenied(false);
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center max-w-md p-8">
          <AlertCircle className="w-16 h-16 text-amber-500" />
          <h1 className="text-2xl font-bold text-foreground">Acesso Restrito</h1>
          <p className="text-muted-foreground">
            Você está logado com uma conta que não pertence a esta organização ({organization?.name}).
          </p>
          <p className="text-muted-foreground text-sm">
            Para acessar esta organização, faça logout e entre com uma conta autorizada.
          </p>
          <div className="flex gap-4 mt-4">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Voltar ao meu Dashboard
            </Button>
            <Button onClick={handleLogoutAndStay}>
              Fazer Logout
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render logo component (dynamic or default)
  const LogoComponent = () => (
    <Link to={`${basePath}/login`} className="flex items-center gap-3 mb-8">
      {logoUrl ? (
        <img src={logoUrl} alt={orgName} className="h-10 object-contain" />
      ) : (
        <>
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
            style={{ 
              background: branding?.accent_color 
                ? `linear-gradient(135deg, hsl(${branding.accent_color}), hsl(${branding.accent_color} / 0.8))`
                : 'linear-gradient(135deg, hsl(var(--gold)), hsl(var(--gold-dark)))'
            }}
          >
            <span 
              className="font-serif text-lg font-bold"
              style={{ color: branding?.secondary_color ? `hsl(${branding.secondary_color})` : 'hsl(var(--secondary))' }}
            >
              {displayPlatformName.charAt(0)}
            </span>
          </div>
          <div>
            <h1 className="font-serif text-lg font-semibold text-foreground">{displayPlatformName}</h1>
            {displayPlatformSuffix && (
              <p className="text-xs text-muted-foreground -mt-1">{displayPlatformSuffix}</p>
            )}
          </div>
        </>
      )}
    </Link>
  );

  // Show MFA verification screen
  if (showMFA) {
    return (
      <div className="min-h-screen flex">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <LogoComponent />
            <MFAVerification 
              onVerified={handleMFAVerified}
              onCancel={handleMFACancel}
            />
          </div>
        </div>

        <div 
          ref={parallaxRef}
          className="hidden lg:flex flex-1 relative items-center justify-center p-12 overflow-hidden"
        >
          <div 
            className="absolute inset-[-20px] transition-transform duration-300 ease-out"
            style={{
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transform: `translate(${parallaxOffset.x}px, ${parallaxOffset.y}px) scale(1.05)`,
            }}
          />
          <div 
            className="absolute inset-0"
            style={{
              background: branding?.primary_color 
                ? `linear-gradient(135deg, hsl(${branding.primary_color} / 0.7), hsl(${branding.secondary_color || branding.primary_color} / 0.5))`
                : 'linear-gradient(135deg, rgba(0,0,0,0.6), rgba(0,0,0,0.4))'
            }}
          />
          <div 
            className="relative max-w-lg text-center text-white z-10 transition-transform duration-300 ease-out"
            style={{
              transform: `translate(${-parallaxOffset.x * 0.5}px, ${-parallaxOffset.y * 0.5}px)`,
            }}
          >
            <h2 className="font-serif text-4xl font-bold mb-6 drop-shadow-lg">
              "A segurança é a fortaleza do sábio."
            </h2>
            <p className="text-white/70 text-lg drop-shadow-md">
              — Provérbio Yorubá
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <LogoComponent />

          <h2 className="font-serif text-3xl font-bold text-foreground mb-2">
            Bem-vindo
          </h2>
          <p className="text-muted-foreground mb-8">
            Entre na sua conta para continuar sua jornada de aprendizado.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                  required
                  data-allow-context-menu
                  data-allow-copy
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link to={`${basePath}/forgot-password`} className="text-sm text-primary hover:underline">
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`pl-10 pr-10 ${errors.password ? 'border-destructive' : ''}`}
                  required
                  data-allow-context-menu
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full font-semibold shadow-lg"
              style={{
                background: branding?.accent_color 
                  ? `linear-gradient(135deg, hsl(${branding.accent_color}), hsl(${branding.accent_color} / 0.8))`
                  : 'linear-gradient(135deg, hsl(var(--gold)), hsl(var(--gold-dark)))',
                color: branding?.secondary_color ? `hsl(${branding.secondary_color})` : 'hsl(var(--secondary))'
              }}
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="text-center text-muted-foreground mt-8 text-sm">
            O acesso a esta plataforma é exclusivo por convite.
            <br />
            Entre em contato com o administrador para obter acesso.
          </p>
        </div>
      </div>

      {/* Right Side - Decorative with Parallax */}
      <div 
        ref={parallaxRef}
        className="hidden lg:flex flex-1 relative items-center justify-center p-12 overflow-hidden"
      >
        <div 
          className="absolute inset-[-20px] transition-transform duration-300 ease-out"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transform: `translate(${parallaxOffset.x}px, ${parallaxOffset.y}px) scale(1.05)`,
          }}
        />
        <div 
          className="absolute inset-0"
          style={{
            background: branding?.primary_color 
              ? `linear-gradient(135deg, hsl(${branding.primary_color} / 0.7), hsl(${branding.secondary_color || branding.primary_color} / 0.5))`
              : 'linear-gradient(135deg, rgba(0,0,0,0.6), rgba(0,0,0,0.4))'
          }}
        />
        <div 
          className="relative max-w-lg text-center text-white z-10 transition-transform duration-300 ease-out"
          style={{
            transform: `translate(${-parallaxOffset.x * 0.5}px, ${-parallaxOffset.y * 0.5}px)`,
          }}
        >
          <h2 className="font-serif text-4xl font-bold mb-6 drop-shadow-lg">
            "O conhecimento é a chave que abre todas as portas."
          </h2>
          <p className="text-white/70 text-lg drop-shadow-md">
            — Provérbio Yorubá
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrgLogin;
