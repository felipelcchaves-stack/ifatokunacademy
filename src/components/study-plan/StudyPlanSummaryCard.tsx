import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, Calendar, ArrowRight, Clock, Sparkles } from 'lucide-react';
import { useStudyPlan } from '@/hooks/useStudyPlan';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const StudyPlanSummaryCard: React.FC = () => {
  const navigate = useNavigate();
  const { studyPlan, calculation, loading, calculating, calculatePlan } = useStudyPlan();

  useEffect(() => {
    // Calcular automaticamente se tem disponibilidade mas não tem cálculo recente
    if (studyPlan && studyPlan.availability.length > 0 && !calculation && !calculating) {
      calculatePlan();
    }
  }, [studyPlan, calculation, calculating, calculatePlan]);

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <Skeleton className="h-4 w-64 mb-2" />
          <Skeleton className="h-4 w-40" />
        </CardContent>
      </Card>
    );
  }

  // Se não tem plano configurado
  if (!studyPlan || studyPlan.availability.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 rounded-full p-3">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">
                Crie seu Plano de Estudos
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Defina sua disponibilidade semanal e descubra em quanto tempo você pode completar o curso.
              </p>
              <Button 
                onClick={() => navigate('/settings/study-plan')}
                size="sm"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Configurar Plano
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Se tem plano mas está calculando
  if (calculating) {
    return (
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Calculando seu plano...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Tem plano e cálculo
  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 rounded-full p-3">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">
                Seu Plano de Estudos
              </h3>
              {calculation && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Conclusão estimada:{' '}
                    <span className="font-medium text-foreground">
                      {format(new Date(calculation.estimatedCompletionDate), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {calculation.hoursPerWeek.toFixed(1)}h/semana • {calculation.sessionsPerWeek} sessões
                  </p>
                </div>
              )}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/settings/study-plan')}
          >
            Ver detalhes
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
