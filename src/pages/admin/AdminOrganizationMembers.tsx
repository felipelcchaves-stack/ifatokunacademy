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
  Mail,
  BookOpen
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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
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

interface MemberProfile {
  id?: string;
  user_id: string;
  organization_id: string;
  temple_role_id: string | null;
  religious_name: string;
  orixa_head: string;
  initiation_date: string;
  oye_ile: string;
  is_board_member: boolean;
  is_fee_exempt: boolean;
  exemption_reason: string;
  notes: string;
}

interface TempleRole {
  id: string;
  name: string;
  category: string;
  is_board_member: boolean;
  grants_fee_exemption: boolean;
  level: number;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  organization_type: string;
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
  const [memberProfiles, setMemberProfiles] = useState<Record<string, MemberProfile>>({});
  const [templeRoles, setTempleRoles] = useState<TempleRole[]>([]);
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

  // Religious profile dialog
  const [profileMember, setProfileMember] = useState<OrganizationMember | null>(null);
  const [profileForm, setProfileForm] = useState<MemberProfile | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const isAfrocultural = organization?.organization_type === 'afrocultural' || organization?.organization_type === 'association';

  useEffect(() => {
    if (organizationId) {
      fetchOrganization();
      fetchMembers();
    }
  }, [organizationId]);

  useEffect(() => {
    if (isAfrocultural && organizationId) {
      fetchTempleRoles();
      fetchMemberProfiles();
    }
  }, [isAfrocultural, organizationId]);

