import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Users, Pencil, Trash2, GraduationCap, Calendar, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAdminOrganization } from '@/hooks/useAdminOrganization';

interface Cohort {
  id: string;
  name: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
  organization_id: string;
}

interface OrgMember {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

const AdminCohorts: React.FC = () => {
  const { activeOrg } = useAdminOrganization();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formStartsAt, setFormStartsAt] = useState('');
  const [formEndsAt, setFormEndsAt] = useState('');
  const [saving, setSaving] = useState(false);

  // Detail state
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [cohortMembers, setCohortMembers] = useState<string[]>([]);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchCohorts = useCallback(async () => {
    if (!activeOrg) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('cohorts')
      .select('*')
      .eq('organization_id', activeOrg.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Erro ao carregar turmas', description: error.message, variant: 'destructive' });
    } else {
      setCohorts((data || []) as Cohort[]);
    }
    setLoading(false);
  }, [activeOrg]);

  useEffect(() => { fetchCohorts(); }, [fetchCohorts]);

  const openCreate = () => {
    setEditingCohort(null);
    setFormName('');
    setFormDesc('');
    setFormStartsAt('');
    setFormEndsAt('');
    setDialogOpen(true);
  };

  const openEdit = (c: Cohort) => {
    setEditingCohort(c);
    setFormName(c.name);
    setFormDesc(c.description || '');
    setFormStartsAt(c.starts_at || '');
    setFormEndsAt(c.ends_at || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!activeOrg || !formName.trim()) return;
    setSaving(true);

    const payload = {
      name: formName.trim(),
      description: formDesc.trim() || null,
      starts_at: formStartsAt || null,
      ends_at: formEndsAt || null,
      organization_id: activeOrg.id,
    };

    if (editingCohort) {
      const { error } = await supabase.from('cohorts').update(payload).eq('id', editingCohort.id);
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      else toast({ title: 'Turma atualizada!' });
    } else {
      const { error } = await supabase.from('cohorts').insert(payload);
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      else toast({ title: 'Turma criada!' });
    }

    setSaving(false);
    setDialogOpen(false);
    fetchCohorts();
  };

