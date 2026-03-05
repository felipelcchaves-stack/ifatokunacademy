import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Loader2, Crown, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TempleRole {
  id: string;
  organization_id: string;
  name: string;
  level: number;
  description: string | null;
  category: string;
  is_board_member: boolean;
  grants_fee_exemption: boolean;
  created_at: string;
}

const AdminTempleHierarchy: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [roles, setRoles] = useState<TempleRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<TempleRole | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('spiritual');

  const [formData, setFormData] = useState({
    name: '',
    level: 0,
    description: '',
    category: 'spiritual',
    is_board_member: false,
    grants_fee_exemption: false,
  });

  useEffect(() => {
    if (organizationId) fetchRoles();
  }, [organizationId]);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('temple_roles' as any)
        .select('*')
        .eq('organization_id', organizationId)
        .order('level', { ascending: true });

      if (error) throw error;
      setRoles((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching temple roles:', error);
      toast.error('Erro ao carregar cargos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (role?: TempleRole) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        level: role.level,
        description: role.description || '',
        category: role.category,
        is_board_member: role.is_board_member,
        grants_fee_exemption: role.grants_fee_exemption,
      });
    } else {
      setEditingRole(null);
      setFormData({
        name: '',
        level: 0,
        description: '',
        category: activeTab,
        is_board_member: activeTab === 'board',
        grants_fee_exemption: false,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        organization_id: organizationId,
        name: formData.name,
        level: formData.level,
        description: formData.description || null,
        category: formData.category,
        is_board_member: formData.is_board_member,
        grants_fee_exemption: formData.grants_fee_exemption,
      };

      if (editingRole) {
        const { error } = await supabase
          .from('temple_roles' as any)
          .update(payload)
          .eq('id', editingRole.id);
        if (error) throw error;
        toast.success('Cargo atualizado');
      } else {
        const { error } = await supabase
          .from('temple_roles' as any)
          .insert(payload);
        if (error) throw error;
        toast.success('Cargo criado');
      }

      setDialogOpen(false);
      fetchRoles();
    } catch (error) {
      console.error('Error saving role:', error);
      toast.error('Erro ao salvar cargo');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role: TempleRole) => {
    if (!confirm(`Excluir o cargo "${role.name}"?`)) return;
    try {
      const { error } = await supabase
        .from('temple_roles' as any)
        .delete()
        .eq('id', role.id);
      if (error) throw error;
      toast.success('Cargo excluído');
      fetchRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Erro ao excluir cargo');
    }
  };

  const filteredRoles = roles.filter(r => r.category === activeTab);

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
            <Crown className="w-6 h-6" />
            Hierarquia do Templo
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os cargos espirituais e de diretoria
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Cargo
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="spiritual" className="flex items-center gap-2">
            <Crown className="w-4 h-4" />
            Hierarquia Espiritual
          </TabsTrigger>
          <TabsTrigger value="board" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Diretoria / Estatuto
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {activeTab === 'spiritual' ? 'Cargos Espirituais (Oye Ilê)' : 'Cargos de Diretoria'}
              </CardTitle>
              <CardDescription>
                {filteredRoles.length} cargo(s) cadastrado(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredRoles.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum cargo cadastrado nesta categoria.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nível</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Diretoria</TableHead>
                      <TableHead>Isenção</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell>
                          <Badge variant="outline">{role.level}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate">
                          {role.description || '—'}
                        </TableCell>
                        <TableCell>
                          {role.is_board_member ? (
                            <Badge variant="default">Sim</Badge>
                          ) : (
                            <span className="text-muted-foreground">Não</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {role.grants_fee_exemption ? (
                            <Badge variant="secondary">Isento</Badge>
                          ) : (
                            <span className="text-muted-foreground">Não</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(role)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(role)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Editar Cargo' : 'Novo Cargo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Babalorixá, Presidente"
              />
            </div>
            <div className="space-y-2">
              <Label>Nível hierárquico</Label>
              <Input
                type="number"
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição do cargo..."
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <select
                className="w-full border rounded-md p-2 bg-background"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="spiritual">Espiritual (Oye Ilê)</option>
                <option value="board">Diretoria / Estatuto</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_board_member}
                onCheckedChange={(c) => setFormData({ ...formData, is_board_member: c })}
              />
              <Label>Membro da Diretoria</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.grants_fee_exemption}
                onCheckedChange={(c) => setFormData({ ...formData, grants_fee_exemption: c })}
              />
              <Label>Concede isenção de mensalidade</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingRole ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTempleHierarchy;
