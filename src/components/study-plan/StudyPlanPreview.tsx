import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Clock, 
  Target, 
  TrendingUp, 
  Download, 
  Sparkles,
  BookOpen,
  CalendarDays,
  Brain,
  RefreshCw,
  GraduationCap
} from 'lucide-react';
import { StudyPlanCalculation, StudyPlan } from '@/hooks/useStudyPlan';
import { downloadICSFile, generateStudySessions, StudyPlanCalendarData } from '@/lib/calendarExport';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StudyPlanPreviewProps {
  studyPlan: StudyPlan | null;
  calculation: StudyPlanCalculation | null;
  calculating: boolean;
  onCalculate: () => void;
}

const exerciseTypeLabels: Record<string, string> = {
  reading: 'Leitura',
  memorization: 'Memorização',
  flashcard: 'Flash Cards',
  quiz: 'Quiz',
  drag_drop: 'Arrastar e Soltar',
  fill_columns: 'Preencher Colunas',
  video: 'Vídeo Aulas',
};

const exerciseTypeIcons: Record<string, React.ReactNode> = {
  reading: <BookOpen className="h-4 w-4" />,
  memorization: <Brain className="h-4 w-4" />,
  flashcard: <RefreshCw className="h-4 w-4" />,
  quiz: <GraduationCap className="h-4 w-4" />,
  drag_drop: <Target className="h-4 w-4" />,
  fill_columns: <Calendar className="h-4 w-4" />,
  video: <Clock className="h-4 w-4" />,
};

export const StudyPlanPreview: React.FC<StudyPlanPreviewProps> = ({
  studyPlan,
  calculation,
  calculating,
  onCalculate,
}) => {
  const handleDownloadCalendar = async () => {
    if (!studyPlan || !calculation) return;

    try {
      const { data: lessons } = await supabase
        .from('lessons')
        .select(`
          id,
          title,
          duration_minutes,
          module_id,
          modules!inner(title)
        `)
        .eq('is_published', true)
        .order('display_order');

      if (!lessons) return;

      const formattedLessons = lessons.map((l: any) => ({
        id: l.id,
        title: l.title,
        moduleTitle: l.modules?.title || 'Módulo',
        durationMinutes: l.duration_minutes || 30,
      }));

      const sessions = generateStudySessions(
        studyPlan.availability,
        formattedLessons,
        Math.min(calculation.weeksToComplete, 12)
      );

      const calendarData: StudyPlanCalendarData = {
        sessions,
        planName: 'Plano de Estudos - Offe Orunmila Learning',
      };

      downloadICSFile(calendarData, 'plano-estudos-offe-orunmila.ics');
    } catch (error) {
      console.error('Error generating calendar:', error);
    }
  };

  if (!studyPlan || studyPlan.availability.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Seu Plano de Estudos
          </CardTitle>
          <CardDescription>
            Configure sua disponibilidade para gerar seu plano personalizado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Defina sua disponibilidade semanal para visualizar seu plano de estudos.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Seu Plano de Estudos Personalizado
        </CardTitle>
        <CardDescription>
          Baseado na sua disponibilidade, tipo de conteúdo e ciclos de memorização
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {calculating ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : calculation ? (
          <>
            {/* Cards de Estatísticas Principais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 text-center">
                <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold text-primary">
                  {calculation.totalPendingHours.toFixed(0)}h
                </p>
                <p className="text-xs text-muted-foreground">Tempo total</p>
              </div>
              <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-lg p-4 text-center">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-accent-foreground" />
                <p className="text-2xl font-bold">
                  {calculation.hoursPerWeek.toFixed(1)}h
                </p>
                <p className="text-xs text-muted-foreground">Horas/semana</p>
              </div>
              <div className="bg-gradient-to-br from-secondary/30 to-secondary/10 rounded-lg p-4 text-center">
                <CalendarDays className="h-6 w-6 mx-auto mb-2 text-secondary-foreground" />
                <p className="text-2xl font-bold">
                  {calculation.weeksToComplete}
                </p>
                <p className="text-xs text-muted-foreground">Semanas</p>
              </div>
              <div className="bg-gradient-to-br from-muted to-muted/50 rounded-lg p-4 text-center">
                <BookOpen className="h-6 w-6 mx-auto mb-2" />
                <p className="text-2xl font-bold">
                  {calculation.pendingExercisesCount}
                </p>
                <p className="text-xs text-muted-foreground">Exercícios</p>
              </div>
            </div>

            {/* Breakdown do Tempo */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Distribuição do Tempo de Estudo
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Primeira exposição ao conteúdo</span>
                  <span className="font-medium">{calculation.firstExposureHours.toFixed(0)}h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Revisões para memorização</span>
                  <span className="font-medium">{calculation.reviewHours.toFixed(0)}h</span>
                </div>
                <Progress 
                  value={(calculation.firstExposureHours / calculation.totalPendingHours) * 100} 
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{((calculation.firstExposureHours / calculation.totalPendingHours) * 100).toFixed(0)}% conteúdo novo</span>
                  <span>{((calculation.reviewHours / calculation.totalPendingHours) * 100).toFixed(0)}% revisões</span>
                </div>
              </div>
              {calculation.itemsInSpacedRepetition > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  📚 {calculation.itemsInSpacedRepetition} itens já em repetição espaçada
                </p>
              )}
            </div>

            {/* Breakdown por Tipo de Exercício */}
            {calculation.exerciseBreakdown.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Tempo por Tipo de Conteúdo</h4>
                <div className="grid gap-2">
                  {calculation.exerciseBreakdown.slice(0, 5).map((eb) => (
                    <div key={eb.type} className="flex items-center justify-between text-sm bg-muted/20 rounded-md p-2">
                      <div className="flex items-center gap-2">
                        <span className="text-primary">
                          {exerciseTypeIcons[eb.type] || <BookOpen className="h-4 w-4" />}
                        </span>
                        <span>{exerciseTypeLabels[eb.type] || eb.type}</span>
                        <Badge variant="secondary" className="text-xs">
                          {eb.count}
                        </Badge>
                      </div>
                      <span className="font-medium">~{eb.totalHours.toFixed(0)}h</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data de Conclusão */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg p-6 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-3" />
              <p className="text-sm uppercase tracking-wide opacity-80 mb-1">
                Conclusão Estimada
              </p>
              <p className="text-3xl font-bold">
                {format(new Date(calculation.estimatedCompletionDate), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              <Badge variant="secondary" className="mt-3">
                {calculation.sessionsPerWeek} sessões por semana
              </Badge>
            </div>

            {/* Insights da IA */}
            {calculation.aiInsights && (
              <div className="bg-muted/50 border border-border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 rounded-full p-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm mb-1">💡 Análise do seu Plano</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {calculation.aiInsights}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Aviso sobre tempo de memorização */}
            {calculation.reviewHours > calculation.firstExposureHours && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  ⚠️ <strong>Nota:</strong> A maior parte do tempo ({calculation.reviewHours.toFixed(0)}h) é dedicada a revisões. 
                  Isso é normal para memorização de conteúdo sagrado - a repetição espaçada é essencial para fixação permanente.
                </p>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleDownloadCalendar}
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar para Calendário (.ics)
              </Button>
              <Button 
                variant="secondary" 
                className="flex-1"
                onClick={onCalculate}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Recalcular Plano
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <Button onClick={onCalculate} size="lg">
              <Sparkles className="h-4 w-4 mr-2" />
              Gerar Plano de Estudos
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              O cálculo considera tipo de exercício, ciclos de memorização e sua performance
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
