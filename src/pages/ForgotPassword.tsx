import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { z } from 'zod';

const emailSchema = z.object({
  email: z.string().email('E-mail inválido'),
});

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();
  const { platformName } = usePlatformSettings();
  
  const displayPlatformName = platformName?.split(' ').slice(0, 2).join(' ') || 'Offe Orunmila';
  const displayPlatformSuffix = platformName?.split(' ').slice(2).join(' ') || 'Learning';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate email
    const result = emailSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: resetError.message,
        });
      } else {
        setSent(true);
        toast({
          title: 'E-mail enviado!',
          description: 'Verifique sua caixa de entrada para redefinir sua senha.',
        });
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Ocorreu um erro ao enviar o e-mail.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-muted/30">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          
          <h2 className="font-serif text-3xl font-bold text-foreground mb-4">
            E-mail enviado!
          </h2>
          <p className="text-muted-foreground mb-8">
            Enviamos um link de redefinição de senha para <strong>{email}</strong>. 
            Verifique sua caixa de entrada e spam.
          </p>

          <div className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                setSent(false);
                setEmail('');
              }}
            >
              Enviar para outro e-mail
            </Button>
            
            <Link to="/login">
              <Button className="w-full gradient-gold text-secondary shadow-gold">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao login
              </Button>
            </Link>
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
          <Link to="/" className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center shadow-gold">
              <span className="font-serif text-lg font-bold text-secondary">{displayPlatformName.charAt(0)}</span>
            </div>
            <div>
              <h1 className="font-serif text-lg font-semibold text-foreground">{displayPlatformName}</h1>
              <p className="text-xs text-muted-foreground -mt-1">{displayPlatformSuffix}</p>
            </div>
          </Link>

          <Link 
            to="/login" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao login
          </Link>

          <h2 className="font-serif text-3xl font-bold text-foreground mb-2">
            Esqueceu sua senha?
          </h2>
          <p className="text-muted-foreground mb-8">
            Não se preocupe! Digite seu e-mail e enviaremos um link para redefinir sua senha.
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
                  className={`pl-10 ${error ? 'border-destructive' : ''}`}
                  required
                  data-allow-context-menu
                  data-allow-copy
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full gradient-gold text-secondary font-semibold shadow-gold"
              disabled={loading}
            >
              {loading ? 'Enviando...' : 'Enviar link de redefinição'}
            </Button>
          </form>

          <p className="text-center text-muted-foreground mt-8">
            Lembrou sua senha?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Fazer login
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Decorative */}
      <div className="hidden lg:flex flex-1 gradient-hero pattern-adinkra items-center justify-center p-12">
        <div className="max-w-lg text-center text-white">
          <h2 className="font-serif text-4xl font-bold mb-6">
            "Quem esquece o caminho, pergunta ao mais velho."
          </h2>
          <p className="text-white/70 text-lg">
            — Provérbio Yorubá
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;