  const toggleActive = async (c: Cohort) => {
    const { error } = await supabase.from('cohorts').update({ is_active: !c.is_active }).eq('id', c.id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else fetchCohorts();
  };

  const deleteCohort = async (c: Cohort) => {
    if (!confirm(`Excluir turma "${c.name}"? Isso removerá todos os vínculos de alunos e módulos.`)) return;
    const { error } = await supabase.from('cohorts').delete().eq('id', c.id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Turma excluída' });
      if (selectedCohort?.id === c.id) setSelectedCohort(null);
      fetchCohorts();
    }
  };

  // Detail: load members + modules for selected cohort
  const openDetail = async (c: Cohort) => {
    setSelectedCohort(c);
    setDetailLoading(true);

    const [membersRes, orgMembersRes] = await Promise.all([
      supabase.from('cohort_members').select('user_id').eq('cohort_id', c.id),
      supabase.from('organization_members').select('user_id, profiles:user_id(full_name, email)').eq('organization_id', c.organization_id),
    ]);

    setCohortMembers((membersRes.data || []).map((m: any) => m.user_id));
    setOrgMembers(
      (orgMembersRes.data || []).map((m: any) => ({
        user_id: m.user_id,
        full_name: m.profiles?.full_name || null,
        email: m.profiles?.email || null,
      }))
    );
    setDetailLoading(false);
  };

  const toggleMember = async (userId: string) => {
    if (!selectedCohort) return;
    const isEnrolled = cohortMembers.includes(userId);

    if (isEnrolled) {
      const { error } = await supabase.from('cohort_members').delete().eq('cohort_id', selectedCohort.id).eq('user_id', userId);
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      setCohortMembers(prev => prev.filter(id => id !== userId));
    } else {
      const { error } = await supabase.from('cohort_members').insert({ cohort_id: selectedCohort.id, user_id: userId });
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      setCohortMembers(prev => [...prev, userId]);
    }
  };

  const toggleModule = async (moduleId: string) => {
    if (!selectedCohort) return;
    const isAssigned = cohortModuleIds.includes(moduleId);

    if (isAssigned) {
      const { error } = await supabase.from('cohort_modules').delete().eq('cohort_id', selectedCohort.id).eq('module_id', moduleId);
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      setCohortModuleIds(prev => prev.filter(id => id !== moduleId));
    } else {
      const nextOrder = cohortModuleIds.length;
      const { error } = await supabase.from('cohort_modules').insert({ cohort_id: selectedCohort.id, module_id: moduleId, display_order: nextOrder });
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      setCohortModuleIds(prev => [...prev, moduleId]);
    }
  };

  if (!activeOrg) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Selecione uma organização para gerenciar turmas.</p>
      </div>
    );
  }

  if (activeOrg.organization_type !== 'educational') {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>O recurso de turmas está disponível apenas para organizações educacionais.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Turmas</h1>
          <p className="text-muted-foreground">Gerencie turmas e o isolamento de conteúdo por grupo de alunos.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Turma
        </Button>
      </div>

      {/* Cohort list + detail side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* List */}
        <div className="space-y-3">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : cohorts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <GraduationCap className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">Nenhuma turma criada ainda.</p>
                <Button onClick={openCreate} variant="outline" className="mt-4">
                  <Plus className="w-4 h-4 mr-2" /> Criar primeira turma
                </Button>
              </CardContent>
            </Card>
          ) : (
            cohorts.map(c => (
              <Card
                key={c.id}
                className={`cursor-pointer transition-colors hover:border-primary/50 ${selectedCohort?.id === c.id ? 'border-primary ring-1 ring-primary/30' : ''}`}
                onClick={() => openDetail(c)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{c.name}</CardTitle>
                    <div className="flex items-center gap-1">
                      <Badge variant={c.is_active ? 'default' : 'secondary'}>
                        {c.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                  </div>
                  {c.description && <CardDescription className="line-clamp-2">{c.description}</CardDescription>}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {c.starts_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(c.starts_at).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); toggleActive(c); }}>
                        {c.is_active ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(c); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); deleteCohort(c); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Detail panel */}
        <div>
          {selectedCohort ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{selectedCohort.name}</CardTitle>
                <CardDescription>Gerencie alunos e módulos desta turma</CardDescription>
              </CardHeader>
              <CardContent>
                {detailLoading ? (
                  <p className="text-muted-foreground text-center py-8">Carregando...</p>
                ) : (
                  <Tabs defaultValue="members">
                    <TabsList className="w-full">
                      <TabsTrigger value="members" className="flex-1">
                        <Users className="w-4 h-4 mr-1" /> Alunos ({cohortMembers.length})
                      </TabsTrigger>
                      <TabsTrigger value="modules" className="flex-1">
                        <BookOpen className="w-4 h-4 mr-1" /> Módulos ({cohortModuleIds.length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="members" className="mt-4 space-y-2 max-h-[400px] overflow-y-auto">
                      {orgMembers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhum membro na organização.</p>
                      ) : (
                        orgMembers.map(m => (
                          <div key={m.user_id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50">
                            <Checkbox
                              checked={cohortMembers.includes(m.user_id)}
                              onCheckedChange={() => toggleMember(m.user_id)}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{m.full_name || 'Sem nome'}</p>
                              <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </TabsContent>

                    <TabsContent value="modules" className="mt-4 space-y-2 max-h-[400px] overflow-y-auto">
                      {orgModules.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Nenhum módulo publicado na organização.</p>
                      ) : (
                        orgModules.map(m => (
                          <div key={m.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50">
                            <Checkbox
                              checked={cohortModuleIds.includes(m.id)}
                              onCheckedChange={() => toggleModule(m.id)}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{m.title}</p>
                              <Badge variant="outline" className="text-xs">{m.type === 'proficiency' ? 'Proficiência' : 'Temático'}</Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <GraduationCap className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Selecione uma turma para gerenciar alunos e módulos.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCohort ? 'Editar Turma' : 'Nova Turma'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da turma *</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ex: Turma 1 - Formação 2026" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Descrição opcional..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de início</Label>
                <Input type="date" value={formStartsAt} onChange={e => setFormStartsAt(e.target.value)} />
              </div>
              <div>
                <Label>Data de término</Label>
                <Input type="date" value={formEndsAt} onChange={e => setFormEndsAt(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving ? 'Salvando...' : (editingCohort ? 'Salvar' : 'Criar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCohorts;
