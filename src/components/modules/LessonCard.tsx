import React, { forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, Lock, Play, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  display_order: number;
  is_published: boolean;
  exercises_count?: number;
  completed?: boolean;
}

interface LessonCardProps {
  lesson: Lesson;
  index: number;
  moduleId: string;
  isLocked: boolean;
  progress?: number;
  phase1Complete?: boolean;
  phase1Total?: number;
  phase1Completed?: number;
  unlockReason?: string;
  previousLessonProgress?: number;
}

const LessonCard = forwardRef<HTMLDivElement, LessonCardProps>(
  ({ lesson, index, moduleId, isLocked, progress = 0, phase1Complete = false, phase1Total = 0, phase1Completed = 0, unlockReason, previousLessonProgress }, ref) => {
    const navigate = useNavigate();
    const { getOrgPath } = useOrgNavigate();

    const formatDuration = (minutes: number | null) => {
      if (!minutes) return '30 min';
      if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
      }
      return `${minutes} min`;
    };

    return (
      <div 
        ref={ref}
        className={`
          bg-card rounded-xl p-6 border border-border transition-all duration-300
          ${isLocked ? 'opacity-60' : 'hover:shadow-soft hover:border-primary/30 cursor-pointer'}
        `}
        onClick={() => !isLocked && navigate(getOrgPath(`/module/${moduleId}/lesson/${lesson.id}`))}
      >
        <div className="flex items-center gap-4">
          <div className={`
            w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
            ${lesson.completed ? 'bg-green-100 text-green-600' : isLocked ? 'bg-muted text-muted-foreground' : 'gradient-gold text-secondary shadow-gold'}
          `}>
            {lesson.completed ? (
              <CheckCircle className="w-6 h-6" />
            ) : isLocked ? (
              <Lock className="w-5 h-5" />
            ) : (
              <span className="font-semibold">{index + 1}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground mb-1">{lesson.title}</h3>
            {isLocked && unlockReason ? (
              <div className="space-y-1">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {unlockReason}
                </p>
                {previousLessonProgress !== undefined && previousLessonProgress > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${previousLessonProgress}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{previousLessonProgress}%</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {lesson.description || 'Sem descrição'}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(lesson.duration_minutes)}</span>
            </div>
            
            {!isLocked && !lesson.completed && (
              <Button size="sm" className="gradient-gold text-secondary shadow-gold">
                <Play className="w-4 h-4 mr-1" />
                Iniciar
              </Button>
            )}
            
            {lesson.completed && (
              <Button size="sm" variant="outline">
                Revisar
              </Button>
            )}
          </div>
        </div>

        {lesson.exercises_count && lesson.exercises_count > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  {lesson.exercises_count} exercício{lesson.exercises_count > 1 ? 's' : ''}
                </p>
                
                {/* Phase badges */}
                {phase1Complete && !lesson.completed && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Fase 1 ✓
                  </Badge>
                )}
                {phase1Complete && !lesson.completed && (
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                    Fase 2 pendente
                  </Badge>
                )}
              </div>
              
              {progress > 0 && progress < 100 && (
                <div className="flex items-center gap-2">
                  {phase1Total > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Fase 1: {phase1Completed}/{phase1Total}
                    </span>
                  )}
                  <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{progress}%</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

LessonCard.displayName = 'LessonCard';

export default LessonCard;
