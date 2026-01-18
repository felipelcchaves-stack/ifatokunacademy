import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Users, Plus, Loader2, Crown, Shield, UserCheck, Trash2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OrganizationAdmin {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'moderator';
  created_at: string;
  user_email?: string;
  user_name?: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
}

const roleConfig = {
  owner: {
    label: 'Proprietário',
    icon: Crown,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    description: 'Controle total sobre a organização',
  },
  admin: {
    label: 'Administrador',
    icon: Shield,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    description: 'Pode gerenciar conteúdo e usuários',
  },
  moderator: {
    label: 'Moderador',
    icon: UserCheck,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    description: 'Pode gerenciar conteúdo',
  },
};

const AdminOrganizationAdmins: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [admins, setAdmins] = useState<OrganizationAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    role: 'admin' as 'owner' | 'admin' | 'moderator',
  });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    if (organizationId) {
      fetchOrganization();
      fetchAdmins();
    }
  }, [isAdmin, organizationId, navigate]);

  const fetchOrganization = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('id', organizationId)
        .single();

      if (error) throw error;
      setOrganization(data);
    } catch (error) {
      console.error('Error fetching organization:', error);
      toast.error('Erro ao carregar organização');
      navigate('/admin/organizations');
    }
  };

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      
      // Fetch organization admins
      const { data: adminData, error: adminError } = await supabase
        .from('organization_admins')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true });

      if (adminError) throw adminError;

      // Fetch user profiles for each admin
      const userIds = adminData?.map(a => a.user_id) || [];
      
      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds);

        if (profileError) throw profileError;

        const adminsWithProfiles = adminData?.map(admin => {
          const profile = profiles?.find(p => p.id === admin.user_id);
          return {
            ...admin,
            role: admin.role as 'owner' | 'admin' | 'moderator',
            user_email: profile?.email || 'Email não disponível',
            user_name: profile?.full_name || 'Nome não disponível',
          };
        }) || [];

        setAdmins(adminsWithProfiles);
      } else {
        setAdmins([]);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast.error('Erro ao carregar administradores');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!formData.email) {
      toast.error('Email é obrigatório');
      return;
    }

    try {
      setSaving(true);
      
      // Find user by email
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', formData.email.toLowerCase().trim())
        .single();

      if (profileError || !profiles) {
        toast.error('Usuário não encontrado com este email');
        return;
      }

      // Check if already an admin
      const existingAdmin = admins.find(a => a.user_id === profiles.id);
      if (existingAdmin) {
        toast.error('Este usuário já é administrador desta organização');
        return;
      }

      // Add as admin
      const { error } = await supabase
        .from('organization_admins')
        .insert({
          organization_id: organizationId,
          user_id: profiles.id,
          role: formData.role,
        });

      if (error) throw error;

      toast.success('Administrador adicionado com sucesso');
      setDialogOpen(false);
      setFormData({ email: '', role: 'admin' });
      fetchAdmins();
    } catch (error: any) {
      console.error('Error adding admin:', error);
      if (error.code === '23505') {
        toast.error('Este usuário já é administrador desta organização');
      } else {
        toast.error('Erro ao adicionar administrador');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRole = async (adminId: string, newRole: 'owner' | 'admin' | 'moderator') => {
    try {
      const { error } = await supabase
        .from('organization_admins')
        .update({ role: newRole })
        .eq('id', adminId);

      if (error) throw error;

      toast.success('Função atualizada');
      fetchAdmins();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Erro ao atualizar função');
    }
  };

  const handleRemoveAdmin = async (admin: OrganizationAdmin) => {
    // Prevent removing the last owner
    const owners = admins.filter(a => a.role === 'owner');
    if (admin.role === 'owner' && owners.length <= 1) {
      toast.error('Não é possível remover o único proprietário');
      return;
    }

    // Prevent removing yourself
    if (admin.user_id === user?.id) {
      toast.error('Você não pode remover a si mesmo');
      return;
    }

    if (!confirm(`Remover ${admin.user_name || admin.user_email} como administrador?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('organization_admins')
        .delete()
        .eq('id', admin.id);

      if (error) throw error;

      toast.success('Administrador removido');
      fetchAdmins();
    } catch (error) {
      console.error('Error removing admin:', error);
      toast.error('Erro ao remover administrador');
    }
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
              <Users className="w-6 h-6" />
              Administradores - {organization.name}
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie quem pode administrar esta organização
            </p>
          </div>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Administrador</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email do Usuário *</Label>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="usuario@exemplo.com"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  O usuário deve já estar cadastrado na plataforma
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Função</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: 'owner' | 'admin' | 'moderator') => 
                    setFormData({ ...formData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(roleConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className={`w-4 h-4 ${config.color}`} />
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {roleConfig[formData.role].description}
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddAdmin} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Role Legend */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(roleConfig).map(([key, config]) => (
          <Card key={key} className={config.bgColor}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <config.icon className={`w-5 h-5 ${config.color}`} />
                <div>
                  <p className="font-medium">{config.label}</p>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Admins Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Administradores</CardTitle>
          <CardDescription>
            {admins.length} administrador(es) nesta organização
          </CardDescription>
        </CardHeader>
        <CardContent>
          {admins.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum administrador cadastrado</p>
              <p className="text-sm">Adicione o primeiro administrador clicando no botão acima</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Adicionado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => {
                  const config = roleConfig[admin.role];
                  const isCurrentUser = admin.user_id === user?.id;
                  
                  return (
                    <TableRow key={admin.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center`}>
                            <config.icon className={`w-4 h-4 ${config.color}`} />
                          </div>
                          <span className="font-medium">
                            {admin.user_name}
                            {isCurrentUser && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                Você
                              </Badge>
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {admin.user_email}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={admin.role}
                          onValueChange={(value: 'owner' | 'admin' | 'moderator') => 
                            handleUpdateRole(admin.id, value)
                          }
                          disabled={isCurrentUser}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(roleConfig).map(([key, cfg]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                  <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                                  <span>{cfg.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(admin.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAdmin(admin)}
                          disabled={isCurrentUser}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminOrganizationAdmins;
