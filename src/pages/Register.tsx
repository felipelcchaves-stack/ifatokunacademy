import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100, 'Nome muito longo'),
  email: z.string().email('E-mail inválido').max(255, 'E-mail muito longo'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  
  const { signUp, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    if (!acceptTerms) {
      toast({
        variant: 'destructive',
        title: 'Termos obrigatórios',
        description: 'Você precisa aceitar os termos de uso.',
      });
      return;
    }

    // Validate input
    const result = registerSchema.safeParse({ name, email, password });
    if (!result.success) {
      const fieldErrors: { name?: string; email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        if (err.path[0] === 'name') fieldErrors.name = err.message;
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(email, password, name);
      
      if (error) {
        let message = 'Ocorreu um erro ao criar sua conta.';
        
        if (error.message.includes('User already registered')) {
          message = 'Este e-mail já está cadastrado. Tente fazer login.';
        } else if (error.message.includes('Password')) {
          message = 'A senha não atende aos requisitos de segurança.';
        }
        
        toast({
          variant: 'destructive',
          title: 'Erro no cadastro',
          description: message,
        });
      } else {
        toast({
          title: 'Conta criada!',
          description: 'Sua conta foi criada com sucesso.',
        });
        navigate('/dashboard');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Ocorreu um erro ao criar sua conta.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Decorative */}
      <div className="hidden lg:flex flex-1 gradient-hero pattern-adinkra items-center justify-center p-12">
        <div className="max-w-lg text-center text-white">
          <h2 className="font-serif text-4xl font-bold mb-6">
            Inicie sua jornada de sabedoria ancestral
          </h2>
          <p className="text-white/70 text-lg">
            Junte-se a uma comunidade dedicada à preservação e transmissão do conhecimento tradicional Yorubá.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center shadow-gold">
              <span className="font-serif text-lg font-bold text-secondary">O</span>
            </div>
            <div>
              <h1 className="font-serif text-lg font-semibold text-foreground">Offe Orunmila</h1>
              <p className="text-xs text-muted-foreground -mt-1">Learning</p>
            </div>
          </Link>

          <h2 className="font-serif text-3xl font-bold text-foreground mb-2">
            Criar sua conta
          </h2>
          <p className="text-muted-foreground mb-8">
            Preencha os dados abaixo para começar sua jornada.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`pl-10 ${errors.name ? 'border-destructive' : ''}`}
                  required
                  data-allow-context-menu
                  data-allow-copy
                />
              </div>
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

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
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
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

            <div className="flex items-start gap-2">
              <Checkbox 
                id="terms" 
                checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
              />
              <Label htmlFor="terms" className="text-sm text-muted-foreground leading-tight">
                Eu concordo com os{' '}
                <Link to="/terms" className="text-primary hover:underline">
                  Termos de Uso
                </Link>{' '}
                e{' '}
                <Link to="/privacy" className="text-primary hover:underline">
                  Política de Privacidade
                </Link>
              </Label>
            </div>

            <Button 
              type="submit" 
              className="w-full gradient-gold text-secondary font-semibold shadow-gold"
              disabled={loading}
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
            </Button>
          </form>

          <p className="text-center text-muted-foreground mt-8">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
