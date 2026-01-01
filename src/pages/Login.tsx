import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        toast({
          title: 'Bem-vindo de volta!',
          description: 'Login realizado com sucesso.',
        });
        navigate('/dashboard');
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro no login',
          description: 'E-mail ou senha incorretos.',
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

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
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
                  className="pl-10"
                  required
                  data-allow-context-menu
                  data-allow-copy
                />
              </div>
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
                  className="pl-10 pr-10"
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
            </div>

            <Button 
              type="submit" 
              className="w-full gradient-gold text-secondary font-semibold shadow-gold"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="text-center text-muted-foreground mt-8">
            Não tem uma conta?{' '}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Criar conta
            </Link>
          </p>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 bg-muted/50 rounded-lg border border-border">
            <p className="text-sm font-medium text-foreground mb-2">Credenciais de Demonstração:</p>
            <p className="text-xs text-muted-foreground">
              <strong>Estudante:</strong> joao@exemplo.com
            </p>
            <p className="text-xs text-muted-foreground">
              <strong>Admin:</strong> ifatokun@offeorunmila.com
            </p>
            <p className="text-xs text-muted-foreground mt-1">(qualquer senha)</p>
          </div>
        </div>
      </div>

      {/* Right Side - Decorative */}
      <div className="hidden lg:flex flex-1 gradient-hero pattern-adinkra items-center justify-center p-12">
        <div className="max-w-lg text-center text-white">
          <h2 className="font-serif text-4xl font-bold mb-6">
            "O conhecimento é a chave que abre todas as portas."
          </h2>
          <p className="text-white/70 text-lg">
            — Provérbio Yorubá
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
