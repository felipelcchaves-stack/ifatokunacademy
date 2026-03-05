import React, { useState, useEffect } from 'react';
import { AlertTriangle, Receipt, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface PendingDue {
  id: string;
  reference_month: string;
  amount_cents: number;
  status: string;
  due_date: string;
}

const DuesAlert: React.FC = () => {
  const { user } = useAuth();
  const { getOrgPath } = useOrgNavigate();
  const navigate = useNavigate();
  const [pendingDues, setPendingDues] = useState<PendingDue[]>([]);

  useEffect(() => {
    if (user) fetchPendingDues();
  }, [user]);

  const fetchPendingDues = async () => {
    try {
      const { data, error } = await supabase
        .from('member_dues' as any)
        .select('id, reference_month, amount_cents, status, due_date')
        .eq('user_id', user!.id)
        .in('status', ['pending', 'overdue'])
        .order('due_date', { ascending: true });

      if (error) throw error;
      setPendingDues((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching pending dues:', error);
    }
  };

  if (pendingDues.length === 0) return null;

  const hasOverdue = pendingDues.some(d => d.status === 'overdue');
  const totalCents = pendingDues.reduce((acc, d) => acc + d.amount_cents, 0);
  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  return (
    <Card className={`border-2 ${hasOverdue ? 'border-destructive/50 bg-destructive/5' : 'border-yellow-400/50 bg-yellow-50/50 dark:bg-yellow-900/10'}`}>
      <CardContent className="py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            {hasOverdue ? (
              <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0" />
            ) : (
              <Receipt className="w-6 h-6 text-yellow-600 flex-shrink-0" />
            )}
            <div>
              <p className="font-semibold text-foreground">
                {pendingDues.length === 1
                  ? 'Você tem 1 mensalidade pendente'
                  : `Você tem ${pendingDues.length} mensalidades pendentes`}
              </p>
              <p className="text-sm text-muted-foreground">
                Total: {formatCurrency(totalCents)}
                {hasOverdue && (
                  <Badge variant="destructive" className="ml-2 text-xs">Vencida</Badge>
                )}
              </p>
            </div>
          </div>
          <Button
            variant={hasOverdue ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => navigate(getOrgPath('/dues'))}
          >
            Ver Detalhes
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DuesAlert;
