import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Receipt, ArrowLeft, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Due {
  id: string;
  reference_month: string;
  amount_cents: number;
  status: string;
  due_date: string;
  paid_at: string | null;
  payment_method: string | null;
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

const MemberDuesView: React.FC = () => {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { user } = useAuth();
  const [dues, setDues] = useState<Due[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchDues();
  }, [user]);

  const fetchDues = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('member_dues' as any)
        .select('id, reference_month, amount_cents, status, due_date, paid_at, payment_method')
        .eq('user_id', user!.id)
        .order('reference_month', { ascending: false });

      if (error) throw error;
      setDues((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching dues:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  const formatMonth = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return format(date, 'MMMM/yyyy', { locale: ptBR });
  };

  const dashboardUrl = orgSlug ? `/org/${orgSlug}/dashboard` : '/dashboard';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4">
          <div className="mb-6">
            <Link to={dashboardUrl}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-3 mb-8">
            <Receipt className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Minhas Mensalidades</h1>
              <p className="text-muted-foreground">Histórico de pagamentos</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : dues.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma mensalidade registrada.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mês</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dues.map(due => (
                      <TableRow key={due.id}>
                        <TableCell className="capitalize font-medium">{formatMonth(due.reference_month)}</TableCell>
                        <TableCell>{formatCurrency(due.amount_cents)}</TableCell>
                        <TableCell>{format(new Date(due.due_date + 'T00:00:00'), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[due.status] || ''}>
                            {statusLabels[due.status] || due.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MemberDuesView;
