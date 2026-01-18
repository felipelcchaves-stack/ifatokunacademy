import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { ErrorStatsRecord } from '@/hooks/useErrorStats';
import { format, subDays, startOfDay, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ErrorTrendChartProps {
  errorStats: ErrorStatsRecord[];
}

const COLORS = {
  accentErrors: '#f59e0b',
  wordSwapErrors: '#8b5cf6',
  omissionErrors: '#ef4444',
  insertionErrors: '#06b6d4',
  otherErrors: '#6b7280'
};

export const ErrorTrendChart: React.FC<ErrorTrendChartProps> = ({ errorStats }) => {
  const chartData = useMemo(() => {
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStart = startOfDay(date);
      const dateEnd = startOfDay(subDays(date, -1));
      
      const dayStats = errorStats.filter(stat => {
        const statDate = new Date(stat.last_review_at || stat.created_at);
        return isAfter(statDate, dateStart) && isBefore(statDate, dateEnd);
      });
      
      const daySummary = dayStats.reduce((acc, stat) => ({
        accentErrors: acc.accentErrors + stat.accent_errors,
        wordSwapErrors: acc.wordSwapErrors + stat.word_swap_errors,
        omissionErrors: acc.omissionErrors + stat.omission_errors,
        insertionErrors: acc.insertionErrors + stat.insertion_errors,
        otherErrors: acc.otherErrors + stat.other_errors
      }), {
        accentErrors: 0,
        wordSwapErrors: 0,
        omissionErrors: 0,
        insertionErrors: 0,
        otherErrors: 0
      });
      
      data.push({
        date: format(date, 'EEE', { locale: ptBR }),
        fullDate: format(date, 'dd/MM', { locale: ptBR }),
        ...daySummary
      });
    }
    
    return data;
  }, [errorStats]);

  const hasData = chartData.some(d => 
    d.accentErrors > 0 || d.wordSwapErrors > 0 || d.omissionErrors > 0 || 
    d.insertionErrors > 0 || d.otherErrors > 0
  );

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Tendência de Erros (7 dias)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <p className="text-muted-foreground text-center">
            Sem dados suficientes para mostrar tendência.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Tendência de Erros (7 dias)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
              />
              <YAxis allowDecimals={false} />
              <Tooltip 
                labelFormatter={(value, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.fullDate;
                  }
                  return value;
                }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    accentErrors: 'Acentuação',
                    wordSwapErrors: 'Trocas',
                    omissionErrors: 'Omissões',
                    insertionErrors: 'Inserções',
                    otherErrors: 'Outros'
                  };
                  return [value, labels[name] || name];
                }}
              />
              <Legend 
                formatter={(value: string) => {
                  const labels: Record<string, string> = {
                    accentErrors: 'Acentuação',
                    wordSwapErrors: 'Trocas',
                    omissionErrors: 'Omissões',
                    insertionErrors: 'Inserções',
                    otherErrors: 'Outros'
                  };
                  return labels[value] || value;
                }}
              />
              <Bar 
                dataKey="accentErrors" 
                stackId="a" 
                fill={COLORS.accentErrors} 
                name="accentErrors"
              />
              <Bar 
                dataKey="wordSwapErrors" 
                stackId="a" 
                fill={COLORS.wordSwapErrors}
                name="wordSwapErrors" 
              />
              <Bar 
                dataKey="omissionErrors" 
                stackId="a" 
                fill={COLORS.omissionErrors}
                name="omissionErrors" 
              />
              <Bar 
                dataKey="insertionErrors" 
                stackId="a" 
                fill={COLORS.insertionErrors}
                name="insertionErrors" 
              />
              <Bar 
                dataKey="otherErrors" 
                stackId="a" 
                fill={COLORS.otherErrors}
                name="otherErrors" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default ErrorTrendChart;
