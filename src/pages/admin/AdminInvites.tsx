import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validatePassword } from "@/lib/passwordValidation";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { useAdminOrganization } from "@/hooks/useAdminOrganization";
import { 
  Search, 
  Filter, 
  Loader2,
  Mail,
  Calendar,
  MoreVertical,
  UserPlus,
  XCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
  BookOpen,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

interface Invite {
  id: string;
  email: string;
  full_name: string | null;
  invited_by_name: string | null;
  status: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  organization_id: string | null;
}

interface Module {
  id: string;
  title: string;
  type: string;
  level: string | null;
}

interface Cohort {
  id: string;
  name: string;
}

export default function AdminInvites() {
  const { isAdmin, user, profile } = useAuth();
  const { organization, isOrgAdmin } = useOrganization();
  const { activeOrg, loading: orgLoading } = useAdminOrganization();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const isEducational = activeOrg?.organization_type === 'educational';
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState<Invite | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'cancel';
    invite: Invite | null;
  }>({ open: false, type: 'cancel', invite: null });
  
  // Form states
  const [inviteForm, setInviteForm] = useState({
    email: '',
    fullName: '',
    moduleIds: [] as string[],
    cohortId: '' as string
  });
  const [activateForm, setActivateForm] = useState({
    password: '',
    moduleIds: [] as string[]
  });
  const [showPassword, setShowPassword] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Permitir acesso tanto para admin global quanto org admin
    if (!isAdmin && !isOrgAdmin) {
      navigate('/dashboard');
      return;
    }
    if (!orgLoading && activeOrg) {
      fetchData();
    }
  }, [isAdmin, isOrgAdmin, navigate, activeOrg, orgLoading]);

  const fetchData = async () => {
    if (!activeOrg) return;
    
    try {
      // Buscar convites - ALWAYS filter by active organization
      const { data: invitesData, error: invitesError } = await supabase
        .from('user_invites')
        .select('*')
        .eq('organization_id', activeOrg.id)
        .order('created_at', { ascending: false });

      if (invitesError) throw invitesError;
      setInvites(invitesData || []);

      // Buscar módulos - ALWAYS filter by active organization
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select('id, title, type, level')
        .eq('organization_id', activeOrg.id)
        .order('display_order');

      if (modulesError) throw modulesError;
      setModules(modulesData || []);

      // Buscar turmas ativas (apenas para orgs educacionais)
      if (activeOrg.organization_type === 'educational') {
        const { data: cohortsData } = await supabase
          .from('cohorts')
          .select('id, name')
          .eq('organization_id', activeOrg.id)
          .eq('is_active', true)
          .order('name');
        setCohorts(cohortsData || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!inviteForm.email) {
      toast.error('Email é obrigatório');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('user_invites')
        .insert({
          email: inviteForm.email,
          full_name: inviteForm.fullName || null,
          invited_by_id: user?.id || '',
          invited_by_name: profile?.full_name || user?.email || null,
          status: 'pending',
          organization_id: activeOrg?.id || null,
          cohort_id: inviteForm.cohortId || null
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Já existe um convite para este email');
        } else {
          throw error;
        }
        return;
      }

      toast.success(`Convite criado para ${inviteForm.email}`);
      setCreateDialogOpen(false);
      setInviteForm({ email: '', fullName: '', moduleIds: [] });
      fetchData();
    } catch (error: any) {
      console.error('Erro ao criar convite:', error);
      toast.error(error.message || 'Erro ao criar convite');
    } finally {
      setProcessing(false);
    }
  };

  const handleActivateInvite = async () => {
    if (!selectedInvite) return;
    
    const passwordValidation = validatePassword(activateForm.password);
    if (!passwordValidation.isValid) {
      toast.error(passwordValidation.feedback[0] || 'Senha não atende aos requisitos de segurança');
      return;
    }

    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('create-user', {
        body: {
          email: selectedInvite.email,
          password: activateForm.password,
          fullName: selectedInvite.full_name,
          moduleIds: activateForm.moduleIds,
          inviteId: selectedInvite.id,
          organizationId: selectedInvite.organization_id || activeOrg?.id
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao ativar convite');
      }

      toast.success(`Usuário ${selectedInvite.email} criado com sucesso!`);
      setActivateDialogOpen(false);
      setSelectedInvite(null);
      setActivateForm({ password: '', moduleIds: [] });
      fetchData();
    } catch (error: any) {
      console.error('Erro ao ativar convite:', error);
      toast.error(error.message || 'Erro ao ativar convite');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelInvite = async (invite: Invite) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('user_invites')
        .update({ status: 'cancelled' })
        .eq('id', invite.id);

      if (error) throw error;

      toast.success('Convite cancelado');
      setConfirmDialog({ open: false, type: 'cancel', invite: null });
      fetchData();
    } catch (error: any) {
      console.error('Erro ao cancelar convite:', error);
      toast.error('Erro ao cancelar convite');
    } finally {
      setProcessing(false);
    }
  };

  const openActivateDialog = (invite: Invite) => {
    setSelectedInvite(invite);
    setActivateForm({ password: '', moduleIds: [] });
    setActivateDialogOpen(true);
  };

  const toggleModuleInForm = (moduleId: string) => {
    setInviteForm(prev => ({
      ...prev,
      moduleIds: prev.moduleIds.includes(moduleId)
        ? prev.moduleIds.filter(id => id !== moduleId)
        : [...prev.moduleIds, moduleId]
    }));
  };

  const toggleModuleInActivate = (moduleId: string) => {
    setActivateForm(prev => ({
      ...prev,
      moduleIds: prev.moduleIds.includes(moduleId)
        ? prev.moduleIds.filter(id => id !== moduleId)
        : [...prev.moduleIds, moduleId]
    }));
  };

  // Filtrar convites
  const filteredInvites = invites.filter(invite => {
    const matchesSearch = 
      invite.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (invite.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false);

    const matchesStatus = 
      filterStatus === 'all' ||
      invite.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string, expiresAt: string) => {
    const isExpired = new Date(expiresAt) < new Date();
    
    if (status === 'accepted') {
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle className="h-3 w-3 mr-1" />
          Aceito
        </Badge>
      );
    }
    if (status === 'cancelled') {
      return (
        <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
          <XCircle className="h-3 w-3 mr-1" />
          Cancelado
        </Badge>
      );
    }
    if (isExpired || status === 'expired') {
      return (
        <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Expirado
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
        <Clock className="h-3 w-3 mr-1" />
        Pendente
      </Badge>
    );
  };

  const stats = {
    total: invites.length,
    pending: invites.filter(i => i.status === 'pending' && new Date(i.expires_at) > new Date()).length,
    accepted: invites.filter(i => i.status === 'accepted').length,
    expired: invites.filter(i => i.status === 'expired' || (i.status === 'pending' && new Date(i.expires_at) < new Date())).length
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
          <h1 className="text-3xl font-bold text-foreground">Gerenciamento de Convites</h1>
          <p className="text-muted-foreground mt-1">
            Crie e gerencie convites para novos usuários
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Novo Convite
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aceitos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expirados</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.expired}</div>
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
                placeholder="Buscar por email ou nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="accepted">Aceitos</SelectItem>
                <SelectItem value="expired">Expirados</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invites Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Convites ({filteredInvites.length})
          </CardTitle>
          <CardDescription>
            Lista de todos os convites enviados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Convidado por</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum convite encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvites.map((invite) => {
                  const isPending = invite.status === 'pending' && new Date(invite.expires_at) > new Date();
                  
                  return (
                    <TableRow key={invite.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{invite.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {invite.full_name || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(invite.status, invite.expires_at)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {invite.invited_by_name || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Calendar className="h-4 w-4" />
                          {formatDate(invite.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(invite.expires_at)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {formatDateTime(invite.expires_at)}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-right">
                        {isPending && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openActivateDialog(invite)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Ativar (Criar Usuário)
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setConfirmDialog({ open: true, type: 'cancel', invite })}
                                className="text-destructive focus:text-destructive"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancelar Convite
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Invite Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar Novo Convite</DialogTitle>
            <DialogDescription>
              Crie um convite para um novo usuário. Depois você poderá ativá-lo definindo a senha e os módulos.
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
              <Label htmlFor="invite-name">Nome Completo (opcional)</Label>
              <Input
                id="invite-name"
                placeholder="Nome do usuário"
                value={inviteForm.fullName}
                onChange={(e) => setInviteForm(prev => ({ ...prev, fullName: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={processing}>
              Cancelar
            </Button>
            <Button onClick={handleCreateInvite} disabled={processing}>
              {processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Criar Convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate Invite Dialog */}
      <Dialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ativar Convite</DialogTitle>
            <DialogDescription>
              Crie a conta para {selectedInvite?.email}. Defina a senha inicial e os módulos permitidos.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="activate-password">Senha Inicial *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="activate-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Senha forte (8+ caracteres)"
                  value={activateForm.password}
                  onChange={(e) => setActivateForm(prev => ({ ...prev, password: e.target.value }))}
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
              <PasswordStrengthIndicator password={activateForm.password} />
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
                        id={`activate-mod-${mod.id}`}
                        checked={activateForm.moduleIds.includes(mod.id)}
                        onCheckedChange={() => toggleModuleInActivate(mod.id)}
                      />
                      <Label 
                        htmlFor={`activate-mod-${mod.id}`} 
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
              {activateForm.moduleIds.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {activateForm.moduleIds.length} módulo{activateForm.moduleIds.length > 1 ? 's' : ''} selecionado{activateForm.moduleIds.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActivateDialogOpen(false)} disabled={processing}>
              Cancelar
            </Button>
            <Button onClick={handleActivateInvite} disabled={processing}>
              {processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Cancel Dialog */}
      <AlertDialog 
        open={confirmDialog.open} 
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Convite</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar o convite para {confirmDialog.invite?.email}?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDialog.invite && handleCancelInvite(confirmDialog.invite)}
              disabled={processing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {processing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Cancelar Convite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
