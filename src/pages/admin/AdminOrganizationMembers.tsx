import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  Plus, 
  Trash2, 
  Crown,
  Shield,
  User,
  MoreHorizontal,
  Search,
  Loader2,
  Star,
  Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrganizationMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: 'member' | 'admin' | 'owner';
  is_primary: boolean;
  joined_at: string;
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface AvailableUser {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

const AdminOrganizationMembers: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add member dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'member' | 'admin'>('member');
  const [addingMember, setAddingMember] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Edit role dialog
  const [editingMember, setEditingMember] = useState<OrganizationMember | null>(null);
  const [newRole, setNewRole] = useState<'member' | 'admin' | 'owner'>('member');
  const [updatingRole, setUpdatingRole] = useState(false);

  // Remove member dialog
  const [removingMember, setRemovingMember] = useState<OrganizationMember | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  useEffect(() => {
    if (organizationId) {
      fetchOrganization();
      fetchMembers();
    }
  }, [organizationId]);

  const fetchOrganization = async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('id', organizationId)
      .single();

    if (!error && data) {
      setOrganization(data);
    }
  };

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          id,
          user_id,
          organization_id,
          role,
          is_primary,
          joined_at,
          profiles:user_id (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('organization_id', organizationId)
        .order('role', { ascending: true })
        .order('joined_at', { ascending: true });

      if (error) throw error;

      const formattedMembers: OrganizationMember[] = (data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        organization_id: item.organization_id,
        role: item.role as 'member' | 'admin' | 'owner',
        is_primary: item.is_primary,
        joined_at: item.joined_at,
        profile: item.profiles as OrganizationMember['profile'],
      }));

      setMembers(formattedMembers);
    } catch (err) {
      console.error('Error fetching members:', err);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar os membros.',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    // Get users that are NOT already members of this org
    const { data: allProfiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .order('full_name');

    if (error) {
      console.error('Error fetching users:', error);
      return;
    }

    const memberUserIds = members.map(m => m.user_id);
    const available = (allProfiles || []).filter(p => !memberUserIds.includes(p.id));
    setAvailableUsers(available);
  };

  const handleOpenAddDialog = () => {
    fetchAvailableUsers();
    setSelectedUserId('');
    setSelectedRole('member');
    setUserSearchQuery('');
    setShowAddDialog(true);
  };

  const handleAddMember = async () => {
    if (!selectedUserId || !organizationId) return;

    setAddingMember(true);
    try {
      const { error } = await supabase
        .from('organization_members')
        .insert({
          user_id: selectedUserId,
          organization_id: organizationId,
          role: selectedRole,
          is_primary: false,
        });

      if (error) throw error;

      toast({
        title: 'Membro adicionado',
        description: 'O usuário foi adicionado à organização com sucesso.',
      });

      setShowAddDialog(false);
      fetchMembers();
    } catch (err: any) {
      console.error('Error adding member:', err);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: err.message || 'Não foi possível adicionar o membro.',
      });
    } finally {
      setAddingMember(false);
    }
  };

  const handleOpenEditRole = (member: OrganizationMember) => {
    setEditingMember(member);
    setNewRole(member.role);
  };

  const handleUpdateRole = async () => {
    if (!editingMember) return;

    setUpdatingRole(true);
    try {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', editingMember.id);

      if (error) throw error;

      toast({
        title: 'Função atualizada',
        description: 'A função do membro foi atualizada com sucesso.',
      });

      setEditingMember(null);
      fetchMembers();
    } catch (err: any) {
      console.error('Error updating role:', err);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: err.message || 'Não foi possível atualizar a função.',
      });
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removingMember) return;

    setConfirmingRemove(true);
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', removingMember.id);

      if (error) throw error;

      toast({
        title: 'Membro removido',
        description: 'O membro foi removido da organização.',
      });

      setRemovingMember(null);
      fetchMembers();
    } catch (err: any) {
      console.error('Error removing member:', err);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: err.message || 'Não foi possível remover o membro.',
      });
    } finally {
      setConfirmingRemove(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-amber-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-primary" />;
      default:
        return <User className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">Dono</Badge>;
      case 'admin':
        return <Badge variant="secondary">Admin</Badge>;
      default:
        return <Badge variant="outline">Membro</Badge>;
    }
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const filteredMembers = members.filter(member => {
    if (!searchQuery) return true;
    const name = member.profile?.full_name?.toLowerCase() || '';
    const email = member.profile?.email?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  const filteredAvailableUsers = availableUsers.filter(u => {
    if (!userSearchQuery) return true;
    const name = u.full_name?.toLowerCase() || '';
    const email = u.email?.toLowerCase() || '';
    const query = userSearchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  const canManageMember = (member: OrganizationMember) => {
    // Global admins can manage anyone except owners
    if (isAdmin && member.role !== 'owner') return true;
    // Owners can't be managed
    if (member.role === 'owner') return false;
    // Can't manage yourself
    if (member.user_id === user?.id) return false;
    return true;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/organizations')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Membros da Organização</h1>
          <p className="text-muted-foreground">{organization?.name}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{members.length}</p>
                <p className="text-sm text-muted-foreground">Total de membros</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-amber-500/10">
                <Shield className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {members.filter(m => m.role === 'admin' || m.role === 'owner').length}
                </p>
                <p className="text-sm text-muted-foreground">Administradores</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <User className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {members.filter(m => m.role === 'member').length}
                </p>
                <p className="text-sm text-muted-foreground">Membros regulares</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Membros</CardTitle>
              <CardDescription>Gerencie os membros desta organização</CardDescription>
            </div>
            <Button onClick={handleOpenAddDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Membro
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Ingressou em</TableHead>
                  <TableHead>Org Principal</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? 'Nenhum membro encontrado.' : 'Nenhum membro nesta organização.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9">
                            <AvatarImage src={member.profile?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(member.profile?.full_name, member.profile?.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {member.profile?.full_name || 'Sem nome'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {member.profile?.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getRoleIcon(member.role)}
                          {getRoleBadge(member.role)}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(member.joined_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {member.is_primary && (
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        {canManageMember(member) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover">
                              <DropdownMenuItem onClick={() => handleOpenEditRole(member)}>
                                <Shield className="w-4 h-4 mr-2" />
                                Alterar função
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => setRemovingMember(member)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Membro</DialogTitle>
            <DialogDescription>
              Adicione um usuário existente a esta organização.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Buscar usuário</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Nome ou email..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Selecionar usuário</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um usuário" />
                </SelectTrigger>
                <SelectContent className="bg-popover max-h-60">
                  {filteredAvailableUsers.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      Nenhum usuário disponível
                    </div>
                  ) : (
                    filteredAvailableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={u.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(u.full_name, u.email)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{u.full_name || u.email}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Função</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as 'member' | 'admin')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="member">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Membro
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Administrador
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddMember} disabled={!selectedUserId || addingMember}>
              {addingMember && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Função</DialogTitle>
            <DialogDescription>
              Altere a função de {editingMember?.profile?.full_name || editingMember?.profile?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nova função</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as 'member' | 'admin' | 'owner')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="member">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Membro
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Administrador
                    </div>
                  </SelectItem>
                  {isAdmin && (
                    <SelectItem value="owner">
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4" />
                        Dono
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateRole} disabled={updatingRole}>
              {updatingRole && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!removingMember} onOpenChange={() => setRemovingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover{' '}
              <strong>{removingMember?.profile?.full_name || removingMember?.profile?.email}</strong>{' '}
              desta organização? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={confirmingRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {confirmingRemove && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminOrganizationMembers;
