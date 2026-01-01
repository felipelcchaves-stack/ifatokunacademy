import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, BookOpen, Clock, ChevronRight } from 'lucide-react';
import { Module } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface ModuleCardProps {
  module: Module;
  variant?: 'default' | 'compact';
}

const ModuleCard: React.FC<ModuleCardProps> = ({ module, variant = 'default' }) => {
  const navigate = useNavigate();

  if (variant === 'compact') {
    return (
      <div 
        className="group bg-card rounded-xl p-4 shadow-soft hover:shadow-elevated transition-all duration-300 cursor-pointer border border-border hover:border-primary/30"
        onClick={() => navigate(`/module/${module.id}`)}
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${module.color} flex items-center justify-center flex-shrink-0`}>
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-serif font-semibold text-foreground truncate">{module.title}</h3>
            <p className="text-xs text-muted-foreground">{module.totalLessons} lições</p>
          </div>
          <div className="flex items-center gap-2">
            {module.progress > 0 && (
              <span className="text-xs font-medium text-primary">{module.progress}%</span>
            )}
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
        {module.progress > 0 && (
          <Progress value={module.progress} className="mt-3 h-1" />
        )}
      </div>
    );
  }

  return (
    <div className="group bg-card rounded-2xl overflow-hidden shadow-soft hover:shadow-elevated transition-all duration-300 border border-border hover:border-primary/30">
      {/* Image/Gradient Header */}
      <div className={`h-40 bg-gradient-to-br ${module.color} relative overflow-hidden`}>
        <div className="absolute inset-0 pattern-adinkra opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
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
          {module.description}
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

        {module.progress > 0 && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-muted-foreground">Progresso</span>
              <span className="text-xs font-medium text-primary">{module.progress}%</span>
            </div>
            <Progress value={module.progress} className="h-2" />
          </div>
        )}

        <Button 
          className="w-full gradient-gold text-secondary font-semibold shadow-gold hover:opacity-90 transition-opacity"
          onClick={() => navigate(`/module/${module.id}`)}
        >
          {module.progress > 0 ? (
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
