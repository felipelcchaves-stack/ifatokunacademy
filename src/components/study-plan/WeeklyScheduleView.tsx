import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock } from 'lucide-react';
import { DayAvailability } from '@/hooks/useStudyPlan';

const DAYS_OF_WEEK_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface WeeklyScheduleViewProps {
  availability: DayAvailability[];
}

export const WeeklyScheduleView: React.FC<WeeklyScheduleViewProps> = ({
  availability,
}) => {
  const getDaySlots = (day: number) => {
    return availability.find(a => a.day === day)?.slots || [];
  };

  const formatTime = (time: string) => {
    return time.replace(':', 'h');
  };

  if (availability.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          Cronograma Semanal
        </CardTitle>
        <CardDescription className="text-xs">
          Suas sessões de estudo programadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {DAYS_OF_WEEK_SHORT.map((day, index) => {
            const slots = getDaySlots(index);
            const hasSlots = slots.length > 0;

            return (
              <div
                key={index}
                className={`text-center p-2 rounded-lg transition-colors ${
                  hasSlots
                    ? 'bg-primary/10 border border-primary/20'
                    : 'bg-muted/30'
                }`}
              >
                <p
                  className={`text-xs font-medium mb-1 ${
                    hasSlots ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {day}
                </p>
                {hasSlots ? (
                  <div className="space-y-1">
                    {slots.map((slot, slotIndex) => (
                      <div key={slotIndex} className="text-[10px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5 inline-block mr-0.5" />
                        {formatTime(slot.start)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground">-</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Resumo */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {availability.reduce((sum, day) => sum + day.slots.length, 0)} sessões/semana
          </Badge>
          <Badge variant="outline" className="text-xs">
            <CalendarDays className="h-3 w-3 mr-1" />
            {availability.length} dias ativos
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
