import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { getErrorTypeLabel, getErrorTypeEmoji } from '@/lib/errorAnalysis';
import { AggregatedErrorStats } from '@/hooks/useErrorStats';

interface ErrorTypeDistributionProps {
  stats: AggregatedErrorStats;
}

const COLORS = {
  accentErrors: 'hsl(45, 93%, 47%)',      // Amber
  wordSwapErrors: 'hsl(262, 83%, 58%)',   // Purple
  omissionErrors: 'hsl(0, 84%, 60%)',     // Red
  insertionErrors: 'hsl(199, 89%, 48%)',  // Cyan
  otherErrors: 'hsl(215, 16%, 47%)'       // Gray
};

export const ErrorTypeDistribution: React.FC<ErrorTypeDistributionProps> = ({ stats }) => {
  const data = [
    { name: getErrorTypeLabel('accentErrors'), value: stats.accentErrors, key: 'accentErrors' },
    { name: getErrorTypeLabel('wordSwapErrors'), value: stats.wordSwapErrors, key: 'wordSwapErrors' },
    { name: getErrorTypeLabel('omissionErrors'), value: stats.omissionErrors, key: 'omissionErrors' },
    { name: getErrorTypeLabel('insertionErrors'), value: stats.insertionErrors, key: 'insertionErrors' },
    { name: getErrorTypeLabel('otherErrors'), value: stats.otherErrors, key: 'otherErrors' },
  ].filter(d => d.value > 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Tipos de Erros
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <p className="text-muted-foreground text-center">
            Nenhum erro registrado ainda.
          </p>
          <p className="text-sm text-muted-foreground text-center mt-2">
            Complete exercícios de memorização para ver a análise de erros.
          </p>
        </CardContent>
      </Card>
    );
  }

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, key }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight={600}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Distribuição por Tipo de Erro
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                labelLine={false}
                label={renderCustomizedLabel}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[entry.key as keyof typeof COLORS]} 
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${value} erros`,
                  name
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend with emojis */}
        <div className="flex flex-wrap justify-center gap-3 mt-4">
          {data.map((entry, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: COLORS[entry.key as keyof typeof COLORS] }}
              />
              <span className="text-sm text-muted-foreground">
                {getErrorTypeEmoji(entry.key)} {entry.name}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ErrorTypeDistribution;
