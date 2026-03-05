import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Loader2, ScrollText, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Bylaw {
  id: string;
  organization_id: string;
  title: string;
  content: string;
  is_published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

const AdminBylaws: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [bylaws, setBylaws] = useState<Bylaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBylaw, setEditingBylaw] = useState<Bylaw | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    is_published: false,
    display_order: 0,
  });

  useEffect(() => {
    if (organizationId) fetchBylaws();
  }, [organizationId]);

  const fetchBylaws = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('organization_bylaws' as any)
        .select('*')
        .eq('organization_id', organizationId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setBylaws((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching bylaws:', error);
      toast.error('Erro ao carregar estatuto');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (bylaw?: Bylaw) => {
    if (bylaw) {
      setEditingBylaw(bylaw);
      setFormData({
        title: bylaw.title,
        content: bylaw.content,
        is_published: bylaw.is_published,
        display_order: bylaw.display_order,
      });
    } else {
      setEditingBylaw(null);
      setFormData({
        title: '',
        content: '',
        is_published: false,
        display_order: bylaws.length,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      toast.error('Título e conteúdo são obrigatórios');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        organization_id: organizationId,
        title: formData.title,
        content: formData.content,
        is_published: formData.is_published,
        display_order: formData.display_order,
      };

      if (editingBylaw) {
        const { error } = await supabase
          .from('organization_bylaws' as any)
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingBylaw.id);
        if (error) throw error;
        toast.success('Artigo atualizado');
      } else {
        const { error } = await supabase
          .from('organization_bylaws' as any)
          .insert(payload);
        if (error) throw error;
        toast.success('Artigo criado');
      }

      setDialogOpen(false);
      fetchBylaws();
    } catch (error) {
      console.error('Error saving bylaw:', error);
      toast.error('Erro ao salvar artigo');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (bylaw: Bylaw) => {
    try {
      const { error } = await supabase
        .from('organization_bylaws' as any)
        .update({ is_published: !bylaw.is_published, updated_at: new Date().toISOString() })
        .eq('id', bylaw.id);
      if (error) throw error;
      toast.success(bylaw.is_published ? 'Artigo despublicado' : 'Artigo publicado');
      fetchBylaws();
    } catch (error) {
      toast.error('Erro ao alterar publicação');
    }
  };

  const handleDelete = async (bylaw: Bylaw) => {
    if (!confirm(`Excluir "${bylaw.title}"?`)) return;
    try {
      const { error } = await supabase
        .from('organization_bylaws' as any)
        .delete()
        .eq('id', bylaw.id);
      if (error) throw error;
      toast.success('Artigo excluído');
      fetchBylaws();
    } catch (error) {
      toast.error('Erro ao excluir artigo');
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
            <ScrollText className="w-6 h-6" />
            Estatuto
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os artigos e seções do estatuto da organização
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Artigo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Artigos do Estatuto</CardTitle>
          <CardDescription>{bylaws.length} artigo(s) cadastrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {bylaws.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum artigo cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bylaws.map((bylaw) => (
                  <TableRow key={bylaw.id}>
                    <TableCell>
                      <Badge variant="outline">{bylaw.display_order}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{bylaw.title}</TableCell>
                    <TableCell>
                      <Badge variant={bylaw.is_published ? 'default' : 'secondary'}>
                        {bylaw.is_published ? 'Publicado' : 'Rascunho'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleTogglePublish(bylaw)} title={bylaw.is_published ? 'Despublicar' : 'Publicar'}>
                          {bylaw.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(bylaw)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(bylaw)}>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBylaw ? 'Editar Artigo' : 'Novo Artigo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Art. 1º — Da Denominação"
              />
            </div>
            <div className="space-y-2">
              <Label>Conteúdo *</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Texto do artigo..."
                className="min-h-[200px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ordem de exibição</Label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={formData.is_published}
                  onCheckedChange={(c) => setFormData({ ...formData, is_published: c })}
                />
                <Label>Publicar</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingBylaw ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBylaws;
