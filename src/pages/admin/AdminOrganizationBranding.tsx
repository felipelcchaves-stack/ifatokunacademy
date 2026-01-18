import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Palette, Save, Loader2, Eye, Upload, X, Image, Mail, Lock, Monitor, Smartphone, LayoutDashboard, Brain, Trophy, Mic, BarChart3, ChevronDown, Phone, MapPin } from 'lucide-react';
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

interface ImageUploadProps {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  organizationId: string;
  folder: string;
  aspectRatio?: 'square' | 'wide';
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  label,
  value,
  onChange,
  organizationId,
  folder,
  aspectRatio = 'square',
}) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    try {
      setUploading(true);

      // Gerar nome único
      const fileExt = file.name.split('.').pop();
      const fileName = `${organizationId}/${folder}/${Date.now()}.${fileExt}`;

      // Upload para o storage
      const { error: uploadError, data } = await supabase.storage
        .from('organization-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('organization-assets')
        .getPublicUrl(fileName);

      onChange(publicUrl);
      toast.success('Imagem enviada com sucesso');
    } catch (error) {
      console.error('Error uploading:', error);
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleRemove = async () => {
    if (!value) return;
    
    try {
      // Extrair caminho do arquivo da URL
      const urlParts = value.split('/organization-assets/');
      if (urlParts[1]) {
        await supabase.storage
          .from('organization-assets')
          .remove([urlParts[1]]);
      }
      
      onChange(null);
      toast.success('Imagem removida');
    } catch (error) {
      console.error('Error removing:', error);
      // Mesmo com erro, limpar a referência
      onChange(null);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-3">
        {value ? (
          <div className="relative inline-block">
            <img
              src={value}
              alt={label}
              className={`object-cover rounded-lg border ${
                aspectRatio === 'wide' ? 'w-full h-32' : 'w-24 h-24'
              }`}
            />
            <Button
              size="icon"
              variant="destructive"
              className="absolute -top-2 -right-2 w-6 h-6"
              onClick={handleRemove}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <div
            className={`border-2 border-dashed border-muted-foreground/25 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors ${
              aspectRatio === 'wide' ? 'w-full h-32' : 'w-24 h-24'
            }`}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Image className="w-6 h-6 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">Upload</span>
              </>
            )}
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            {value ? 'Trocar' : 'Enviar'}
          </Button>
          
          <Input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
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
          <CardContent className="space-y-6">
            <ImageUpload
              label="Logo"
              value={branding.logo_url}
              onChange={(url) => setBranding({ ...branding, logo_url: url })}
              organizationId={organizationId || ''}
              folder="logo"
              aspectRatio="square"
            />

            <ImageUpload
              label="Favicon"
              value={branding.favicon_url}
              onChange={(url) => setBranding({ ...branding, favicon_url: url })}
              organizationId={organizationId || ''}
              folder="favicon"
              aspectRatio="square"
            />

            <div className="space-y-2">
              <Label>Fonte Principal</Label>
              <Input
                value={branding.font_family}
                onChange={(e) => setBranding({ ...branding, font_family: e.target.value })}
                placeholder="Inter"
              />
            </div>

            <ImageUpload
              label="Imagem de Fundo do Login"
              value={branding.login_background_url}
              onChange={(url) => setBranding({ ...branding, login_background_url: url })}
              organizationId={organizationId || ''}
              folder="background"
              aspectRatio="wide"
            />
          </CardContent>
        </Card>

        {/* Preview Completo da Tela de Login */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Preview da Tela de Login
            </CardTitle>
            <CardDescription>
              Visualização em tempo real de como ficará a tela de login
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Login Preview Container */}
            <div 
              className="rounded-lg overflow-hidden border shadow-lg"
              style={{ aspectRatio: '16/9', maxHeight: '500px' }}
            >
              <div className="w-full h-full grid lg:grid-cols-2">
                {/* Left side - Form */}
                <div 
                  className="p-6 flex flex-col justify-center"
                  style={{ backgroundColor: `hsl(${branding.secondary_color} / 0.1)` }}
                >
                  <div className="max-w-xs mx-auto w-full space-y-4">
                    {/* Logo */}
                    <div className="flex justify-center mb-4">
                      {branding.logo_url ? (
                        <img 
                          src={branding.logo_url} 
                          alt="Logo" 
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div 
                          className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                          style={{ backgroundColor: `hsl(${branding.primary_color})` }}
                        >
                          {organization.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    
                    {/* Title */}
                    <div className="text-center mb-4">
                      <h2 
                        className="text-lg font-bold"
                        style={{ color: `hsl(${branding.primary_color})` }}
                      >
                        {organization.name.split(' ').slice(0, 2).join(' ')}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {organization.name.split(' ').slice(2).join(' ') || 'Learning'}
                      </p>
                    </div>
                    
                    {/* Form Fields Preview */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">E-mail</label>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-background">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">exemplo@email.com</span>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Senha</label>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-background">
                          <Lock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">••••••••</span>
                        </div>
                      </div>
                      
                      {/* Login Button */}
                      <button
                        className="w-full py-2 rounded-md text-white font-medium text-sm"
                        style={{ backgroundColor: `hsl(${branding.primary_color})` }}
                      >
                        Entrar
                      </button>
                      
                      {/* Forgot Password Link */}
                      <div className="text-center">
                        <span 
                          className="text-xs cursor-pointer"
                          style={{ color: `hsl(${branding.primary_color})` }}
                        >
                          Esqueceu sua senha?
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right side - Background/Image */}
                <div 
                  className="hidden lg:flex flex-col items-center justify-center p-6 relative overflow-hidden"
                  style={{ 
                    background: branding.login_background_url 
                      ? `url(${branding.login_background_url}) center/cover`
                      : `linear-gradient(135deg, hsl(${branding.primary_color}), hsl(${branding.accent_color}))`
                  }}
                >
                  {/* Overlay for better text visibility */}
                  <div 
                    className="absolute inset-0"
                    style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
                  />
                  
                  {/* Content */}
                  <div className="relative z-10 text-center text-white">
                    <h3 className="text-xl font-bold mb-2">
                      Bem-vindo ao {organization.name.split(' ').slice(0, 2).join(' ')}
                    </h3>
                    <p className="text-sm opacity-90">
                      Plataforma de estudos sagrados
                    </p>
                  </div>
                  
                  {/* Decorative elements */}
                  <div 
                    className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full opacity-20"
                    style={{ backgroundColor: `hsl(${branding.accent_color})` }}
                  />
                  <div 
                    className="absolute -top-10 -left-10 w-32 h-32 rounded-full opacity-20"
                    style={{ backgroundColor: `hsl(${branding.primary_color})` }}
                  />
                </div>
              </div>
            </div>
            
            {/* Preview Info */}
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Monitor className="w-3 h-3" />
                <span>Preview Desktop</span>
              </div>
              <span>•</span>
              <span>As cores são aplicadas em tempo real</span>
            </div>
          </CardContent>
        </Card>

        {/* Preview de Componentes */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Preview de Componentes</CardTitle>
            <CardDescription>
              Visualização de botões e badges com as cores definidas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-6 rounded-lg border bg-card">
              <div className="flex flex-wrap gap-4 items-center">
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
                <button
                  className="px-4 py-2 rounded-md border font-medium"
                  style={{ 
                    borderColor: `hsl(${branding.primary_color})`,
                    color: `hsl(${branding.primary_color})`,
                  }}
                >
                  Botão Outline
                </button>
                <div 
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{ 
                    backgroundColor: `hsl(${branding.primary_color} / 0.1)`,
                    color: `hsl(${branding.primary_color})`,
                  }}
                >
                  Badge Primário
                </div>
                <div 
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{ 
                    backgroundColor: `hsl(${branding.accent_color} / 0.1)`,
                    color: `hsl(${branding.accent_color})`,
                  }}
                >
                  Badge Destaque
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview do Header */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Preview do Header</CardTitle>
            <CardDescription>
              Visualização do cabeçalho para usuários logados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              {/* Header Preview */}
              <div 
                className="px-4 py-3 flex items-center justify-between"
                style={{ backgroundColor: 'hsl(var(--background))' }}
              >
                {/* Logo Section */}
                <div className="flex items-center gap-3">
                  {branding.logo_url ? (
                    <img 
                      src={branding.logo_url} 
                      alt="Logo" 
                      className="w-10 h-10 rounded-full object-cover shadow-md"
                    />
                  ) : (
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md"
                      style={{ backgroundColor: `hsl(${branding.primary_color})` }}
                    >
                      {organization.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h1 
                      className="text-sm font-semibold"
                      style={{ color: 'hsl(var(--foreground))' }}
                    >
                      {organization.name.split(' ').slice(0, 2).join(' ')}
                    </h1>
                    <p className="text-xs text-muted-foreground -mt-0.5">
                      {organization.name.split(' ').slice(2).join(' ') || 'Learning'}
                    </p>
                  </div>
                </div>

                {/* Navigation Links */}
                <nav className="hidden md:flex items-center gap-4">
                  {[
                    { label: 'Dashboard', icon: LayoutDashboard },
                    { label: 'Revisar', icon: Brain },
                    { label: 'Desafios', icon: Trophy },
                    { label: 'Gravar', icon: Mic },
                    { label: 'Estatísticas', icon: BarChart3 },
                  ].map((item, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center gap-1.5 text-xs font-medium"
                      style={{ 
                        color: idx === 0 
                          ? `hsl(${branding.primary_color})` 
                          : 'hsl(var(--muted-foreground))'
                      }}
                    >
                      <item.icon className="w-3.5 h-3.5" />
                      {item.label}
                    </div>
                  ))}
                </nav>

                {/* User Avatar */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
                      style={{ 
                        backgroundColor: `hsl(${branding.primary_color} / 0.2)`,
                        color: `hsl(${branding.primary_color})`
                      }}
                    >
                      US
                    </div>
                    <div 
                      className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                      style={{ 
                        background: `linear-gradient(135deg, hsl(${branding.primary_color}), hsl(${branding.accent_color}))`
                      }}
                    >
                      5
                    </div>
                  </div>
                  <span className="text-xs font-medium hidden sm:block">Usuário</span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview do Footer */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Preview do Footer</CardTitle>
            <CardDescription>
              Visualização do rodapé da plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              className="rounded-lg border overflow-hidden p-6"
              style={{ backgroundColor: 'hsl(var(--card))' }}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Logo e Descrição */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    {branding.logo_url ? (
                      <img 
                        src={branding.logo_url} 
                        alt="Logo" 
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: `hsl(${branding.primary_color})` }}
                      >
                        {organization.name.charAt(0)}
                      </div>
                    )}
                    <h3 className="text-sm font-bold">
                      <span style={{ color: `hsl(${branding.primary_color})` }}>
                        {organization.name.split(' ').slice(0, 2).join(' ')}
                      </span>
                      {' '}
                      <span style={{ color: 'hsl(var(--foreground))' }}>
                        {organization.name.split(' ').slice(2).join(' ') || 'Learning'}
                      </span>
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Plataforma de estudos sagrados para aprofundamento nos conhecimentos tradicionais.
                  </p>
                </div>

                {/* Contato */}
                <div>
                  <h4 className="font-semibold text-sm mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                    Contato
                  </h4>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Mail className="w-3 h-3" />
                      <span>contato@{organization.slug}.com</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Phone className="w-3 h-3" />
                      <span>(11) 99999-9999</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      <span>São Paulo, Brasil</span>
                    </li>
                  </ul>
                </div>

                {/* Legal */}
                <div>
                  <h4 className="font-semibold text-sm mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                    Legal
                  </h4>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    <li>Termos de Uso</li>
                    <li>Política de Privacidade</li>
                    <li>LGPD</li>
                  </ul>
                </div>
              </div>

              {/* Copyright */}
              <div className="border-t border-border mt-4 pt-4 text-center text-xs text-muted-foreground">
                <p>© {new Date().getFullYear()} {organization.name}. Todos os direitos reservados.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminOrganizationBranding;
