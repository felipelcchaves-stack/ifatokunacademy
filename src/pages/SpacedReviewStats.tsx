import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Brain, 
  Calendar, 
  CheckCircle, 
  TrendingUp,
  Target,
  Clock,
  Award,
  BarChart3,
  ArrowLeft,
  Flame,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ContentProtection from '@/components/ContentProtection';
import { useSpacedRepetition, SpacedRepetitionItem } from '@/hooks/useSpacedRepetition';
import { useErrorStats } from '@/hooks/useErrorStats';
import ErrorTypeDistribution from '@/components/stats/ErrorTypeDistribution';
import ErrorStatsSummary from '@/components/stats/ErrorStatsSummary';
import ErrorTrendChart from '@/components/stats/ErrorTrendChart';
import PedagogicalInsights from '@/components/stats/PedagogicalInsights';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { format, subDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = {
  mastered: '#22c55e',
  learning: '#f59e0b',
  needsPractice: '#ef4444',
  primary: '#8b5cf6',
  secondary: '#06b6d4'
};

const SpacedReviewStats: React.FC = () => {
  const navigate = useNavigate();
  const { allItems, dueCount, loading } = useSpacedRepetition();
  const { errorStats, aggregatedStats, loading: errorStatsLoading } = useErrorStats();

  // Calculate statistics
  const calculateStats = () => {
    if (allItems.length === 0) {
      return {
        totalItems: 0,
        masteredItems: 0,
        learningItems: 0,
        needsPracticeItems: 0,
        overallAccuracy: 0,
        totalReviews: 0,
        averageInterval: 0,
        streakDays: 0
      };
    }

    const masteredItems = allItems.filter(item => item.interval_days >= 16);
    const learningItems = allItems.filter(item => item.interval_days >= 4 && item.interval_days < 16);
    const needsPracticeItems = allItems.filter(item => item.interval_days < 4);

    const totalReviews = allItems.reduce((acc, item) => acc + item.total_reviews, 0);
    const correctReviews = allItems.reduce((acc, item) => acc + item.correct_reviews, 0);
    const overallAccuracy = totalReviews > 0 ? Math.round((correctReviews / totalReviews) * 100) : 0;
    
    const averageInterval = allItems.length > 0 
      ? Math.round(allItems.reduce((acc, item) => acc + item.interval_days, 0) / allItems.length)
      : 0;

    return {
      totalItems: allItems.length,
      masteredItems: masteredItems.length,
      learningItems: learningItems.length,
      needsPracticeItems: needsPracticeItems.length,
      overallAccuracy,
      totalReviews,
      averageInterval,
      streakDays: 0 // TODO: Implement streak calculation
    };
  };

  const stats = calculateStats();

  // Prepare pie chart data for mastery distribution
  const masteryData = [
    { name: 'Dominados', value: stats.masteredItems, color: COLORS.mastered },
    { name: 'Aprendendo', value: stats.learningItems, color: COLORS.learning },
    { name: 'Precisa Praticar', value: stats.needsPracticeItems, color: COLORS.needsPractice },
  ].filter(d => d.value > 0);

  // Prepare bar chart data for interval distribution
  const intervalBuckets = [
    { range: '1 dia', min: 1, max: 1 },
    { range: '2-3 dias', min: 2, max: 3 },
    { range: '4-7 dias', min: 4, max: 7 },
    { range: '8-15 dias', min: 8, max: 15 },
    { range: '16+ dias', min: 16, max: Infinity },
  ];

  const intervalData = intervalBuckets.map(bucket => ({
    range: bucket.range,
    count: allItems.filter(item => 
      item.interval_days >= bucket.min && item.interval_days <= bucket.max
    ).length
  }));

  // Prepare line chart data for upcoming reviews
  const upcomingReviewsData = [];
  for (let i = 0; i < 14; i++) {
    const date = subDays(new Date(), -i);
    const dateStart = startOfDay(date);
    const dateEnd = startOfDay(subDays(date, -1));
    
    const count = allItems.filter(item => {
      const reviewDate = new Date(item.next_review_at);
      return isAfter(reviewDate, dateStart) && isBefore(reviewDate, dateEnd);
    }).length;

    upcomingReviewsData.push({
      date: format(date, 'dd/MM', { locale: ptBR }),
      items: count
    });
  }

  // Accuracy by item
  const accuracyByItem = allItems
    .filter(item => item.total_reviews > 0)
    .map(item => ({
      text: item.item_text.substring(0, 30) + '...',
      accuracy: Math.round((item.correct_reviews / item.total_reviews) * 100),
      reviews: item.total_reviews
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 10);

  if (loading) {
    return (
      <ContentProtection>
        <div className="min-h-screen flex flex-col bg-background">
          <Header />
          <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Carregando estatísticas...</p>
            </div>
          </main>
          <Footer />
        </div>
      </ContentProtection>
    );
  }

  return (
    <ContentProtection>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex items-start justify-between">
              <div>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/review')}
                  className="mb-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar à Revisão
                </Button>
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-8 h-8 text-primary" />
                  <h1 className="font-serif text-3xl font-bold text-foreground">
                    Estatísticas de Revisão
                  </h1>
                </div>
                <p className="text-muted-foreground mt-2">
                  Acompanhe seu progresso e desempenho na repetição espaçada.
                </p>
              </div>
            </div>

            {allItems.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Brain className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h2 className="font-serif text-xl font-semibold mb-2">
                    Nenhum dado disponível
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Complete exercícios de memorização para ver suas estatísticas aqui.
                  </p>
                  <Button onClick={() => navigate('/dashboard')}>
                    Ir para o Dashboard
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-flex">
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Visão Geral
                  </TabsTrigger>
                  <TabsTrigger value="errors" className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Análise de Erros
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Brain className="w-6 h-6 text-primary mx-auto mb-1" />
                        <p className="text-3xl font-bold">{stats.totalItems}</p>
                        <p className="text-xs text-muted-foreground">Total de Itens</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Target className="w-6 h-6 text-green-500 mx-auto mb-1" />
                        <p className="text-3xl font-bold">{stats.overallAccuracy}%</p>
                        <p className="text-xs text-muted-foreground">Taxa de Acerto</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <TrendingUp className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                        <p className="text-3xl font-bold">{stats.totalReviews}</p>
                        <p className="text-xs text-muted-foreground">Total de Revisões</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Clock className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                        <p className="text-3xl font-bold">{dueCount}</p>
                        <p className="text-xs text-muted-foreground">Pendentes Hoje</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Charts Row 1 */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Mastery Distribution Pie Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Award className="w-5 h-5" />
                          Distribuição de Domínio
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {masteryData.length > 0 ? (
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={masteryData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="value"
                                  label={({ name, value }) => `${name}: ${value}`}
                                >
                                  {masteryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <p className="text-center text-muted-foreground py-8">
                            Sem dados suficientes
                          </p>
                        )}
                        <div className="flex justify-center gap-4 mt-4">
                          {masteryData.map((entry, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-sm text-muted-foreground">{entry.name}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Interval Distribution Bar Chart */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Calendar className="w-5 h-5" />
                          Distribuição de Intervalos
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={intervalData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                              <YAxis allowDecimals={false} />
                              <Tooltip />
                              <Bar dataKey="count" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Upcoming Reviews Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Revisões Próximas (14 dias)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={upcomingReviewsData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Line 
                              type="monotone" 
                              dataKey="items" 
                              stroke={COLORS.primary} 
                              strokeWidth={2}
                              dot={{ fill: COLORS.primary }}
                              name="Itens"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Items with Lowest Accuracy */}
                  {accuracyByItem.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Flame className="w-5 h-5 text-orange-500" />
                          Itens que Precisam de Mais Atenção
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {accuracyByItem.map((item, index) => (
                            <div key={index} className="flex items-center gap-4">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.text}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.reviews} revisões
                                </p>
                              </div>
                              <div className="flex items-center gap-2 w-32">
                                <Progress 
                                  value={item.accuracy} 
                                  className="h-2 flex-1"
                                />
                                <span className={`text-sm font-medium ${
                                  item.accuracy >= 80 ? 'text-green-600' :
                                  item.accuracy >= 50 ? 'text-amber-600' : 'text-red-600'
                                }`}>
                                  {item.accuracy}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="errors" className="space-y-6">
                  {/* Error Stats Summary */}
                  <ErrorStatsSummary stats={aggregatedStats} />

                  {/* Error Charts */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <ErrorTypeDistribution stats={aggregatedStats} />
                    <ErrorTrendChart errorStats={errorStats} />
                  </div>

                  {/* Pedagogical Insights */}
                  <PedagogicalInsights stats={aggregatedStats} />
                </TabsContent>

                {/* Action Button */}
                <div className="mt-8 text-center">
                  <Button 
                    onClick={() => navigate('/review')}
                    className="gradient-gold text-secondary shadow-gold"
                    size="lg"
                  >
                    <Brain className="w-5 h-5 mr-2" />
                    {dueCount > 0 
                      ? `Revisar ${dueCount} ${dueCount === 1 ? 'item' : 'itens'} pendentes`
                      : 'Voltar à Revisão'
                    }
                  </Button>
                </div>
              </Tabs>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </ContentProtection>
  );
};

export default SpacedReviewStats;
