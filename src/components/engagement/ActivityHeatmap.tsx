import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DayActivity {
  date: string;
  count: number;
}

export const ActivityHeatmap: React.FC = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch all user progress for the last year
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const { data, error } = await supabase
          .from('user_progress')
          .select('completed_at')
          .eq('user_id', user.id)
          .gte('completed_at', oneYearAgo.toISOString());

        if (error) throw error;

        // Count activities per day
        const activityMap = new Map<string, number>();
        data?.forEach((item) => {
          const date = new Date(item.completed_at).toISOString().split('T')[0];
          activityMap.set(date, (activityMap.get(date) || 0) + 1);
        });

        // Also fetch spaced repetition reviews
        const { data: reviewData, error: reviewError } = await supabase
          .from('spaced_repetition_items')
          .select('updated_at')
          .eq('user_id', user.id)
          .gte('updated_at', oneYearAgo.toISOString());

        if (!reviewError && reviewData) {
          reviewData.forEach((item) => {
            const date = new Date(item.updated_at).toISOString().split('T')[0];
            activityMap.set(date, (activityMap.get(date) || 0) + 1);
          });
        }

        setActivities(activityMap);
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [user]);

  // Generate last 365 days
  const generateDays = () => {
    const days: { date: Date; dateStr: string }[] = [];
    const today = new Date();
    
    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push({
        date,
        dateStr: date.toISOString().split('T')[0],
      });
    }
    return days;
  };

  const days = generateDays();
  
  // Group by weeks
  const weeks: typeof days[] = [];
  let currentWeek: typeof days = [];
  
  days.forEach((day, index) => {
    const dayOfWeek = day.date.getDay();
    
    if (index === 0) {
      // Fill empty days at start of first week
      for (let i = 0; i < dayOfWeek; i++) {
        currentWeek.push({ date: new Date(0), dateStr: '' });
      }
    }
    
    currentWeek.push(day);
    
    if (dayOfWeek === 6 || index === days.length - 1) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });

  const getIntensity = (count: number) => {
    if (count === 0) return 'bg-muted';
    if (count < 3) return 'bg-green-200 dark:bg-green-900';
    if (count < 6) return 'bg-green-400 dark:bg-green-700';
    if (count < 10) return 'bg-green-500 dark:bg-green-600';
    return 'bg-green-600 dark:bg-green-500';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const totalActiveDays = Array.from(activities.values()).filter(v => v > 0).length;
  const totalActivities = Array.from(activities.values()).reduce((a, b) => a + b, 0);

  if (loading) {
    return <div className="animate-pulse bg-muted rounded-lg h-32" />;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Atividade no Último Ano
          </span>
          <span className="text-xs text-muted-foreground font-normal">
            {totalActiveDays} dias ativos • {totalActivities} atividades
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-2">
          <TooltipProvider delayDuration={0}>
            <div className="flex gap-[2px] min-w-max">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[2px]">
                  {week.map((day, dayIndex) => {
                    const count = day.dateStr ? (activities.get(day.dateStr) || 0) : 0;
                    const isValidDay = day.dateStr !== '';
                    
                    return (
                      <Tooltip key={dayIndex}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "w-3 h-3 rounded-sm transition-colors",
                              isValidDay ? getIntensity(count) : "bg-transparent",
                              isValidDay && "cursor-pointer hover:ring-1 hover:ring-primary"
                            )}
                          />
                        </TooltipTrigger>
                        {isValidDay && (
                          <TooltipContent side="top" className="text-xs">
                            <p className="font-medium">{formatDate(day.dateStr)}</p>
                            <p className="text-muted-foreground">
                              {count} {count === 1 ? 'atividade' : 'atividades'}
                            </p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </div>
          </TooltipProvider>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-end gap-1 mt-2 text-xs text-muted-foreground">
          <span>Menos</span>
          <div className="w-3 h-3 rounded-sm bg-muted" />
          <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900" />
          <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-700" />
          <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-600" />
          <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-500" />
          <span>Mais</span>
        </div>
      </CardContent>
    </Card>
  );
};