  const fetchOrganization = async () => {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, slug, organization_type')
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

  const fetchTempleRoles = async () => {
    const { data } = await supabase
      .from('temple_roles')
      .select('id, name, category, is_board_member, grants_fee_exemption, level')
      .eq('organization_id', organizationId!)
      .order('level', { ascending: false });
    if (data) setTempleRoles(data);
  };

  const fetchMemberProfiles = async () => {
    const { data } = await supabase
      .from('member_profiles' as any)
      .select('*')
      .eq('organization_id', organizationId!);
    if (data) {
      const map: Record<string, MemberProfile> = {};
      (data as any[]).forEach((mp: any) => {
        map[mp.user_id] = mp;
      });
      setMemberProfiles(map);
    }
  };

  const fetchAvailableUsers = async () => {
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

  // Religious profile handlers
  const handleOpenProfile = (member: OrganizationMember) => {
    const existing = memberProfiles[member.user_id];
    setProfileMember(member);
    setProfileForm(existing ? { ...existing } : {
      user_id: member.user_id,
      organization_id: organizationId!,
      temple_role_id: null,
      religious_name: '',
      orixa_head: '',
      initiation_date: '',
      oye_ile: '',
      is_board_member: false,
      is_fee_exempt: false,
      exemption_reason: '',
      notes: '',
    });
  };

  const handleTempleRoleChange = (roleId: string) => {
    if (!profileForm) return;
    const role = templeRoles.find(r => r.id === roleId);
    const updates: Partial<MemberProfile> = { temple_role_id: roleId || null };
    if (role?.grants_fee_exemption) {
      updates.is_fee_exempt = true;
    }
    if (role?.is_board_member) {
      updates.is_board_member = true;
      updates.exemption_reason = 'Membro da diretoria';
    }
    setProfileForm({ ...profileForm, ...updates });
  };

  const handleBoardMemberChange = (checked: boolean) => {
    if (!profileForm) return;
    setProfileForm({
      ...profileForm,
      is_board_member: checked,
      exemption_reason: checked ? 'Membro da diretoria' : profileForm.exemption_reason,
    });
  };

  const handleSaveProfile = async () => {
    if (!profileForm || !organizationId) return;
    setSavingProfile(true);
    try {
      const payload = {
        user_id: profileForm.user_id,
        organization_id: organizationId,
        temple_role_id: profileForm.temple_role_id || null,
        religious_name: profileForm.religious_name || null,
        orixa_head: profileForm.orixa_head || null,
        initiation_date: profileForm.initiation_date || null,
        oye_ile: profileForm.oye_ile || null,
        is_board_member: profileForm.is_board_member,
        is_fee_exempt: profileForm.is_fee_exempt,
        exemption_reason: profileForm.exemption_reason || null,
        notes: profileForm.notes || null,
        updated_at: new Date().toISOString(),
      };

      if (profileForm.id) {
        const { error } = await supabase
          .from('member_profiles' as any)
          .update(payload as any)
          .eq('id', profileForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('member_profiles' as any)
          .insert(payload as any);
        if (error) throw error;
      }

      toast({ title: 'Perfil salvo', description: 'Perfil religioso atualizado com sucesso.' });
      setProfileMember(null);
      fetchMemberProfiles();
    } catch (err: any) {
      console.error('Error saving profile:', err);
      toast({ variant: 'destructive', title: 'Erro', description: err.message || 'Não foi possível salvar.' });
    } finally {
      setSavingProfile(false);
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

  const getTempleRoleName = (userId: string) => {
    const mp = memberProfiles[userId];
    if (!mp?.temple_role_id) return null;
    return templeRoles.find(r => r.id === mp.temple_role_id)?.name || null;
  };

  const filteredMembers = members.filter(member => {
    if (!searchQuery) return true;
    const name = member.profile?.full_name?.toLowerCase() || '';
    const email = member.profile?.email?.toLowerCase() || '';
    const religiousName = memberProfiles[member.user_id]?.religious_name?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query) || religiousName.includes(query);
  });

  const filteredAvailableUsers = availableUsers.filter(u => {
    if (!userSearchQuery) return true;
    const name = u.full_name?.toLowerCase() || '';
    const email = u.email?.toLowerCase() || '';
    const query = userSearchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  const canManageMember = (member: OrganizationMember) => {
    if (isAdmin && member.role !== 'owner') return true;
    if (member.role === 'owner') return false;
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
              placeholder="Buscar por nome, email ou orunkó..."
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
                  {isAfrocultural && <TableHead>Orunkó</TableHead>}
                  {isAfrocultural && <TableHead>Cargo</TableHead>}
                  <TableHead>Função</TableHead>
                  {isAfrocultural && <TableHead>Diretoria</TableHead>}
                  <TableHead>Ingressou em</TableHead>
                  <TableHead>Org Principal</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAfrocultural ? 8 : 5} className="text-center py-8 text-muted-foreground">
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
                      {isAfrocultural && (
                        <TableCell className="text-muted-foreground">
                          {memberProfiles[member.user_id]?.religious_name || '—'}
                        </TableCell>
                      )}
                      {isAfrocultural && (
                        <TableCell>
                          {getTempleRoleName(member.user_id) ? (
                            <Badge variant="outline">{getTempleRoleName(member.user_id)}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getRoleIcon(member.role)}
                          {getRoleBadge(member.role)}
                        </div>
                      </TableCell>
                      {isAfrocultural && (
                        <TableCell>
                          {memberProfiles[member.user_id]?.is_board_member ? (
                            <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">Sim</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
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
                              {isAfrocultural && (
                                <DropdownMenuItem onClick={() => handleOpenProfile(member)}>
                                  <BookOpen className="w-4 h-4 mr-2" />
                                  Perfil Religioso
                                </DropdownMenuItem>
                              )}
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

      {/* Religious Profile Dialog */}
      <Dialog open={!!profileMember} onOpenChange={() => setProfileMember(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Perfil Religioso</DialogTitle>
            <DialogDescription>
              {profileMember?.profile?.full_name || profileMember?.profile?.email}
            </DialogDescription>
          </DialogHeader>

          {profileForm && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Orunkó (Nome religioso)</Label>
                  <Input
                    value={profileForm.religious_name}
                    onChange={(e) => setProfileForm({ ...profileForm, religious_name: e.target.value })}
                    placeholder="Nome religioso"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Orixá de cabeça</Label>
                  <Input
                    value={profileForm.orixa_head}
                    onChange={(e) => setProfileForm({ ...profileForm, orixa_head: e.target.value })}
                    placeholder="Ex: Oxalá, Xangô..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de iniciação</Label>
                  <Input
                    type="date"
                    value={profileForm.initiation_date}
                    onChange={(e) => setProfileForm({ ...profileForm, initiation_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Oye Ilê (Título)</Label>
                  <Input
                    value={profileForm.oye_ile}
                    onChange={(e) => setProfileForm({ ...profileForm, oye_ile: e.target.value })}
                    placeholder="Ex: Axogum, Iyá Kékeré..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cargo no Templo</Label>
                <Select
                  value={profileForm.temple_role_id || ''}
                  onValueChange={handleTempleRoleChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cargo" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="">Nenhum</SelectItem>
                    {templeRoles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name} ({role.category === 'spiritual' ? 'Espiritual' : 'Diretoria'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="board-member"
                    checked={profileForm.is_board_member}
                    onCheckedChange={(checked) => handleBoardMemberChange(checked as boolean)}
                  />
                  <label htmlFor="board-member" className="text-sm font-medium">
                    Membro da Diretoria
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="fee-exempt"
                    checked={profileForm.is_fee_exempt}
                    onCheckedChange={(checked) => setProfileForm({ ...profileForm, is_fee_exempt: checked as boolean })}
                  />
                  <label htmlFor="fee-exempt" className="text-sm font-medium">
                    Isento de mensalidade
                  </label>
                </div>
              </div>

              {profileForm.is_fee_exempt && (
                <div className="space-y-2">
                  <Label>Motivo da isenção</Label>
                  <Input
                    value={profileForm.exemption_reason}
                    onChange={(e) => setProfileForm({ ...profileForm, exemption_reason: e.target.value })}
                    placeholder="Motivo da isenção"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  value={profileForm.notes}
                  onChange={(e) => setProfileForm({ ...profileForm, notes: e.target.value })}
                  placeholder="Observações adicionais..."
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileMember(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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
