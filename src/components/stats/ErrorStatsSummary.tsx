import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Type, 
  ArrowLeftRight, 
  Minus, 
  Plus, 
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { AggregatedErrorStats } from '@/hooks/useErrorStats';

interface ErrorStatsSummaryProps {
  stats: AggregatedErrorStats;
}

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
  percentage?: number;
}

const StatCard: React.FC<StatCardProps> = ({ icon, value, label, color, percentage }) => (
  <Card className="border-none shadow-sm">
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground truncate">{label}</p>
        </div>
        {percentage !== undefined && percentage > 0 && (
          <div className="text-right">
            <span className="text-sm font-medium text-muted-foreground">
              {percentage.toFixed(0)}%
            </span>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

export const ErrorStatsSummary: React.FC<ErrorStatsSummaryProps> = ({ stats }) => {
  const total = stats.totalErrors;
  
  const getPercentage = (value: number) => total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <StatCard
        icon={<AlertCircle className="w-5 h-5 text-primary" />}
        value={stats.totalErrors}
        label="Total de Erros"
        color="bg-primary/10"
      />
      <StatCard
        icon={<Type className="w-5 h-5 text-amber-600" />}
        value={stats.accentErrors}
        label="Acentuação"
        color="bg-amber-100 dark:bg-amber-900/30"
        percentage={getPercentage(stats.accentErrors)}
      />
      <StatCard
        icon={<ArrowLeftRight className="w-5 h-5 text-purple-600" />}
        value={stats.wordSwapErrors}
        label="Palavras Trocadas"
        color="bg-purple-100 dark:bg-purple-900/30"
        percentage={getPercentage(stats.wordSwapErrors)}
      />
      <StatCard
        icon={<Minus className="w-5 h-5 text-red-600" />}
        value={stats.omissionErrors}
        label="Omissões"
        color="bg-red-100 dark:bg-red-900/30"
        percentage={getPercentage(stats.omissionErrors)}
      />
      <StatCard
        icon={<Plus className="w-5 h-5 text-cyan-600" />}
        value={stats.insertionErrors}
        label="Inserções"
        color="bg-cyan-100 dark:bg-cyan-900/30"
        percentage={getPercentage(stats.insertionErrors)}
      />
      <StatCard
        icon={<HelpCircle className="w-5 h-5 text-gray-600" />}
        value={stats.otherErrors}
        label="Outros"
        color="bg-gray-100 dark:bg-gray-800/50"
        percentage={getPercentage(stats.otherErrors)}
      />
    </div>
  );
};

export default ErrorStatsSummary;
