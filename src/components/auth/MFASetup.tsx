import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, ShieldCheck, ShieldOff, Copy, Check, QrCode } from 'lucide-react';
import { toast } from 'sonner';

interface MFASetupProps {
  onSetupComplete: () => void;
  mfaEnabled: boolean;
}

const MFASetup: React.FC<MFASetupProps> = ({ onSetupComplete, mfaEnabled }) => {
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [disabling, setDisabling] = useState(false);
  
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [copied, setCopied] = useState(false);
  
  const [existingFactors, setExistingFactors] = useState<any[]>([]);

  useEffect(() => {
    fetchExistingFactors();
  }, []);

  const fetchExistingFactors = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setExistingFactors(data.totp || []);
    } catch (error) {
      console.error('Error fetching MFA factors:', error);
    }
  };

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'Offe Orunmila Learning',
        friendlyName: 'Principal'
      });

      if (error) throw error;

      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    } catch (error: any) {
      console.error('Error enrolling MFA:', error);
      toast.error('Erro ao iniciar configuração do 2FA');
    } finally {
      setEnrolling(false);
    }
  };

  const handleVerify = async () => {
    if (!factorId || verificationCode.length !== 6) return;

    setVerifying(true);
    try {
      // First, create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
      });

      if (challengeError) throw challengeError;

      // Then verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verificationCode
      });

      if (verifyError) throw verifyError;

      // Update profile to mark MFA as enabled
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ mfa_enabled: true })
          .eq('id', user.id);
      }

      toast.success('Autenticação de dois fatores ativada com sucesso!');
      onSetupComplete();
      
      // Reset state
      setQrCode(null);
      setSecret(null);
      setFactorId(null);
      setVerificationCode('');
      fetchExistingFactors();
    } catch (error: any) {
      console.error('Error verifying MFA:', error);
      if (error.message?.includes('Invalid')) {
        toast.error('Código inválido. Verifique e tente novamente.');
      } else {
        toast.error('Erro ao verificar código');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable = async () => {
    if (existingFactors.length === 0) return;

    setDisabling(true);
    try {
      for (const factor of existingFactors) {
        const { error } = await supabase.auth.mfa.unenroll({
          factorId: factor.id
        });
        if (error) throw error;
      }

      // Update profile to mark MFA as disabled
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ mfa_enabled: false })
          .eq('id', user.id);
      }

      toast.success('Autenticação de dois fatores desativada');
      onSetupComplete();
      setExistingFactors([]);
    } catch (error: any) {
      console.error('Error disabling MFA:', error);
      toast.error('Erro ao desativar 2FA');
    } finally {
      setDisabling(false);
    }
  };

  const copySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Chave copiada para a área de transferência');
    }
  };

  const formatSecret = (secret: string) => {
    return secret.match(/.{1,4}/g)?.join('-') || secret;
  };

  // If MFA is already set up
  if (existingFactors.length > 0 || mfaEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-500" />
            Autenticação de Dois Fatores
          </CardTitle>
          <CardDescription>
            Sua conta está protegida com autenticação de dois fatores
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-green-500/50 bg-green-500/10">
            <ShieldCheck className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              O 2FA está ativo. Você precisará do código do Google Authenticator para fazer login.
            </AlertDescription>
          </Alert>

          <Button 
            variant="destructive" 
            onClick={handleDisable}
            disabled={disabling}
          >
            {disabling ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Desativando...
              </>
            ) : (
              <>
                <ShieldOff className="h-4 w-4 mr-2" />
                Desativar 2FA
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Setup flow
  if (qrCode && secret) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Configurar Google Authenticator
          </CardTitle>
          <CardDescription>
            Escaneie o QR Code abaixo com o Google Authenticator
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            {/* QR Code */}
            <div className="p-4 bg-white rounded-lg">
              <img 
                src={qrCode} 
                alt="QR Code para configuração 2FA" 
                className="w-48 h-48"
              />
            </div>

            {/* Manual entry secret */}
            <div className="w-full">
              <p className="text-sm text-muted-foreground text-center mb-2">
                Ou digite a chave manualmente:
              </p>
              <div className="flex items-center justify-center gap-2">
                <code className="px-3 py-2 bg-muted rounded-md font-mono text-sm">
                  {formatSecret(secret)}
                </code>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={copySecret}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Verification input */}
          <div className="space-y-4">
            <p className="text-sm text-center">
              Digite o código de 6 dígitos do Authenticator para confirmar:
            </p>
            <div className="flex justify-center">
              <InputOTP
                value={verificationCode}
                onChange={setVerificationCode}
                maxLength={6}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setQrCode(null);
                  setSecret(null);
                  setFactorId(null);
                  setVerificationCode('');
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleVerify}
                disabled={verificationCode.length !== 6 || verifying}
              >
                {verifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Verificar e Ativar
                  </>
                )}
              </Button>
            </div>
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Guarde a chave secreta em um local seguro. 
              Você precisará dela se perder acesso ao seu dispositivo.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Initial state - show enable button
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Autenticação de Dois Fatores
        </CardTitle>
        <CardDescription>
          Adicione uma camada extra de segurança à sua conta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Com o 2FA ativo, você precisará digitar um código do Google Authenticator 
          além da sua senha para fazer login. Isso protege sua conta mesmo se 
          alguém descobrir sua senha.
        </p>

        <Button onClick={handleEnroll} disabled={enrolling}>
          {enrolling ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Gerando QR Code...
            </>
          ) : (
            <>
              <Shield className="h-4 w-4 mr-2" />
              Ativar 2FA
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default MFASetup;
