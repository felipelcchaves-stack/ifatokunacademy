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
import { Plus, Pencil, Trash2, Loader2, Gift, Heart, Shield, Star, Zap, Award, BookOpen, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Benefit {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

const iconOptions = [
  { value: 'gift', label: 'Presente', Icon: Gift },
  { value: 'heart', label: 'Coração', Icon: Heart },
  { value: 'shield', label: 'Escudo', Icon: Shield },
  { value: 'star', label: 'Estrela', Icon: Star },
  { value: 'zap', label: 'Raio', Icon: Zap },
  { value: 'award', label: 'Prêmio', Icon: Award },
  { value: 'book-open', label: 'Livro', Icon: BookOpen },
  { value: 'users', label: 'Comunidade', Icon: Users },
];

const getIconComponent = (iconName: string | null) => {
  const found = iconOptions.find(i => i.value === iconName);
  return found ? found.Icon : Gift;
};

const AdminBenefits: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState<Benefit | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    icon: 'gift',
    is_active: true,
    display_order: 0,
  });

  useEffect(() => {
    if (organizationId) fetchBenefits();
  }, [organizationId]);

  const fetchBenefits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('organization_benefits' as any)
        .select('*')
        .eq('organization_id', organizationId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setBenefits((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching benefits:', error);
      toast.error('Erro ao carregar benefícios');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (benefit?: Benefit) => {
    if (benefit) {
      setEditingBenefit(benefit);
      setFormData({
        title: benefit.title,
        description: benefit.description || '',
        icon: benefit.icon || 'gift',
        is_active: benefit.is_active,
        display_order: benefit.display_order,
      });
    } else {
      setEditingBenefit(null);
      setFormData({
        title: '',
        description: '',
        icon: 'gift',
        is_active: true,
        display_order: benefits.length,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title) {
      toast.error('Título é obrigatório');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        organization_id: organizationId,
        title: formData.title,
        description: formData.description || null,
        icon: formData.icon,
        is_active: formData.is_active,
        display_order: formData.display_order,
      };

      if (editingBenefit) {
        const { error } = await supabase
          .from('organization_benefits' as any)
          .update(payload)
          .eq('id', editingBenefit.id);
        if (error) throw error;
        toast.success('Benefício atualizado');
      } else {
        const { error } = await supabase
          .from('organization_benefits' as any)
          .insert(payload);
        if (error) throw error;
        toast.success('Benefício criado');
      }

      setDialogOpen(false);
      fetchBenefits();
    } catch (error) {
      console.error('Error saving benefit:', error);
      toast.error('Erro ao salvar benefício');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (benefit: Benefit) => {
    if (!confirm(`Excluir "${benefit.title}"?`)) return;
    try {
      const { error } = await supabase
        .from('organization_benefits' as any)
        .delete()
        .eq('id', benefit.id);
      if (error) throw error;
      toast.success('Benefício excluído');
      fetchBenefits();
    } catch (error) {
      toast.error('Erro ao excluir benefício');
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
            <Gift className="w-6 h-6" />
            Benefícios
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os benefícios oferecidos aos membros
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Benefício
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lista de Benefícios</CardTitle>
          <CardDescription>{benefits.length} benefício(s) cadastrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {benefits.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum benefício cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ícone</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {benefits.map((benefit) => {
                  const IconComp = getIconComponent(benefit.icon);
                  return (
                    <TableRow key={benefit.id}>
                      <TableCell>
                        <IconComp className="w-5 h-5 text-primary" />
                      </TableCell>
                      <TableCell className="font-medium">{benefit.title}</TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {benefit.description || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={benefit.is_active ? 'default' : 'secondary'}>
                          {benefit.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(benefit)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(benefit)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBenefit ? 'Editar Benefício' : 'Novo Benefício'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Desconto em eventos"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detalhes do benefício..."
              />
            </div>
            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="grid grid-cols-4 gap-2">
                {iconOptions.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: value })}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                      formData.icon === value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(c) => setFormData({ ...formData, is_active: c })}
                />
                <Label>Ativo</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingBenefit ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBenefits;
