import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, LogOut, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const AuthDebug: React.FC = () => {
  const { user, session, isAuthenticated, isAdmin, loading, signOut } = useAuth();
  const [sessionData, setSessionData] = useState<any>(null);
  const [mfaData, setMfaData] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [localStorageKeys, setLocalStorageKeys] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const refreshAll = async () => {
    setRefreshing(true);
    setErrors([]);
    const newErrors: string[] = [];

    try {
      console.log('[AuthDebug] Refreshing session...');
      const { data: sess, error: sessError } = await supabase.auth.getSession();
      if (sessError) {
        newErrors.push(`getSession: ${sessError.message}`);
      }
      setSessionData(sess);
      console.log('[AuthDebug] Session result:', { hasSession: !!sess?.session, userId: sess?.session?.user?.id });
    } catch (e: any) {
      newErrors.push(`getSession exception: ${e.message}`);
    }

    try {
      console.log('[AuthDebug] Checking MFA...');
      const { data: mfa, error: mfaError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (mfaError) {
        newErrors.push(`MFA: ${mfaError.message}`);
      }
      setMfaData(mfa);
      console.log('[AuthDebug] MFA result:', mfa);
    } catch (e: any) {
      newErrors.push(`MFA exception: ${e.message}`);
    }

    if (user?.id) {
      try {
        console.log('[AuthDebug] Fetching profile...');
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('id', user.id)
          .single();
        if (profileError) {
          newErrors.push(`Profile: ${profileError.message}`);
        }
        setProfileData(profile);
        console.log('[AuthDebug] Profile result:', profile);
      } catch (e: any) {
        newErrors.push(`Profile exception: ${e.message}`);
      }
    }

    // Check localStorage keys (auth related)
    const authKeys = Object.keys(localStorage).filter(
      key => key.includes('supabase') || key.includes('auth') || key.includes('sb-')
    );
    setLocalStorageKeys(authKeys);
    console.log('[AuthDebug] LocalStorage auth keys:', authKeys);

    setErrors(newErrors);
    setRefreshing(false);
  };

  useEffect(() => {
    refreshAll();
  }, [user?.id]);

  const handleSignOut = async () => {
    console.log('[AuthDebug] Signing out...');
    await signOut();
    window.location.href = '/login';
  };

  const StatusIcon = ({ ok }: { ok: boolean | null }) => {
    if (ok === null) return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    return ok ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">🔍 Auth Debug</h1>
          <div className="flex gap-2">
            <Button onClick={refreshAll} disabled={refreshing} variant="outline" size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={handleSignOut} variant="destructive" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {errors.length > 0 && (
          <Card className="border-red-500">
            <CardHeader>
              <CardTitle className="text-red-500">⚠️ Erros Detectados</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((err, i) => (
                  <li key={i} className="text-red-400 text-sm">{err}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>📊 Estado do AuthContext</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <StatusIcon ok={!loading} />
                <span className="text-sm">Loading: {loading ? 'true' : 'false'}</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon ok={isAuthenticated} />
                <span className="text-sm">Authenticated: {isAuthenticated ? 'true' : 'false'}</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon ok={isAdmin === true ? true : isAdmin === false ? null : null} />
                <span className="text-sm">Admin: {isAdmin ? 'true' : 'false'}</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon ok={!!user} />
                <span className="text-sm">User: {user ? 'exists' : 'null'}</span>
              </div>
            </div>
            {user && (
              <div className="mt-4 p-3 bg-muted rounded-md">
                <p className="text-sm"><strong>User ID:</strong> {user.id}</p>
                <p className="text-sm"><strong>Email:</strong> {user.email}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🔐 Sessão (getSession)</CardTitle>
          </CardHeader>
          <CardContent>
            {sessionData?.session ? (
              <div className="space-y-2">
                <Badge variant="default">Sessão Ativa</Badge>
                <div className="p-3 bg-muted rounded-md text-sm space-y-1">
                  <p><strong>User ID:</strong> {sessionData.session.user?.id}</p>
                  <p><strong>Email:</strong> {sessionData.session.user?.email}</p>
                  <p><strong>Expires At:</strong> {new Date(sessionData.session.expires_at * 1000).toLocaleString()}</p>
                  <p><strong>Token (masked):</strong> {sessionData.session.access_token?.slice(0, 20)}...</p>
                </div>
              </div>
            ) : (
              <Badge variant="destructive">Sem Sessão</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🛡️ MFA Status</CardTitle>
          </CardHeader>
          <CardContent>
            {mfaData ? (
              <div className="p-3 bg-muted rounded-md text-sm space-y-1">
                <p><strong>Current Level:</strong> {mfaData.currentLevel}</p>
                <p><strong>Next Level:</strong> {mfaData.nextLevel}</p>
                <p><strong>Needs MFA Verification:</strong> {mfaData.currentLevel === 'aal1' && mfaData.nextLevel === 'aal2' ? 'SIM' : 'NÃO'}</p>
              </div>
            ) : (
              <Badge variant="secondary">Não disponível</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>👤 Profile (RLS Test)</CardTitle>
          </CardHeader>
          <CardContent>
            {profileData ? (
              <div className="p-3 bg-muted rounded-md text-sm space-y-1">
                <p><strong>ID:</strong> {profileData.id}</p>
                <p><strong>Email:</strong> {profileData.email}</p>
                <p><strong>Name:</strong> {profileData.full_name || '(não definido)'}</p>
                <Badge variant="default" className="mt-2">RLS OK - Pode ler perfil</Badge>
              </div>
            ) : user?.id ? (
              <Badge variant="destructive">Falha ao ler perfil (RLS?)</Badge>
            ) : (
              <Badge variant="secondary">Usuário não logado</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>💾 LocalStorage (Auth Keys)</CardTitle>
          </CardHeader>
          <CardContent>
            {localStorageKeys.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {localStorageKeys.map(key => (
                  <Badge key={key} variant="outline" className="text-xs">{key}</Badge>
                ))}
              </div>
            ) : (
              <Badge variant="destructive">Nenhuma chave de auth encontrada</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🌐 Ambiente</CardTitle>
          </CardHeader>
          <CardContent className="p-3 bg-muted rounded-md text-sm space-y-1">
            <p><strong>URL:</strong> {window.location.href}</p>
            <p><strong>Origin:</strong> {window.location.origin}</p>
            <p><strong>User Agent:</strong> {navigator.userAgent.slice(0, 80)}...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthDebug;
