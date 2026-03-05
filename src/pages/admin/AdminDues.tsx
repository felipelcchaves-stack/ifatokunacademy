import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Receipt, Plus, Check, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Due {
  id: string;
  user_id: string;
  reference_month: string;
  amount_cents: number;
  status: string;
  due_date: string;
  paid_at: string | null;
  payment_method: string | null;
  notes: string | null;
  profile?: { full_name: string | null; email: string | null };
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  paid: 'bg-green-100 text-green-800 border-green-300',
  overdue: 'bg-red-100 text-red-800 border-red-300',
  exempt: 'bg-blue-100 text-blue-800 border-blue-300',
};

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Vencido',
  exempt: 'Isento',
};

const AdminDues: React.FC = () => {
  const { organizationId } = useParams<{ organizationId: string }>();
  const { toast } = useToast();
  const [dues, setDues] = useState<Due[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [generateAmount, setGenerateAmount] = useState('50.00');
  const [generateMonth, setGenerateMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [generateDueDay, setGenerateDueDay] = useState('10');
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);

  useEffect(() => {
    if (organizationId) fetchDues();
  }, [organizationId, filterStatus, filterMonth]);

  const fetchDues = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('member_dues' as any)
        .select('*, profile:profiles!member_dues_user_id_fkey(full_name, email)')
        .eq('organization_id', organizationId!)
        .order('reference_month', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      if (filterMonth) {
        query = query.eq('reference_month', `${filterMonth}-01`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDues((data as any[]) || []);
    } catch (error: any) {
      console.error('Error fetching dues:', error);
      toast({ title: 'Erro ao carregar mensalidades', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const generateDues = async () => {
    if (!organizationId) return;
    try {
      setGenerating(true);
      
      // Get active members (not fee exempt)
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', organizationId);

      if (membersError) throw membersError;

      // Get exempt members
      const { data: exemptProfiles } = await supabase
        .from('member_profiles' as any)
        .select('user_id')
        .eq('organization_id', organizationId)
        .eq('is_fee_exempt', true);

      const exemptUserIds = new Set((exemptProfiles || []).map((p: any) => p.user_id));
      const eligibleMembers = (members || []).filter(m => !exemptUserIds.has(m.user_id));

      const amountCents = Math.round(parseFloat(generateAmount) * 100);
      const refMonth = `${generateMonth}-01`;
      const dueDate = `${generateMonth}-${generateDueDay.padStart(2, '0')}`;

      const records = eligibleMembers.map(m => ({
        organization_id: organizationId,
        user_id: m.user_id,
        reference_month: refMonth,
        amount_cents: amountCents,
        status: 'pending',
        due_date: dueDate,
      }));

      // Also create exempt records
      const exemptRecords = (members || [])
        .filter(m => exemptUserIds.has(m.user_id))
        .map(m => ({
          organization_id: organizationId,
          user_id: m.user_id,
          reference_month: refMonth,
          amount_cents: 0,
          status: 'exempt',
          due_date: dueDate,
        }));

      const allRecords = [...records, ...exemptRecords];
      if (allRecords.length === 0) {
        toast({ title: 'Nenhum membro encontrado', variant: 'destructive' });
        return;
      }

      const { error } = await supabase
        .from('member_dues' as any)
        .upsert(allRecords as any, { onConflict: 'organization_id,user_id,reference_month' });

      if (error) throw error;

      toast({ title: 'Mensalidades geradas!', description: `${records.length} pendentes, ${exemptRecords.length} isentos` });
      setShowGenerateDialog(false);
      fetchDues();
    } catch (error: any) {
      console.error('Error generating dues:', error);
      toast({ title: 'Erro ao gerar mensalidades', description: error.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const markAsPaid = async (dueId: string, method: string = 'manual') => {
    try {
      const { error } = await supabase
        .from('member_dues' as any)
        .update({ status: 'paid', paid_at: new Date().toISOString(), payment_method: method } as any)
        .eq('id', dueId);

      if (error) throw error;
      toast({ title: 'Marcado como pago!' });
      fetchDues();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  };

  const formatMonth = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return format(date, 'MMMM/yyyy', { locale: ptBR });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Receipt className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Mensalidades</h1>
            <p className="text-muted-foreground">Gerencie as mensalidades dos membros</p>
          </div>
        </div>

        <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Gerar Mensalidades
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerar Mensalidades do Mês</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Mês de Referência</Label>
                <Input type="month" value={generateMonth} onChange={e => setGenerateMonth(e.target.value)} />
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={generateAmount} onChange={e => setGenerateAmount(e.target.value)} />
              </div>
              <div>
                <Label>Dia de Vencimento</Label>
                <Input type="number" min="1" max="28" value={generateDueDay} onChange={e => setGenerateDueDay(e.target.value)} />
              </div>
              <Button onClick={generateDues} disabled={generating} className="w-full">
                {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Gerar para Todos os Membros
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <Label className="text-xs">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="overdue">Vencido</SelectItem>
                  <SelectItem value="exempt">Isento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Label className="text-xs">Mês</Label>
              <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : dues.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma mensalidade encontrada.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead>Mês Ref.</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dues.map(due => (
                  <TableRow key={due.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{(due as any).profile?.full_name || 'Sem nome'}</p>
                        <p className="text-xs text-muted-foreground">{(due as any).profile?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{formatMonth(due.reference_month)}</TableCell>
                    <TableCell>{formatCurrency(due.amount_cents)}</TableCell>
                    <TableCell>{format(new Date(due.due_date + 'T00:00:00'), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[due.status] || ''}>
                        {statusLabels[due.status] || due.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(due.status === 'pending' || due.status === 'overdue') && (
                        <Button size="sm" variant="outline" onClick={() => markAsPaid(due.id)}>
                          <Check className="w-3 h-3 mr-1" />
                          Pago
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDues;
