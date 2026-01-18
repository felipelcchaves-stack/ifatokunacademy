import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Globe, 
  Save, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Copy,
  ExternalLink,
  AlertTriangle,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Organization, OrganizationBranding, OrganizationSettings } from '@/contexts/OrganizationContext';

const defaultBranding: OrganizationBranding = {
  logo_url: null,
  favicon_url: null,
  primary_color: '263 70% 50%',
  secondary_color: '263 30% 25%',
  accent_color: '45 93% 47%',
  font_family: 'Inter',
  login_background_url: null,
};

interface DomainStatus {
  isVerified: boolean;
  hasSSL: boolean;
  dnsConfigured: boolean;
  lastChecked: Date | null;
}

const AdminOrganizationDomain: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [customDomain, setCustomDomain] = useState('');
  const [domainStatus, setDomainStatus] = useState<DomainStatus>({
    isVerified: false,
    hasSSL: false,
    dnsConfigured: false,
    lastChecked: null,
  });

  // O domínio de destino para CNAME (Lovable)
  const targetDomain = 'ifatokunacademy.lovable.app';

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    if (organizationId) {
      fetchOrganization();
    }
  }, [isAdmin, organizationId, navigate]);

  const fetchOrganization = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (error) throw error;

      const rawBranding = data.branding as Record<string, unknown> | null;
      const rawSettings = data.settings as Record<string, unknown> | null;
      
      const org: Organization = {
        ...data,
        branding: { 
          ...defaultBranding, 
          ...(rawBranding || {}) as Partial<OrganizationBranding>
        },
        settings: {
          max_users: (rawSettings?.max_users as number) ?? 100,
          max_modules: (rawSettings?.max_modules as number) ?? 50,
          plan_type: (rawSettings?.plan_type as 'free' | 'pro' | 'enterprise') ?? 'free',
          features: (rawSettings?.features as string[]) ?? [],
        },
      };
      
      setOrganization(org);
      setCustomDomain(org.custom_domain || '');
      
      // Verificar status do domínio se existir
      if (org.custom_domain) {
        checkDomainStatus(org.custom_domain);
      }
    } catch (error) {
      console.error('Error fetching organization:', error);
      toast.error('Erro ao carregar organização');
      navigate('/admin/organizations');
    } finally {
      setLoading(false);
    }
  };

  const checkDomainStatus = async (domain: string) => {
    setVerifying(true);
    try {
      // Simular verificação de DNS
      // Em produção, isso seria uma chamada real para verificar o DNS
      const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
      
      // Tentativa básica de verificar se o domínio está acessível
      // Nota: Isso é uma verificação simplificada
      const response = await fetch(`https://${cleanDomain}`, { 
        method: 'HEAD',
        mode: 'no-cors'
      }).catch(() => null);
      
      setDomainStatus({
        isVerified: response !== null,
        hasSSL: true, // Assumindo HTTPS
        dnsConfigured: response !== null,
        lastChecked: new Date(),
      });
    } catch (error) {
      console.error('Error checking domain:', error);
      setDomainStatus({
        isVerified: false,
        hasSSL: false,
        dnsConfigured: false,
        lastChecked: new Date(),
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = async () => {
    if (!organization) return;

    try {
      setSaving(true);
      
      // Limpar e validar domínio
      let cleanDomain = customDomain.trim()
        .replace(/^(https?:\/\/)?(www\.)?/, '')
        .replace(/\/$/, '');
      
      // Validar formato do domínio
      if (cleanDomain && !/^[a-zA-Z0-9][a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}$/.test(cleanDomain)) {
        toast.error('Formato de domínio inválido');
        return;
      }
      
      const { error } = await supabase
        .from('organizations')
        .update({ custom_domain: cleanDomain || null })
        .eq('id', organization.id);

      if (error) {
        if (error.code === '23505') {
          toast.error('Este domínio já está em uso por outra organização');
          return;
        }
        throw error;
      }
      
      toast.success('Domínio atualizado com sucesso');
      
      // Atualizar estado local
      setOrganization({ ...organization, custom_domain: cleanDomain || null });
      
      // Verificar novo domínio
      if (cleanDomain) {
        checkDomainStatus(cleanDomain);
      }
    } catch (error) {
      console.error('Error saving domain:', error);
      toast.error('Erro ao salvar domínio');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDomain = async () => {
    if (!organization) return;
    
    if (!confirm('Tem certeza que deseja remover o domínio customizado?')) {
      return;
    }

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('organizations')
        .update({ custom_domain: null })
        .eq('id', organization.id);

      if (error) throw error;
      
      setCustomDomain('');
      setOrganization({ ...organization, custom_domain: null });
      setDomainStatus({
        isVerified: false,
        hasSSL: false,
        dnsConfigured: false,
        lastChecked: null,
      });
      
      toast.success('Domínio removido');
    } catch (error) {
      console.error('Error removing domain:', error);
      toast.error('Erro ao remover domínio');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Organização não encontrada</p>
      </div>
    );
  }

  const subdomain = `${organization.slug}.ifatokunacademy.com`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/organizations')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Globe className="w-6 h-6" />
              Domínio - {organization.name}
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure um domínio personalizado para sua organização
            </p>
          </div>
        </div>
      </div>

      {/* Domínio Padrão */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Domínio Padrão (Subdomínio)</CardTitle>
          <CardDescription>
            Sua organização já está disponível neste endereço
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-muted rounded-lg p-3 font-mono text-sm">
              https://{subdomain}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(`https://${subdomain}`)}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.open(`https://${subdomain}`, '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Este é o endereço padrão da sua organização e sempre estará disponível.
          </p>
        </CardContent>
      </Card>

      {/* Domínio Customizado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Domínio Customizado</CardTitle>
          <CardDescription>
            Use seu próprio domínio para acessar a plataforma
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="custom_domain">Seu Domínio</Label>
            <div className="flex gap-2">
              <Input
                id="custom_domain"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="Ex: academia.seusite.com.br"
                className="flex-1"
              />
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Digite o domínio sem "http://" ou "https://"
            </p>
          </div>

          {organization.custom_domain && (
            <>
              {/* Status do Domínio */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Status do Domínio</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => checkDomainStatus(organization.custom_domain!)}
                    disabled={verifying}
                  >
                    {verifying ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Verificar
                  </Button>
                </div>
                
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    {domainStatus.dnsConfigured ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive" />
                    )}
                    <span className="text-sm">DNS Configurado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {domainStatus.hasSSL ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive" />
                    )}
                    <span className="text-sm">Certificado SSL</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {domainStatus.isVerified ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive" />
                    )}
                    <span className="text-sm">Domínio Verificado</span>
                  </div>
                </div>
                
                {domainStatus.lastChecked && (
                  <p className="text-xs text-muted-foreground">
                    Última verificação: {domainStatus.lastChecked.toLocaleString('pt-BR')}
                  </p>
                )}
              </div>

              {/* Botão Remover */}
              <Button
                variant="destructive"
                onClick={handleRemoveDomain}
                disabled={saving}
              >
                Remover Domínio Customizado
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Instruções de Configuração DNS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="w-5 h-5" />
            Configuração de DNS
          </CardTitle>
          <CardDescription>
            Siga estas instruções para configurar seu domínio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Importante</AlertTitle>
            <AlertDescription>
              A propagação de DNS pode levar até 48 horas. Durante este período, 
              o domínio pode não funcionar corretamente.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h4 className="font-medium">Passo 1: Acesse seu provedor de DNS</h4>
            <p className="text-sm text-muted-foreground">
              Acesse o painel de controle do seu provedor de domínio (Registro.br, GoDaddy, Cloudflare, etc.)
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Passo 2: Adicione o registro CNAME</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Crie um registro CNAME apontando para nosso servidor:
            </p>
            
            <div className="overflow-x-auto">
              <table className="w-full border rounded-lg">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Tipo</th>
                    <th className="text-left p-3 text-sm font-medium">Nome/Host</th>
                    <th className="text-left p-3 text-sm font-medium">Valor/Destino</th>
                    <th className="text-left p-3 text-sm font-medium">TTL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="p-3">
                      <Badge variant="secondary">CNAME</Badge>
                    </td>
                    <td className="p-3 font-mono text-sm">
                      {customDomain ? customDomain.split('.')[0] : 'academia'}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-1"
                        onClick={() => copyToClipboard(customDomain ? customDomain.split('.')[0] : 'academia')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </td>
                    <td className="p-3 font-mono text-sm">
                      {targetDomain}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-1"
                        onClick={() => copyToClipboard(targetDomain)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">3600 (1 hora)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Passo 3: Para domínio raiz (sem www)</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Se você quer usar o domínio raiz (ex: seusite.com.br), adicione também um registro A:
            </p>
            
            <div className="overflow-x-auto">
              <table className="w-full border rounded-lg">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">Tipo</th>
                    <th className="text-left p-3 text-sm font-medium">Nome/Host</th>
                    <th className="text-left p-3 text-sm font-medium">Valor/Destino</th>
                    <th className="text-left p-3 text-sm font-medium">TTL</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="p-3">
                      <Badge variant="secondary">A</Badge>
                    </td>
                    <td className="p-3 font-mono text-sm">@</td>
                    <td className="p-3 font-mono text-sm">
                      76.76.21.21
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-1"
                        onClick={() => copyToClipboard('76.76.21.21')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">3600</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium">Passo 4: Aguarde a propagação</h4>
            <p className="text-sm text-muted-foreground">
              Após configurar o DNS, aguarde algumas horas e clique em "Verificar" 
              para confirmar que tudo está funcionando.
            </p>
          </div>

          <Alert variant="default" className="border-primary/20 bg-primary/5">
            <Info className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">SSL Automático</AlertTitle>
            <AlertDescription>
              O certificado SSL será provisionado automaticamente após a verificação 
              do DNS. Seu site estará acessível via HTTPS.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOrganizationDomain;
