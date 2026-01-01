import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, BookOpen, Clock, ChevronRight, Lock } from 'lucide-react';
import { Module } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ModuleCardProps {
  module: Module;
  variant?: 'default' | 'compact';
  isLocked?: boolean;
  unlockRequirement?: string;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ 
  module, 
  variant = 'default',
  isLocked = false,
  unlockRequirement,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (!isLocked) {
      navigate(`/module/${module.id}`);
    }
  };

  if (variant === 'compact') {
    return (
      <div 
        className={cn(
          "group bg-card rounded-xl p-4 shadow-soft transition-all duration-300 border border-border",
          isLocked 
            ? "opacity-60 cursor-not-allowed" 
            : "hover:shadow-elevated cursor-pointer hover:border-primary/30"
        )}
        onClick={handleClick}
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden",
            isLocked ? "bg-muted" : `bg-gradient-to-br ${module.color}`
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

  return (
    <div className={cn(
      "group bg-card rounded-2xl overflow-hidden shadow-soft transition-all duration-300 border border-border",
      isLocked 
        ? "opacity-70 cursor-not-allowed" 
        : "hover:shadow-elevated hover:border-primary/30"
    )}>
      {/* Image/Gradient Header */}
      <div className={cn(
        "h-40 relative overflow-hidden",
        !module.image && `bg-gradient-to-br ${module.color}`
      )}>
        {module.image ? (
          <img 
            src={module.image} 
            alt={module.title} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 pattern-adinkra opacity-30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {isLocked && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-full p-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>
        )}
        
        <div className="absolute bottom-4 left-4 right-4">
          <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium text-white mb-2">
            {module.type === 'proficiency' ? `Nível ${module.level}` : module.theme}
          </span>
          <h3 className="font-serif text-xl font-bold text-white">{module.title}</h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {isLocked && unlockRequirement 
            ? unlockRequirement 
            : module.description}
        </p>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            <span>{module.totalLessons} lições</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>~{module.totalLessons * 30} min</span>
          </div>
        </div>

        {!isLocked && module.progress > 0 && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-muted-foreground">Progresso</span>
              <span className="text-xs font-medium text-primary">{module.progress}%</span>
            </div>
            <Progress value={module.progress} className="h-2" />
          </div>
        )}

        <Button 
          className={cn(
            "w-full font-semibold",
            isLocked 
              ? "bg-muted text-muted-foreground cursor-not-allowed" 
              : "gradient-gold text-secondary shadow-gold hover:opacity-90 transition-opacity"
          )}
          onClick={handleClick}
          disabled={isLocked}
        >
          {isLocked ? (
            <>
              <Lock className="w-4 h-4 mr-2" />
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
      </div>
    </div>
  );
};

export default ModuleCard;
