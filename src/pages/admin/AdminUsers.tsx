import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAdminOrganization } from "@/hooks/useAdminOrganization";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validatePassword } from "@/lib/passwordValidation";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import {
  Search, 
  Filter, 
  UserCheck, 
  UserX, 
  Shield, 
  ShieldOff,
  Loader2,
  Mail,
  Calendar,
  MoreVertical,
  Users,
  Crown,
  UserPlus,
  Trash2,
  Settings,
  BookOpen,
  Eye,
  EyeOff,
  Lock
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  isAdmin: boolean;
  modulePermissions: string[];
}

interface Module {
  id: string;
  title: string;
  type: string;
  level: string | null;
}

export default function AdminUsers() {
  const { isAdmin, user } = useAuth();
  const { organization, isOrgAdmin } = useOrganization();
  const { activeOrg, loading: orgLoading } = useAdminOrganization();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [cohorts, setCohorts] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [adminEmails, setAdminEmails] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  
  // Dialogs
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'promote' | 'demote' | 'delete';
    user: UserProfile | null;
  }>({ open: false, type: 'promote', user: null });
  
  // Form states
  const [inviteForm, setInviteForm] = useState({
    email: '',
    fullName: '',
    password: '',
    cohortId: '',
    moduleIds: [] as string[]
  });
  const [showPassword, setShowPassword] = useState(false);
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Permitir acesso tanto para admin global quanto org admin
    if (!isAdmin && !isOrgAdmin) {
      navigate('/dashboard');
      return;
    }
    
    // Aguardar org ativa carregar
    if (orgLoading || !activeOrg) {
      return;
    }
    
    fetchData();
  }, [isAdmin, isOrgAdmin, navigate, activeOrg, orgLoading]);

  const fetchData = async () => {
    if (!activeOrg) return;
    
    try {
      // MULTI-TENANT STRICT: Buscar APENAS usuários da organização ativa via organization_members
      const { data: membershipData, error: membershipError } = await supabase
        .from('organization_members')
        .select(`
          user_id,
          role,
          profiles!inner (
            id,
            full_name,
            email,
            avatar_url,
            created_at
          )
        `)
        .eq('organization_id', activeOrg.id);

      if (membershipError) throw membershipError;

      // Buscar emails de admin (apenas admin global pode ver isso)
      let adminEmailSet = new Set<string>();
      if (isAdmin) {
        const { data: admins, error: adminsError } = await supabase
          .from('admin_emails')
          .select('email');

        if (adminsError) throw adminsError;
        adminEmailSet = new Set((admins || []).map((a: { email: string }) => a.email.toLowerCase()));
      }
      setAdminEmails(adminEmailSet);

      // MULTI-TENANT STRICT: Buscar APENAS módulos da organização ativa
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select('id, title, type, level')
        .eq('organization_id', activeOrg.id)
        .order('display_order');

      if (modulesError) throw modulesError;
      setModules(modulesData || []);

      // Buscar permissões de módulos (apenas dos módulos da org)
      const moduleIds = (modulesData || []).map(m => m.id);
      let permissionsMap = new Map<string, string[]>();
      
      if (moduleIds.length > 0) {
        const { data: permissions, error: permError } = await supabase
          .from('user_module_permissions')
          .select('user_id, module_id')
          .in('module_id', moduleIds);

        if (permError) throw permError;

        (permissions || []).forEach((p: { user_id: string; module_id: string }) => {
          if (!permissionsMap.has(p.user_id)) {
            permissionsMap.set(p.user_id, []);
          }
          permissionsMap.get(p.user_id)!.push(p.module_id);
        });
      }

      // Transformar dados de membership para UserProfile
      const usersWithStatus = (membershipData || []).map((membership: any) => ({
        id: membership.profiles.id,
        full_name: membership.profiles.full_name,
        email: membership.profiles.email,
        avatar_url: membership.profiles.avatar_url,
        created_at: membership.profiles.created_at,
        isAdmin: membership.profiles.email ? adminEmailSet.has(membership.profiles.email.toLowerCase()) : false,
        modulePermissions: permissionsMap.get(membership.profiles.id) || []
      }));

      setUsers(usersWithStatus);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteForm.email || !inviteForm.password) {
      toast.error('Email e senha são obrigatórios');
      return;
    }

    const passwordValidation = validatePassword(inviteForm.password);
    if (!passwordValidation.isValid) {
      toast.error(passwordValidation.feedback[0] || 'Senha não atende aos requisitos de segurança');
      return;
    }

    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('create-user', {
        body: {
          email: inviteForm.email,
          password: inviteForm.password,
          fullName: inviteForm.fullName,
          moduleIds: inviteForm.moduleIds,
          organizationId: activeOrg?.id // Usar org ativa do admin
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao criar usuário');
      }

      toast.success(`Usuário ${inviteForm.email} criado com sucesso!`);
      setInviteDialogOpen(false);
      setInviteForm({ email: '', fullName: '', password: '', moduleIds: [] });
      fetchData();
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      toast.error(error.message || 'Erro ao criar usuário');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedUser) return;

    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('update-user-permissions', {
        body: {
          userId: selectedUser.id,
          moduleIds: selectedModuleIds
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao atualizar permissões');
      }

      toast.success('Permissões atualizadas com sucesso!');
      setPermissionsDialogOpen(false);
      setSelectedUser(null);
      setSelectedModuleIds([]);
      fetchData();
    } catch (error: any) {
      console.error('Erro ao atualizar permissões:', error);
      toast.error(error.message || 'Erro ao atualizar permissões');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteUser = async (userToDelete: UserProfile) => {
    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('delete-user', {
        body: { userId: userToDelete.id },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao excluir usuário');
      }

      toast.success(`Usuário ${userToDelete.full_name || userToDelete.email} excluído!`);
      setConfirmDialog({ open: false, type: 'delete', user: null });
      fetchData();
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error);
      toast.error(error.message || 'Erro ao excluir usuário');
    } finally {
      setProcessing(false);
    }
  };

  const handlePromoteToAdmin = async (userToPromote: UserProfile) => {
    if (!userToPromote.email) {
      toast.error('Usuário não possui email cadastrado');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('admin_emails')
        .insert({ email: userToPromote.email });

      if (error) throw error;

      setAdminEmails(prev => new Set([...prev, userToPromote.email!.toLowerCase()]));
      setUsers(prev => prev.map(u => 
        u.id === userToPromote.id ? { ...u, isAdmin: true } : u
      ));

      toast.success(`${userToPromote.full_name || userToPromote.email} agora é administrador!`);
    } catch (error: any) {
      console.error('Erro ao promover usuário:', error);
      if (error.code === '23505') {
        toast.error('Este usuário já é administrador');
      } else {
        toast.error('Erro ao promover usuário');
      }
    } finally {
      setProcessing(false);
      setConfirmDialog({ open: false, type: 'promote', user: null });
    }
  };

  const handleDemoteAdmin = async (userToDemote: UserProfile) => {
    if (!userToDemote.email) {
      toast.error('Usuário não possui email cadastrado');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('admin_emails')
        .delete()
        .eq('email', userToDemote.email);

      if (error) throw error;

      setAdminEmails(prev => {
        const newSet = new Set(prev);
        newSet.delete(userToDemote.email!.toLowerCase());
        return newSet;
      });
      setUsers(prev => prev.map(u => 
        u.id === userToDemote.id ? { ...u, isAdmin: false } : u
      ));

      toast.success(`${userToDemote.full_name || userToDemote.email} removido dos administradores`);
    } catch (error) {
      console.error('Erro ao remover admin:', error);
      toast.error('Erro ao remover administrador');
    } finally {
      setProcessing(false);
      setConfirmDialog({ open: false, type: 'demote', user: null });
    }
  };

  const openPermissionsDialog = (userProfile: UserProfile) => {
    setSelectedUser(userProfile);
    setSelectedModuleIds(userProfile.modulePermissions);
    setPermissionsDialogOpen(true);
  };

  const toggleModuleInForm = (moduleId: string) => {
    setInviteForm(prev => ({
      ...prev,
      moduleIds: prev.moduleIds.includes(moduleId)
        ? prev.moduleIds.filter(id => id !== moduleId)
        : [...prev.moduleIds, moduleId]
    }));
  };

  const toggleModuleInPermissions = (moduleId: string) => {
    setSelectedModuleIds(prev => 
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const getModuleTitles = (moduleIds: string[]) => {
    return moduleIds.map(id => {
      const mod = modules.find(m => m.id === id);
      return mod?.title || 'Módulo desconhecido';
    });
  };

  // Filtrar usuários
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (u.email?.toLowerCase().includes(searchQuery.toLowerCase()) || false);

    const matchesRole = 
      filterRole === 'all' ||
      (filterRole === 'admin' && u.isAdmin) ||
      (filterRole === 'student' && !u.isAdmin);

    return matchesSearch && matchesRole;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return '??';
  };

  const stats = {
    total: users.length,
    admins: users.filter(u => u.isAdmin).length,
    students: users.filter(u => !u.isAdmin).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gerenciamento de Usuários</h1>
          <p className="text-muted-foreground mt-1">
            Crie, edite e gerencie os usuários da plataforma
          </p>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Convidar Usuário
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <Crown className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admins}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estudantes</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.students}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por papel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="admin">Administradores</SelectItem>
                <SelectItem value="student">Estudantes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Usuários ({filteredUsers.length})
          </CardTitle>
          <CardDescription>
            Lista de todos os usuários cadastrados na plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Módulos</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={u.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {getInitials(u.full_name, u.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {u.full_name || 'Sem nome'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">{u.email || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.isAdmin ? (
                        <Badge className="bg-primary/10 text-primary border-primary/20">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          Estudante
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.isAdmin ? (
                        <span className="text-sm text-muted-foreground">Acesso total</span>
                      ) : u.modulePermissions.length > 0 ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="cursor-help">
                              <BookOpen className="h-3 w-3 mr-1" />
                              {u.modulePermissions.length} módulo{u.modulePermissions.length > 1 ? 's' : ''}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="font-semibold mb-1">Módulos:</p>
                            <ul className="text-sm space-y-0.5">
                              {getModuleTitles(u.modulePermissions).map((title, idx) => (
                                <li key={idx}>• {title}</li>
                              ))}
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-sm text-destructive">Sem acesso</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Calendar className="h-4 w-4" />
                        {formatDate(u.created_at)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openPermissionsDialog(u)}>
                            <Settings className="h-4 w-4 mr-2" />
                            Gerenciar Módulos
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {u.isAdmin ? (
                            <DropdownMenuItem
                              onClick={() => setConfirmDialog({ open: true, type: 'demote', user: u })}
                              className="text-destructive focus:text-destructive"
                            >
                              <ShieldOff className="h-4 w-4 mr-2" />
                              Remover Admin
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => setConfirmDialog({ open: true, type: 'promote', user: u })}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Promover a Admin
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setConfirmDialog({ open: true, type: 'delete', user: u })}
                            className="text-destructive focus:text-destructive"
                            disabled={u.id === user?.id}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir Usuário
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invite User Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Convidar Novo Usuário</DialogTitle>
            <DialogDescription>
              Crie uma conta para um novo usuário e defina quais módulos ele poderá acessar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="usuario@email.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-name">Nome Completo</Label>
              <Input
                id="invite-name"
                placeholder="Nome do usuário"
                value={inviteForm.fullName}
                onChange={(e) => setInviteForm(prev => ({ ...prev, fullName: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-password">Senha Inicial *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="invite-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Senha forte (8+ caracteres)"
                  value={inviteForm.password}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, password: e.target.value }))}
                  className="pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrengthIndicator password={inviteForm.password} />
            </div>

            <div className="space-y-2">
              <Label>Módulos Permitidos</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Selecione os módulos que este usuário poderá acessar
              </p>
              <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                {modules.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Nenhum módulo disponível
                  </p>
                ) : (
                  modules.map(mod => (
                    <div key={mod.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`invite-mod-${mod.id}`}
                        checked={inviteForm.moduleIds.includes(mod.id)}
                        onCheckedChange={() => toggleModuleInForm(mod.id)}
                      />
                      <Label 
                        htmlFor={`invite-mod-${mod.id}`} 
                        className="flex-1 cursor-pointer text-sm font-normal"
                      >
                        {mod.title}
                        <span className="text-muted-foreground ml-2">
                          ({mod.type === 'proficiency' ? mod.level : 'Temático'})
                        </span>
                      </Label>
                    </div>
                  ))
                )}
              </div>
              {inviteForm.moduleIds.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {inviteForm.moduleIds.length} módulo{inviteForm.moduleIds.length > 1 ? 's' : ''} selecionado{inviteForm.moduleIds.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)} disabled={processing}>
              Cancelar
            </Button>
            <Button onClick={handleInviteUser} disabled={processing}>
              {processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Dialog */}
      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Módulos</DialogTitle>
            <DialogDescription>
              Edite os módulos que {selectedUser?.full_name || selectedUser?.email} pode acessar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="border rounded-lg p-3 space-y-2 max-h-64 overflow-y-auto">
              {modules.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Nenhum módulo disponível
                </p>
              ) : (
                modules.map(mod => (
                  <div key={mod.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`perm-mod-${mod.id}`}
                      checked={selectedModuleIds.includes(mod.id)}
                      onCheckedChange={() => toggleModuleInPermissions(mod.id)}
                    />
                    <Label 
                      htmlFor={`perm-mod-${mod.id}`} 
                      className="flex-1 cursor-pointer text-sm font-normal"
                    >
                      {mod.title}
                      <span className="text-muted-foreground ml-2">
                        ({mod.type === 'proficiency' ? mod.level : 'Temático'})
                      </span>
                    </Label>
                  </div>
                ))
              )}
            </div>
            {selectedModuleIds.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {selectedModuleIds.length} módulo{selectedModuleIds.length > 1 ? 's' : ''} selecionado{selectedModuleIds.length > 1 ? 's' : ''}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionsDialogOpen(false)} disabled={processing}>
              Cancelar
            </Button>
            <Button onClick={handleUpdatePermissions} disabled={processing}>
              {processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar Permissões
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <AlertDialog 
        open={confirmDialog.open} 
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.type === 'promote' && 'Promover a Administrador'}
              {confirmDialog.type === 'demote' && 'Remover Administrador'}
              {confirmDialog.type === 'delete' && 'Excluir Usuário'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.type === 'promote' && 
                `Tem certeza que deseja promover ${confirmDialog.user?.full_name || confirmDialog.user?.email} a administrador? Ele terá acesso total ao painel administrativo.`
              }
              {confirmDialog.type === 'demote' && 
                `Tem certeza que deseja remover ${confirmDialog.user?.full_name || confirmDialog.user?.email} dos administradores? Ele perderá acesso ao painel administrativo.`
              }
              {confirmDialog.type === 'delete' && 
                `Tem certeza que deseja EXCLUIR ${confirmDialog.user?.full_name || confirmDialog.user?.email}? Esta ação é IRREVERSÍVEL e todos os dados do usuário serão perdidos.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDialog.user) {
                  if (confirmDialog.type === 'promote') {
                    handlePromoteToAdmin(confirmDialog.user);
                  } else if (confirmDialog.type === 'demote') {
                    handleDemoteAdmin(confirmDialog.user);
                  } else if (confirmDialog.type === 'delete') {
                    handleDeleteUser(confirmDialog.user);
                  }
                }
              }}
              disabled={processing}
              className={confirmDialog.type !== 'promote' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {confirmDialog.type === 'promote' && 'Promover'}
              {confirmDialog.type === 'demote' && 'Remover'}
              {confirmDialog.type === 'delete' && 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
