import React, { useState, useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Building2, Users, BookOpen, Globe, Palette, Loader2, Pencil, Trash2, Shield } from 'lucide-react';
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

const defaultSettings: OrganizationSettings = {
  max_users: 100,
  max_modules: 50,
  plan_type: 'free',
  features: [],
};

const parseOrganization = (data: any): Organization => {
  const rawBranding = data.branding as Record<string, unknown> | null;
  const rawSettings = data.settings as Record<string, unknown> | null;
  
  return {
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
};

const AdminOrganizations: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    custom_domain: '',
    is_active: true,
    max_users: 100,
    max_modules: 50,
    plan_type: 'free' as 'free' | 'pro' | 'enterprise',
  });

  // Se estiver em uma sub-rota, renderizar o Outlet
  if (location.pathname !== '/admin/organizations') {
    return <Outlet />;
  }

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchOrganizations();
  }, [isAdmin, navigate]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const orgs = (data || []).map(parseOrganization);
      setOrganizations(orgs);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Erro ao carregar organizações');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (org?: Organization) => {
    if (org) {
      setEditingOrg(org);
      setFormData({
        name: org.name,
        slug: org.slug,
        custom_domain: org.custom_domain || '',
        is_active: org.is_active,
        max_users: org.settings.max_users,
        max_modules: org.settings.max_modules,
        plan_type: org.settings.plan_type,
      });
    } else {
      setEditingOrg(null);
      setFormData({
        name: '',
        slug: '',
        custom_domain: '',
        is_active: true,
        max_users: 100,
        max_modules: 50,
        plan_type: 'free',
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug) {
      toast.error('Nome e slug são obrigatórios');
      return;
    }

    // Validar slug (apenas letras, números e hífens)
    if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      toast.error('Slug deve conter apenas letras minúsculas, números e hífens');
      return;
    }

    try {
      setSaving(true);
      
      const orgData = {
        name: formData.name,
        slug: formData.slug,
        custom_domain: formData.custom_domain || null,
        is_active: formData.is_active,
        settings: {
          max_users: formData.max_users,
          max_modules: formData.max_modules,
          plan_type: formData.plan_type,
          features: editingOrg?.settings.features || [],
        },
      };

      if (editingOrg) {
        const { error } = await supabase
          .from('organizations')
          .update(orgData)
          .eq('id', editingOrg.id);

        if (error) throw error;
        toast.success('Organização atualizada com sucesso');
      } else {
        const { error } = await supabase
          .from('organizations')
          .insert({
            name: orgData.name,
            slug: orgData.slug,
            custom_domain: orgData.custom_domain,
            is_active: orgData.is_active,
            settings: JSON.parse(JSON.stringify(orgData.settings)),
            branding: JSON.parse(JSON.stringify(defaultBranding)),
          });

        if (error) throw error;
        toast.success('Organização criada com sucesso');
      }

      setDialogOpen(false);
      fetchOrganizations();
    } catch (error: any) {
      console.error('Error saving organization:', error);
      if (error.code === '23505') {
        toast.error('Slug ou domínio já está em uso');
      } else {
        toast.error('Erro ao salvar organização');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (org: Organization) => {
    if (org.slug === 'ifatokun') {
      toast.error('Não é possível excluir a organização principal');
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir "${org.name}"? Esta ação é irreversível.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', org.id);

      if (error) throw error;
      toast.success('Organização excluída');
      fetchOrganizations();
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast.error('Erro ao excluir organização');
    }
  };

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case 'enterprise': return 'default';
      case 'pro': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            Organizações (Multi-Tenant)
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as organizações e seus tenants
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Organização
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingOrg ? 'Editar Organização' : 'Nova Organização'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Academia Yorubá"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (subdomínio) *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                    placeholder="academia-yoruba"
                  />
                  <span className="text-muted-foreground text-sm">.ifatokunacademy.com</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="custom_domain">Domínio Customizado (opcional)</Label>
                <Input
                  id="custom_domain"
                  value={formData.custom_domain}
                  onChange={(e) => setFormData({ ...formData, custom_domain: e.target.value })}
                  placeholder="Ex: www.meusite.com.br"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_users">Máx. Usuários</Label>
                  <Input
                    id="max_users"
                    type="number"
                    value={formData.max_users}
                    onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) || 0 })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="max_modules">Máx. Módulos</Label>
                  <Input
                    id="max_modules"
                    type="number"
                    value={formData.max_modules}
                    onChange={(e) => setFormData({ ...formData, max_modules: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="plan_type">Plano</Label>
                <select
                  id="plan_type"
                  className="w-full border rounded-md p-2 bg-background"
                  value={formData.plan_type}
                  onChange={(e) => setFormData({ ...formData, plan_type: e.target.value as 'free' | 'pro' | 'enterprise' })}
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Organização ativa</Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingOrg ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Todas as Organizações</CardTitle>
          <CardDescription>
            {organizations.length} organização(ões) cadastrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Slug / Domínio</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Limites</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Globe className="w-3 h-3" />
                        {org.slug}.ifatokunacademy.com
                      </div>
                      {org.custom_domain && (
                        <div className="text-xs text-muted-foreground">
                          {org.custom_domain}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPlanBadgeVariant(org.settings.plan_type)}>
                      {org.settings.plan_type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {org.settings.max_users === -1 ? '∞' : org.settings.max_users}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {org.settings.max_modules === -1 ? '∞' : org.settings.max_modules}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={org.is_active ? 'default' : 'destructive'}>
                      {org.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/organizations/${org.id}/branding`)}
                        title="Branding"
                      >
                        <Palette className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/organizations/${org.id}/admins`)}
                        title="Administradores"
                      >
                        <Shield className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(org)}
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {org.slug !== 'ifatokun' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(org)}
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOrganizations;
