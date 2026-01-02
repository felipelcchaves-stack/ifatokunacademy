import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, AlertTriangle } from 'lucide-react';

interface MFAVerificationProps {
  onVerified: () => void;
  onCancel?: () => void;
}

const MFAVerification: React.FC<MFAVerificationProps> = ({ onVerified, onCancel }) => {
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);

  useEffect(() => {
    fetchFactor();
  }, []);

  const fetchFactor = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      
      const totpFactors = data.totp || [];
      if (totpFactors.length > 0) {
        setFactorId(totpFactors[0].id);
      }
    } catch (error) {
      console.error('Error fetching MFA factors:', error);
      setError('Erro ao carregar fatores de autenticação');
    }
  };

  const handleVerify = async () => {
    if (!factorId || code.length !== 6) return;

    setVerifying(true);
    setError(null);

    try {
      // Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
      });

      if (challengeError) throw challengeError;

      // Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code
      });

      if (verifyError) throw verifyError;

      onVerified();
    } catch (error: any) {
      console.error('Error verifying MFA:', error);
      if (error.message?.includes('Invalid') || error.message?.includes('invalid')) {
        setError('Código inválido. Verifique e tente novamente.');
      } else {
        setError('Erro ao verificar código. Tente novamente.');
      }
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

  // Auto-submit when 6 digits are entered
  useEffect(() => {
    if (code.length === 6 && factorId && !verifying) {
      handleVerify();
    }
  }, [code]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle>Verificação de Dois Fatores</CardTitle>
        <CardDescription>
          Digite o código de 6 dígitos do Google Authenticator
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center">
          <InputOTP
            value={code}
            onChange={setCode}
            maxLength={6}
            disabled={verifying}
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

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-2">
          <Button
            onClick={handleVerify}
            disabled={code.length !== 6 || verifying || !factorId}
            className="w-full"
          >
            {verifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              'Verificar'
            )}
          </Button>
          
          {onCancel && (
            <Button
              variant="ghost"
              onClick={onCancel}
              disabled={verifying}
              className="w-full"
            >
              Usar outra conta
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Abra o Google Authenticator no seu celular para obter o código.
          O código muda a cada 30 segundos.
        </p>
      </CardContent>
    </Card>
  );
};

export default MFAVerification;
