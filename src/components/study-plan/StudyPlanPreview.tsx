import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  Clock, 
  Target, 
  TrendingUp, 
  Download, 
  Sparkles,
  BookOpen,
  CalendarDays
} from 'lucide-react';
import { StudyPlanCalculation, StudyPlan, DayAvailability } from '@/hooks/useStudyPlan';
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

export const StudyPlanPreview: React.FC<StudyPlanPreviewProps> = ({
  studyPlan,
  calculation,
  calculating,
  onCalculate,
}) => {
  const handleDownloadCalendar = async () => {
    if (!studyPlan || !calculation) return;

    try {
      // Buscar lições pendentes
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
          Baseado na sua disponibilidade e progresso atual
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {calculating ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : calculation ? (
          <>
            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 text-center">
                <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold text-primary">
                  {calculation.totalPendingHours.toFixed(0)}h
                </p>
                <p className="text-xs text-muted-foreground">Tempo restante</p>
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
                  {calculation.totalPendingLessons}
                </p>
                <p className="text-xs text-muted-foreground">Lições pendentes</p>
              </div>
            </div>

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
                    <p className="font-medium text-sm mb-1">💡 Dica da IA</p>
                    <p className="text-sm text-muted-foreground">
                      {calculation.aiInsights}
                    </p>
                  </div>
                </div>
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};
