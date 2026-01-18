import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Palette, Save, Loader2, Eye } from 'lucide-react';
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

const AdminOrganizationBranding: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branding, setBranding] = useState<OrganizationBranding>(defaultBranding);

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
      setBranding(org.branding);
    } catch (error) {
      console.error('Error fetching organization:', error);
      toast.error('Erro ao carregar organização');
      navigate('/admin/organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!organization) return;

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('organizations')
        .update({ branding: JSON.parse(JSON.stringify(branding)) })
        .eq('id', organization.id);

      if (error) throw error;
      toast.success('Branding atualizado com sucesso');
    } catch (error) {
      console.error('Error saving branding:', error);
      toast.error('Erro ao salvar branding');
    } finally {
      setSaving(false);
    }
  };

  const hslToHex = (hsl: string): string => {
    const match = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
    if (!match) return '#8b5cf6';
    
    const h = parseInt(match[1]) / 360;
    const s = parseInt(match[2]) / 100;
    const l = parseInt(match[3]) / 100;
    
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const hexToHsl = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '263 70% 50%';
    
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
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
              <Palette className="w-6 h-6" />
              Branding - {organization.name}
            </h1>
            <p className="text-muted-foreground mt-1">
              Personalize a aparência da organização
            </p>
          </div>
        </div>
        
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar Alterações
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configurações de Cores */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cores</CardTitle>
            <CardDescription>
              Defina as cores principais da interface
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Cor Primária</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={hslToHex(branding.primary_color)}
                  onChange={(e) => setBranding({ ...branding, primary_color: hexToHsl(e.target.value) })}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={branding.primary_color}
                  onChange={(e) => setBranding({ ...branding, primary_color: e.target.value })}
                  placeholder="263 70% 50%"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cor Secundária</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={hslToHex(branding.secondary_color)}
                  onChange={(e) => setBranding({ ...branding, secondary_color: hexToHsl(e.target.value) })}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={branding.secondary_color}
                  onChange={(e) => setBranding({ ...branding, secondary_color: e.target.value })}
                  placeholder="263 30% 25%"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cor de Destaque</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={hslToHex(branding.accent_color)}
                  onChange={(e) => setBranding({ ...branding, accent_color: hexToHsl(e.target.value) })}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={branding.accent_color}
                  onChange={(e) => setBranding({ ...branding, accent_color: e.target.value })}
                  placeholder="45 93% 47%"
                  className="flex-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Identidade */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Identidade Visual</CardTitle>
            <CardDescription>
              Logo, favicon e tipografia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>URL do Logo</Label>
              <Input
                value={branding.logo_url || ''}
                onChange={(e) => setBranding({ ...branding, logo_url: e.target.value || null })}
                placeholder="https://exemplo.com/logo.png"
              />
            </div>

            <div className="space-y-2">
              <Label>URL do Favicon</Label>
              <Input
                value={branding.favicon_url || ''}
                onChange={(e) => setBranding({ ...branding, favicon_url: e.target.value || null })}
                placeholder="https://exemplo.com/favicon.ico"
              />
            </div>

            <div className="space-y-2">
              <Label>Fonte Principal</Label>
              <Input
                value={branding.font_family}
                onChange={(e) => setBranding({ ...branding, font_family: e.target.value })}
                placeholder="Inter"
              />
            </div>

            <div className="space-y-2">
              <Label>Imagem de Fundo do Login</Label>
              <Input
                value={branding.login_background_url || ''}
                onChange={(e) => setBranding({ ...branding, login_background_url: e.target.value || null })}
                placeholder="https://exemplo.com/background.jpg"
              />
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Preview
            </CardTitle>
            <CardDescription>
              Visualização das cores aplicadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-6 rounded-lg border" style={{ 
              backgroundColor: `hsl(${branding.secondary_color})`,
            }}>
              <div className="flex items-center gap-4 mb-4">
                {branding.logo_url ? (
                  <img src={branding.logo_url} alt="Logo" className="h-10 object-contain" />
                ) : (
                  <div 
                    className="h-10 w-32 rounded flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: `hsl(${branding.primary_color})` }}
                  >
                    {organization.name}
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-4">
                <button
                  className="px-4 py-2 rounded-md text-white font-medium"
                  style={{ backgroundColor: `hsl(${branding.primary_color})` }}
                >
                  Botão Primário
                </button>
                <button
                  className="px-4 py-2 rounded-md text-white font-medium"
                  style={{ backgroundColor: `hsl(${branding.accent_color})` }}
                >
                  Botão Destaque
                </button>
                <div 
                  className="px-4 py-2 rounded-md"
                  style={{ 
                    backgroundColor: `hsl(${branding.primary_color} / 0.1)`,
                    color: `hsl(${branding.primary_color})`,
                  }}
                >
                  Badge Exemplo
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminOrganizationBranding;
