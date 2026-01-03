import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import loginBg from '@/assets/login-bg.jpg';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import MFAVerification from '@/components/auth/MFAVerification';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const Login: React.FC = () => {
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
  
  const { signIn, isAuthenticated } = useAuth();
  const { platformName } = usePlatformSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const displayPlatformName = platformName?.split(' ').slice(0, 2).join(' ') || 'Offe Orunmila';
  const displayPlatformSuffix = platformName?.split(' ').slice(2).join(' ') || 'Learning';

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  // Effect to handle post-login navigation
  useEffect(() => {
    // Only check MFA if:
    // 1. User is authenticated
    // 2. Not already showing MFA screen
    // 3. Login was initiated from this page (loginInProgress)
    // 4. Haven't already checked MFA in this session
    if (isAuthenticated && !showMFA && loginInProgress.current && !hasCheckedMFA.current) {
      hasCheckedMFA.current = true;
      checkMFAStatus();
    }
  }, [isAuthenticated, showMFA]);

  // Parallax effect on mouse movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!parallaxRef.current) return;
      
      const rect = parallaxRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Calculate offset from center (max 15px movement)
      const offsetX = ((e.clientX - centerX) / rect.width) * 15;
      const offsetY = ((e.clientY - centerY) / rect.height) * 15;
      
      setParallaxOffset({ x: offsetX, y: offsetY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Determine safe navigation target (avoid /admin if not checked yet)
  const safeFrom = from.startsWith('/admin') ? '/dashboard' : from;
  
  const checkMFAStatus = async () => {
    console.log('[Login] checkMFAStatus called, target:', safeFrom);
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      console.log('[Login] MFA check result:', { data, error: error?.message });
      
      // If there's an error or no data, assume no MFA needed and proceed
      if (error || !data) {
        console.log('[Login] MFA check error or no data, proceeding to:', safeFrom);
        toast({
          title: 'Bem-vindo de volta!',
          description: 'Login realizado com sucesso.',
        });
        navigate(safeFrom, { replace: true });
        return;
      }
      
      // Only show MFA if user REALLY needs to verify
      if (data.currentLevel === 'aal1' && data.nextLevel === 'aal2') {
        console.log('[Login] MFA required, showing verification');
        setShowMFA(true);
      } else {
        // No MFA required, proceed to dashboard
        console.log('[Login] No MFA required, navigating to:', safeFrom);
        toast({
          title: 'Bem-vindo de volta!',
          description: 'Login realizado com sucesso.',
        });
        navigate(safeFrom, { replace: true });
      }
    } catch (error) {
      console.error('[Login] Error checking MFA status:', error);
      // Even on error, navigate to dashboard
      toast({
        title: 'Bem-vindo de volta!',
        description: 'Login realizado com sucesso.',
      });
      navigate(safeFrom, { replace: true });
    }
  };

  const handleMFAVerified = () => {
    console.log('[Login] MFA verified, navigating to:', safeFrom);
    setShowMFA(false);
    toast({
      title: 'Bem-vindo de volta!',
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

    // Validate input
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
      console.log('[Login] Attempting signIn...');
      const { error } = await signIn(email, password);
      
      if (error) {
        console.log('[Login] signIn error:', error.message);
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
      } else {
        console.log('[Login] signIn success, waiting for isAuthenticated change');
      }
      // Note: Success handling moved to useEffect/checkMFAStatus
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

  // Show MFA verification screen
  if (showMFA) {
    return (
      <div className="min-h-screen flex">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <Link to="/login" className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center shadow-gold">
                <span className="font-serif text-lg font-bold text-secondary">{displayPlatformName.charAt(0)}</span>
              </div>
              <div>
                <h1 className="font-serif text-lg font-semibold text-foreground">{displayPlatformName}</h1>
                <p className="text-xs text-muted-foreground -mt-1">{displayPlatformSuffix}</p>
              </div>
            </Link>

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
              backgroundImage: `url(${loginBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transform: `translate(${parallaxOffset.x}px, ${parallaxOffset.y}px) scale(1.05)`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60" />
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
            <Link to="/login" className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center shadow-gold">
                <span className="font-serif text-lg font-bold text-secondary">{displayPlatformName.charAt(0)}</span>
              </div>
              <div>
                <h1 className="font-serif text-lg font-semibold text-foreground">{displayPlatformName}</h1>
                <p className="text-xs text-muted-foreground -mt-1">{displayPlatformSuffix}</p>
              </div>
            </Link>

          <h2 className="font-serif text-3xl font-bold text-foreground mb-2">
            Bem-vindo de volta
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
                <Link to="/forgot-password" className="text-sm text-primary hover:underline">
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
              className="w-full gradient-gold text-secondary font-semibold shadow-gold"
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
            backgroundImage: `url(${loginBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transform: `translate(${parallaxOffset.x}px, ${parallaxOffset.y}px) scale(1.05)`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60" />
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

export default Login;
