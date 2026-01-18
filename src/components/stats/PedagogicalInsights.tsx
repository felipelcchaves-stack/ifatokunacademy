import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  BookOpen, 
  Target, 
  AlertCircle,
  CheckCircle,
  TrendingDown
} from 'lucide-react';
import { AggregatedErrorStats } from '@/hooks/useErrorStats';

interface PedagogicalInsightsProps {
  stats: AggregatedErrorStats;
}

interface Insight {
  type: 'success' | 'warning' | 'info';
  icon: React.ReactNode;
  title: string;
  description: string;
  recommendation: string;
}

export const PedagogicalInsights: React.FC<PedagogicalInsightsProps> = ({ stats }) => {
  const insights: Insight[] = [];
  const total = stats.totalErrors;
  
  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Insights Pedagógicos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
          <p className="text-center font-medium">Excelente trabalho!</p>
          <p className="text-sm text-muted-foreground text-center mt-2">
            Continue praticando para manter seu desempenho.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Analyze accent errors
  const accentPercentage = (stats.accentErrors / total) * 100;
  if (accentPercentage >= 30) {
    insights.push({
      type: 'info',
      icon: <BookOpen className="w-5 h-5 text-amber-600" />,
      title: 'Foco em Acentuação',
      description: `${accentPercentage.toFixed(0)}% dos seus erros são de acentuação.`,
      recommendation: 'Isso é comum no aprendizado de Yorubá! Os acentos mudam significados, mas para memorização de contexto, o importante é que você está lembrando as palavras certas.'
    });
  }

  // Analyze omission errors
  const omissionPercentage = (stats.omissionErrors / total) * 100;
  if (omissionPercentage >= 25) {
    insights.push({
      type: 'warning',
      icon: <TrendingDown className="w-5 h-5 text-red-500" />,
      title: 'Palavras Omitidas',
      description: `${omissionPercentage.toFixed(0)}% dos erros são por omissão de palavras.`,
      recommendation: 'Tente dividir textos longos em partes menores. Use o modo "Chunking" para memorizar por blocos e depois conectar.'
    });
  }

  // Analyze word swap errors
  const swapPercentage = (stats.wordSwapErrors / total) * 100;
  if (swapPercentage >= 20) {
    insights.push({
      type: 'warning',
      icon: <AlertCircle className="w-5 h-5 text-purple-500" />,
      title: 'Ordem das Palavras',
      description: `${swapPercentage.toFixed(0)}% dos erros são trocas de ordem.`,
      recommendation: 'A ordem das palavras em Yorubá segue padrões específicos. Pratique com o modo "Scaffold" que revela o texto gradualmente, ajudando a fixar a estrutura.'
    });
  }

  // Analyze insertion errors
  const insertionPercentage = (stats.insertionErrors / total) * 100;
  if (insertionPercentage >= 15) {
    insights.push({
      type: 'info',
      icon: <Target className="w-5 h-5 text-cyan-500" />,
      title: 'Palavras Extras',
      description: `${insertionPercentage.toFixed(0)}% dos erros são inserções de palavras.`,
      recommendation: 'Você está adicionando palavras que não estão no original. Releia o texto original com atenção antes de tentar reproduzir.'
    });
  }

  // General success insight
  if (stats.reviewCount >= 10 && total < stats.reviewCount * 2) {
    insights.push({
      type: 'success',
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      title: 'Progresso Sólido',
      description: `Você completou ${stats.reviewCount} revisões com média baixa de erros.`,
      recommendation: 'Seu desempenho está ótimo! Continue mantendo a regularidade nos estudos.'
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: 'info',
      icon: <Lightbulb className="w-5 h-5 text-primary" />,
      title: 'Continue Praticando',
      description: 'Seus erros estão bem distribuídos entre os tipos.',
      recommendation: 'Mantenha a prática regular. Com o tempo, você verá uma redução natural em todos os tipos de erro.'
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="w-5 h-5" />
          Insights Pedagógicos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map((insight, index) => (
          <div 
            key={index} 
            className={`p-4 rounded-lg border ${
              insight.type === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' :
              insight.type === 'warning' ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' :
              'bg-muted/50 border-border'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{insight.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium">{insight.title}</h4>
                  <Badge variant={
                    insight.type === 'success' ? 'default' :
                    insight.type === 'warning' ? 'destructive' : 'secondary'
                  } className="text-xs">
                    {insight.type === 'success' ? 'Ótimo' :
                     insight.type === 'warning' ? 'Atenção' : 'Dica'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {insight.description}
                </p>
                <p className="text-sm">
                  💡 <strong>Recomendação:</strong> {insight.recommendation}
                </p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PedagogicalInsights;
