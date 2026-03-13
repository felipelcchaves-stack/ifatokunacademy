import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, BookOpen, Clock, ChevronRight, Lock, Sparkles, AlertCircle, Brain } from 'lucide-react';
import { Module } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { cn } from '@/lib/utils';

interface ModuleCardProps {
  module: Module;
  variant?: 'default' | 'compact' | 'hero';
  isLocked?: boolean;
  unlockRequirement?: string;
  retentionStatus?: 'fresh' | 'due_soon' | 'overdue' | 'not_started';
  retentionScore?: number;
  hasPendingPhase2?: boolean;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ 
  module, 
  variant = 'default',
  isLocked = false,
  unlockRequirement,
  retentionStatus = 'not_started',
  retentionScore,
  hasPendingPhase2 = false,
}) => {
  const navigate = useNavigate();
  const { getOrgPath } = useOrgNavigate();

  const handleClick = () => {
    if (!isLocked) {
      navigate(getOrgPath(`/module/${module.id}`));
    }
  };

  const getLevelGradient = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'akapo': return 'from-forest-500 to-forest-700';
      case 'awo': return 'from-sacred-500 to-sacred-700';
      case 'oluwo': return 'from-purple-600 to-purple-800';
      default: return module.color || 'from-forest-500 to-forest-700';
    }
  };

  const getLevelBadgeColor = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'akapo': return 'bg-forest-500/90';
      case 'awo': return 'bg-sacred-500/90';
      case 'oluwo': return 'bg-purple-600/90';
      default: return 'bg-forest-500/90';
    }
  };

  // Determine if this is a thematic module with specific lock reason
  const isThematicLocked = isLocked && module.type === 'thematic';
  const lockMessage = unlockRequirement || 'Bloqueado';
  
  // Check if module is completed (has progress = 100)
  const isCompleted = module.progress === 100;

  // Retention badge component
  const RetentionBadge = () => {
    if (!isCompleted || retentionStatus === 'not_started') return null;
    
    const getRetentionConfig = () => {
      switch (retentionStatus) {
        case 'fresh':
          return {
            icon: '💚',
            text: 'Memória Ativa',
            className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
          };
        case 'due_soon':
          return {
            icon: '💛',
            text: 'Revisar em Breve',
            className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
          };
        case 'overdue':
          return {
            icon: '❤️',
            text: 'Risco de Esquecimento',
            className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
          };
        default:
          return null;
      }
    };
    
    const config = getRetentionConfig();
    if (!config) return null;
    
    return (
      <div 
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80 transition-opacity",
          config.className
        )}
        onClick={(e) => {
          e.stopPropagation();
          navigate(getOrgPath(`/module/${module.id}/retention`));
        }}
      >
        <span>{config.icon}</span>
        <span>{config.text}</span>
        {retentionScore !== undefined && (
          <span className="opacity-70">({retentionScore}%)</span>
        )}
        <Brain className="w-3 h-3 ml-0.5" />
      </div>
    );
  };

  if (variant === 'compact') {
    return (
      <div 
        className={cn(
          "group bg-card rounded-xl p-4 shadow-soft transition-all duration-300 border",
          module.image 
            ? "border-sacred-300/30 hover:border-sacred-400/50" 
            : "border-border hover:border-primary/30",
          isLocked 
            ? "opacity-60 cursor-not-allowed" 
            : "hover:shadow-elevated cursor-pointer"
        )}
        onClick={handleClick}
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden",
            isLocked ? "bg-muted" : `bg-gradient-to-br ${getLevelGradient(module.level)}`
          )}>
            {module.image ? (
              <img src={module.image} alt={module.title} className="w-full h-full object-cover" />
            ) : isLocked ? (
              <Lock className="w-5 h-5 text-muted-foreground" />
            ) : (
              <BookOpen className="w-6 h-6 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-serif font-semibold text-foreground truncate">{module.title}</h3>
            <p className="text-xs text-muted-foreground">
              {isLocked ? unlockRequirement || 'Bloqueado' : `${module.totalLessons} lições`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isLocked && module.progress > 0 && (
              <span className="text-xs font-medium text-primary">{module.progress}%</span>
            )}
            {isLocked ? (
              <Lock className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            )}
          </div>
        </div>
        {!isLocked && module.progress > 0 && (
          <Progress value={module.progress} className="mt-3 h-1" />
        )}
      </div>
    );
  }

  // Hero variant - larger card for slider
  if (variant === 'hero') {
    return (
      <div 
        className={cn(
          "group bg-card rounded-2xl overflow-hidden shadow-elevated transition-all duration-300 h-full",
          module.image 
            ? "border border-sacred-300/40 hover:border-sacred-400/60 hover:shadow-sacred" 
            : "border border-border hover:border-primary/30",
          isLocked 
            ? "opacity-70 cursor-not-allowed" 
            : "hover:shadow-xl cursor-pointer"
        )}
        onClick={handleClick}
      >
        {/* Image/Gradient Header - Expanded with aspect ratio */}
        <div className={cn(
          "aspect-[16/9] relative overflow-hidden",
          !module.image && `bg-gradient-to-br ${getLevelGradient(module.level)}`
        )}>
          {module.image ? (
            <img 
              src={module.image} 
              alt={module.title} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <>
              <div className="absolute inset-0 pattern-adinkra opacity-30" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-white/70" />
                </div>
              </div>
            </>
          )}
          
          {/* Refined Overlay */}
          <div className="absolute inset-0 module-card-overlay" />
          
          {/* Badge - Top Right */}
          <div className="absolute top-3 right-3">
            <span className={cn(
              "inline-block px-3 py-1.5 backdrop-blur-md rounded-full text-xs font-semibold text-white border border-white/20 shadow-lg",
              getLevelBadgeColor(module.level)
            )}>
              {module.type === 'proficiency' ? `Nível ${module.level}` : module.theme}
            </span>
          </div>
          
          {isLocked && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[2px]">
              <div className="bg-white/10 backdrop-blur-sm rounded-full p-5 border border-white/20">
                <Lock className="w-10 h-10 text-white" />
              </div>
            </div>
          )}
          
          {/* Title - Bottom with backdrop blur (hidden when locked) */}
          {!isLocked && (
            <div className="absolute bottom-0 inset-x-0 bg-black/40 backdrop-blur-sm px-4 py-3">
              <h3 className="text-lg font-semibold text-white drop-shadow-md line-clamp-1">
                {module.title}
              </h3>
            </div>
          )}
        </div>

        {/* Content with decorative separator */}
        <div className="p-6 relative">
          {/* Decorative golden line */}
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-sacred-400/50 to-transparent" />
          
          {/* Title moved here for locked modules */}
          {isLocked && (
            <h3 className="text-lg font-semibold text-foreground pt-2 mb-2 line-clamp-1">
              {module.title}
            </h3>
          )}
          
          <p className={cn("text-sm text-muted-foreground line-clamp-2 mb-5 min-h-[40px]", !isLocked && "pt-2")}>
            {module.description}
          </p>

          <div className="flex items-center gap-5 text-sm text-muted-foreground mb-5">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-forest-600" />
              <span>{module.totalLessons} lições</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-forest-600" />
              <span>~{module.totalLessons * 30} min</span>
            </div>
          </div>

          {!isLocked && module.progress > 0 && (
            <div className="mb-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted-foreground font-medium">Progresso</span>
                <span className="text-sm font-bold text-forest-600">{module.progress}%</span>
              </div>
              <Progress value={module.progress} className="h-3" />
            </div>
          )}
          
          {/* Retention Badge for completed modules */}
          {isCompleted && retentionStatus !== 'not_started' && (
            <div className="mb-5">
              <RetentionBadge />
            </div>
          )}
          
          {/* Pending Phase 2 Badge */}
          {hasPendingPhase2 && !isLocked && (
            <div className="mb-5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
                <Sparkles className="w-3 h-3" />
                Fase 2 Pendente - Buscar Proficiência
              </div>
            </div>
          )}

          {/* Unlock requirement badge */}
          {isLocked && unlockRequirement && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-2 text-center">
              {unlockRequirement}
            </p>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>

              <Button 
                className={cn(
                  "w-full font-semibold h-12 text-base transition-all duration-300",
                  isLocked 
                    ? isThematicLocked 
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 cursor-not-allowed border border-amber-200 dark:border-amber-800"
                      : "bg-muted text-muted-foreground cursor-not-allowed" 
                    : "bg-gradient-to-r from-forest-600 to-forest-700 hover:from-forest-700 hover:to-forest-800 text-white shadow-lg hover:shadow-xl"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
                disabled={isLocked}
              >
                {isLocked ? (
                  <>
                    {isThematicLocked ? (
                      <AlertCircle className="w-4 h-4 mr-2" />
                    ) : (
                      <Lock className="w-4 h-4 mr-2" />
                    )}
                    Bloqueado
                  </>
                ) : module.progress > 0 ? (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Continuar
                  </>
                ) : (
                  'Começar'
                )}
              </Button>
            </TooltipTrigger>
            {isLocked && unlockRequirement && (
              <TooltipContent side="top" className="max-w-xs text-center">
                <p>{unlockRequirement}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        </div>
      </div>
    );
  }

  // Default variant - refined design
  return (
    <div 
      className={cn(
        "group bg-card rounded-2xl overflow-hidden shadow-soft transition-all duration-300 animate-fade-in",
        module.image 
          ? "border border-sacred-300/40 hover:border-sacred-400/60 hover:shadow-sacred" 
          : "border border-border hover:border-primary/30",
        isLocked 
          ? "opacity-70 cursor-not-allowed" 
          : "hover:shadow-elevated"
      )}
    >
      {/* Image/Gradient Header - Expanded with aspect ratio */}
      <div className={cn(
        "aspect-[16/9] relative overflow-hidden",
        !module.image && `bg-gradient-to-br ${getLevelGradient(module.level)}`
      )}>
        {module.image ? (
          <img 
            src={module.image} 
            alt={module.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <>
            <div className="absolute inset-0 pattern-adinkra opacity-30" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-white/70" />
              </div>
            </div>
          </>
        )}
        
        {/* Refined Overlay */}
        <div className="absolute inset-0 module-card-overlay" />
        
        {/* Badge - Top Right */}
        <div className="absolute top-3 right-3">
          <span className={cn(
            "inline-block px-2.5 py-1 backdrop-blur-md rounded-full text-xs font-semibold text-white border border-white/20 shadow-lg",
            getLevelBadgeColor(module.level)
          )}>
            {module.type === 'proficiency' ? `Nível ${module.level}` : module.theme}
          </span>
        </div>
        
        {isLocked && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[2px]">
            <div className="bg-white/10 backdrop-blur-sm rounded-full p-4 border border-white/20">
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>
        )}
        
        {/* Title - Bottom with backdrop blur (hidden when locked) */}
        {!isLocked && (
          <div className="absolute bottom-0 inset-x-0 bg-black/40 backdrop-blur-sm px-3 py-2">
            <h3 className="text-base font-semibold text-white drop-shadow-md line-clamp-1">
              {module.title}
            </h3>
          </div>
        )}
      </div>

      {/* Content with decorative separator */}
      <div className="p-5 relative">
        {/* Decorative golden line */}
        <div className="absolute top-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-sacred-400/50 to-transparent" />
        
        {/* Title moved here for locked modules */}
        {isLocked && (
          <h3 className="text-base font-semibold text-foreground pt-2 mb-2 line-clamp-1">
            {module.title}
          </h3>
        )}
        
        <p className={cn("text-sm text-muted-foreground line-clamp-2 mb-4", !isLocked && "pt-2")}>
          {module.description}
        </p>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-forest-600" />
            <span>{module.totalLessons} lições</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-forest-600" />
            <span>~{module.totalLessons * 30} min</span>
          </div>
        </div>

        {!isLocked && module.progress > 0 && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-muted-foreground">Progresso</span>
              <span className="text-xs font-medium text-forest-600">{module.progress}%</span>
            </div>
            <Progress value={module.progress} className="h-2" />
          </div>
        )}
        
        {/* Retention Badge for completed modules */}
        {isCompleted && retentionStatus !== 'not_started' && (
          <div className="mb-4">
            <RetentionBadge />
          </div>
        )}

        {/* Unlock requirement badge */}
        {isLocked && unlockRequirement && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-2 text-center">
            {unlockRequirement}
          </p>
        )}

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>

              <Button 
                className={cn(
                  "w-full font-semibold transition-all duration-300",
                  isLocked 
                    ? isThematicLocked 
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 cursor-not-allowed border border-amber-200 dark:border-amber-800"
                      : "bg-muted text-muted-foreground cursor-not-allowed" 
                    : "bg-gradient-to-r from-forest-600 to-forest-700 hover:from-forest-700 hover:to-forest-800 text-white shadow-lg hover:shadow-xl"
                )}
                onClick={handleClick}
                disabled={isLocked}
              >
                {isLocked ? (
                  <>
                    {isThematicLocked ? (
                      <AlertCircle className="w-4 h-4 mr-2" />
                    ) : (
                      <Lock className="w-4 h-4 mr-2" />
                    )}
                    Bloqueado
                  </>
                ) : module.progress > 0 ? (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Continuar
                  </>
                ) : (
                  'Começar'
                )}
              </Button>
            </TooltipTrigger>
            {isLocked && unlockRequirement && (
              <TooltipContent side="top" className="max-w-xs text-center">
                <p>{unlockRequirement}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default ModuleCard;
