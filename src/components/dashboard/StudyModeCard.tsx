import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, BookOpen, Clock, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStudyMode, StudyMode } from '@/hooks/useStudyMode';

interface StudyModeCardProps {
  totalLessonsRemaining?: number;
}

export const StudyModeCard: React.FC<StudyModeCardProps> = ({ totalLessonsRemaining = 0 }) => {
  const navigate = useNavigate();
  const { mode, setMode, loading, saving, getModeInfo, isExpress } = useStudyMode();

  const currentModeInfo = getModeInfo(mode);
  const otherMode: StudyMode = mode === 'express' ? 'complete' : 'express';
  const otherModeInfo = getModeInfo(otherMode);

  // Calculate estimated time for remaining lessons
  const estimatedMinutes = totalLessonsRemaining * currentModeInfo.estimatedMinutes;
  const estimatedHours = Math.floor(estimatedMinutes / 60);
  const remainingMinutes = estimatedMinutes % 60;

  const formatEstimatedTime = () => {
    if (estimatedMinutes === 0) return 'Completo!';
    if (estimatedHours === 0) return `~${remainingMinutes} min`;
    if (remainingMinutes === 0) return `~${estimatedHours}h`;
    return `~${estimatedHours}h ${remainingMinutes}min`;
  };

  if (loading) {
    return (
      <div className="group relative bg-card rounded-2xl p-6 border border-border shadow-soft animate-pulse">
        <div className="h-12 w-12 rounded-xl bg-muted mb-4" />
        <div className="h-4 w-32 bg-muted mb-2" />
        <div className="h-3 w-24 bg-muted" />
      </div>
    );
  }

  return (
    <div className="group relative bg-card rounded-2xl p-6 border border-border shadow-soft hover:shadow-elevated transition-all duration-300 overflow-hidden">
      {/* Background glow effect */}
      <div className={`absolute inset-0 bg-gradient-to-br ${
        isExpress 
          ? 'from-amber-500/5 via-transparent to-orange-600/5' 
          : 'from-blue-500/5 via-transparent to-indigo-600/5'
      } opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
      
      <div className="relative z-10 flex flex-col gap-4 h-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 ${
              isExpress 
                ? 'bg-gradient-to-br from-amber-500 to-orange-600' 
                : 'bg-gradient-to-br from-blue-500 to-indigo-600'
            }`}>
              {isExpress ? (
                <Zap className="w-6 h-6 text-white" />
              ) : (
                <BookOpen className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <span className={`text-xs font-semibold uppercase tracking-wide ${
                isExpress ? 'text-amber-600' : 'text-blue-600'
              }`}>
                Modo de Estudo
              </span>
              <h3 className="font-bold text-foreground flex items-center gap-2">
                {currentModeInfo.label}
                {saving && (
                  <span className="text-xs text-muted-foreground">(salvando...)</span>
                )}
              </h3>
            </div>
          </div>
          
          <Badge variant="outline" className={`${
            isExpress 
              ? 'border-amber-300 text-amber-700 dark:text-amber-400' 
              : 'border-blue-300 text-blue-700 dark:text-blue-400'
          }`}>
            {currentModeInfo.description}
          </Badge>
        </div>

        {/* Estimated time */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Tempo estimado restante
            </p>
            <p className="text-xs text-muted-foreground">
              {totalLessonsRemaining} lições × {currentModeInfo.estimatedMinutes} min/lição
            </p>
          </div>
          <span className={`text-lg font-bold ${
            isExpress ? 'text-amber-600' : 'text-blue-600'
          }`}>
            {formatEstimatedTime()}
          </span>
        </div>

        {/* Mode comparison */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMode('complete')}
            disabled={saving}
            className={`p-3 rounded-lg border-2 transition-all ${
              mode === 'complete'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                : 'border-border hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/20'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className={`w-4 h-4 ${mode === 'complete' ? 'text-blue-600' : 'text-muted-foreground'}`} />
              <span className={`text-sm font-medium ${mode === 'complete' ? 'text-blue-700 dark:text-blue-400' : 'text-foreground'}`}>
                Completo
              </span>
            </div>
            <p className="text-xs text-muted-foreground text-left">
              7-9 exercícios • ~15 min/lição
            </p>
          </button>

          <button
            onClick={() => setMode('express')}
            disabled={saving}
            className={`p-3 rounded-lg border-2 transition-all ${
              mode === 'express'
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
                : 'border-border hover:border-amber-300 hover:bg-amber-50/50 dark:hover:bg-amber-950/20'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Zap className={`w-4 h-4 ${mode === 'express' ? 'text-amber-600' : 'text-muted-foreground'}`} />
              <span className={`text-sm font-medium ${mode === 'express' ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'}`}>
                Express
              </span>
            </div>
            <p className="text-xs text-muted-foreground text-left">
              4-5 exercícios • ~5 min/lição
            </p>
          </button>
        </div>

        {/* Info text */}
        <p className="text-xs text-muted-foreground text-center">
          {isExpress 
            ? 'Modo rápido com exercícios essenciais. Ideal para revisão.' 
            : 'Experiência completa com todos os tipos de exercício.'
          }
        </p>
      </div>
    </div>
  );
};

export default StudyModeCard;
