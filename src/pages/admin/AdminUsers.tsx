import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  Crown
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  isAdmin: boolean;
}

interface AdminEmail {
  email: string;
}

export default function AdminUsers() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [adminEmails, setAdminEmails] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'promote' | 'demote';
    user: UserProfile | null;
  }>({ open: false, type: 'promote', user: null });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [isAdmin, navigate]);

  const fetchData = async () => {
    try {
      // Buscar todos os perfis
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Buscar emails de admin
      const { data: admins, error: adminsError } = await supabase
        .from('admin_emails')
        .select('email');

      if (adminsError) throw adminsError;

      const adminEmailSet = new Set((admins || []).map((a: AdminEmail) => a.email.toLowerCase()));
      setAdminEmails(adminEmailSet);

      // Marcar usuários como admin
      const usersWithAdminStatus = (profiles || []).map(profile => ({
        ...profile,
        isAdmin: profile.email ? adminEmailSet.has(profile.email.toLowerCase()) : false
      }));

      setUsers(usersWithAdminStatus);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteToAdmin = async (user: UserProfile) => {
    if (!user.email) {
      toast.error('Usuário não possui email cadastrado');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('admin_emails')
        .insert({ email: user.email });

      if (error) throw error;

      // Atualizar estado local
      setAdminEmails(prev => new Set([...prev, user.email!.toLowerCase()]));
      setUsers(prev => prev.map(u => 
        u.id === user.id ? { ...u, isAdmin: true } : u
      ));

      toast.success(`${user.full_name || user.email} agora é administrador!`);
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

  const handleDemoteAdmin = async (user: UserProfile) => {
    if (!user.email) {
      toast.error('Usuário não possui email cadastrado');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('admin_emails')
        .delete()
        .eq('email', user.email);

      if (error) throw error;

      // Atualizar estado local
      setAdminEmails(prev => {
        const newSet = new Set(prev);
        newSet.delete(user.email!.toLowerCase());
        return newSet;
      });
      setUsers(prev => prev.map(u => 
        u.id === user.id ? { ...u, isAdmin: false } : u
      ));

      toast.success(`${user.full_name || user.email} removido dos administradores`);
    } catch (error) {
      console.error('Erro ao remover admin:', error);
      toast.error('Erro ao remover administrador');
    } finally {
      setProcessing(false);
      setConfirmDialog({ open: false, type: 'demote', user: null });
    }
  };

  // Filtrar usuários
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (user.email?.toLowerCase().includes(searchQuery.toLowerCase()) || false);

    const matchesRole = 
      filterRole === 'all' ||
      (filterRole === 'admin' && user.isAdmin) ||
      (filterRole === 'student' && !user.isAdmin);

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
      <div>
        <h1 className="text-3xl font-bold text-foreground">Gerenciamento de Usuários</h1>
        <p className="text-muted-foreground mt-1">
          Visualize e gerencie os usuários da plataforma
        </p>
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
                <TableHead>Cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {getInitials(user.full_name, user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {user.full_name || 'Sem nome'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">{user.email || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.isAdmin ? (
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
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Calendar className="h-4 w-4" />
                        {formatDate(user.created_at)}
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
                          {user.isAdmin ? (
                            <DropdownMenuItem
                              onClick={() => setConfirmDialog({ 
                                open: true, 
                                type: 'demote', 
                                user 
                              })}
                              className="text-destructive focus:text-destructive"
                            >
                              <ShieldOff className="h-4 w-4 mr-2" />
                              Remover Admin
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => setConfirmDialog({ 
                                open: true, 
                                type: 'promote', 
                                user 
                              })}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Promover a Admin
                            </DropdownMenuItem>
                          )}
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

      {/* Confirm Dialog */}
      <AlertDialog 
        open={confirmDialog.open} 
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.type === 'promote' 
                ? 'Promover a Administrador' 
                : 'Remover Administrador'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.type === 'promote' 
                ? `Tem certeza que deseja promover ${confirmDialog.user?.full_name || confirmDialog.user?.email} a administrador? Ele terá acesso total ao painel administrativo.`
                : `Tem certeza que deseja remover ${confirmDialog.user?.full_name || confirmDialog.user?.email} dos administradores? Ele perderá acesso ao painel administrativo.`
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
                  } else {
                    handleDemoteAdmin(confirmDialog.user);
                  }
                }
              }}
              disabled={processing}
              className={confirmDialog.type === 'demote' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {confirmDialog.type === 'promote' ? 'Promover' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
