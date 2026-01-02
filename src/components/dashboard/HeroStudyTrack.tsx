import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Lock, ChevronRight, Star } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { MainCTAButton } from '@/components/ui/MainCTAButton';
import { cn } from '@/lib/utils';

interface Module {
  id: string;
  title: string;
  description: string | null;
  level: string | null;
  image_url: string | null;
  color: string | null;
  progress: number;
  totalLessons?: number;
}

interface HeroStudyTrackProps {
  modules: Module[];
  lockedModules: Set<string>;
  unlockRequirements: Record<string, string>;
  displayName: string;
}

export const HeroStudyTrack: React.FC<HeroStudyTrackProps> = ({
  modules,
  lockedModules,
  unlockRequirements,
  displayName,
}) => {
  const navigate = useNavigate();

  // Find active module (first unlocked with progress or first unlocked)
  const activeModule = modules.find(m => 
    !lockedModules.has(m.id) && m.progress > 0 && m.progress < 100
  ) || modules.find(m => !lockedModules.has(m.id));

  const handleModuleClick = (moduleId: string, isLocked: boolean) => {
    if (!isLocked) {
      navigate(`/module/${moduleId}`);
    }
  };

  const getLevelColor = (level: string | null) => {
    switch (level?.toLowerCase()) {
      case 'akapo': return 'from-forest-500 to-forest-600';
      case 'awo': return 'from-sacred-500 to-sacred-600';
      case 'oluwo': return 'from-purple-500 to-purple-600';
      default: return 'from-forest-500 to-forest-600';
    }
  };

  return (
    <section className="relative min-h-[70vh] flex flex-col justify-center py-8">
      {/* Background pattern */}
      <div className="absolute inset-0 pattern-adinkra opacity-50" />
      
      <div className="relative z-10">
        {/* Greeting */}
        <div className="text-center mb-8">
          <p className="text-muted-foreground text-sm mb-2">Bem-vindo de volta</p>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-3">
            Olá, {displayName}!
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Continue sua jornada de conhecimento. Cada passo te aproxima da sabedoria.
          </p>
        </div>

        {/* Main CTA */}
        {activeModule && (
          <div className="text-center mb-12">
            <MainCTAButton
              size="xl"
              onClick={() => navigate(`/module/${activeModule.id}`)}
            >
              {activeModule.progress > 0 ? 'Continuar Estudando' : 'Começar a Estudar'}
            </MainCTAButton>
          </div>
        )}

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {modules.map((module, index) => {
            const isLocked = lockedModules.has(module.id);
            const isActive = activeModule?.id === module.id;
            
            return (
              <div
                key={module.id}
                onClick={() => handleModuleClick(module.id, isLocked)}
                className={cn(
                  "group relative bg-card rounded-2xl overflow-hidden transition-all duration-500 border-2",
                  isLocked 
                    ? "opacity-60 cursor-not-allowed border-border" 
                    : "cursor-pointer hover:shadow-elevated hover:-translate-y-1",
                  isActive 
                    ? "border-primary shadow-forest ring-2 ring-primary/20" 
                    : "border-border hover:border-primary/40"
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute top-3 right-3 z-10">
                    <div className="flex items-center gap-1 bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded-full">
                      <Star className="w-3 h-3" />
                      Ativo
                    </div>
                  </div>
                )}

                {/* Locked overlay */}
                {isLocked && (
                  <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center p-4">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
                        <Lock className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground max-w-[140px]">
                        {unlockRequirements[module.id] || 'Complete o nível anterior'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Header gradient */}
                <div className={cn(
                  "h-24 relative bg-gradient-to-br",
                  module.image_url ? '' : getLevelColor(module.level)
                )}>
                  {module.image_url ? (
                    <img 
                      src={module.image_url} 
                      alt={module.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 pattern-adinkra opacity-30" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                  
                  {/* Level badge */}
                  <div className="absolute bottom-3 left-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-background/90 backdrop-blur-sm rounded-full text-xs font-medium">
                      {module.level?.charAt(0).toUpperCase()}{module.level?.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-serif text-lg font-semibold text-foreground mb-1 line-clamp-1">
                    {module.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                    {module.description || `${module.totalLessons} lições disponíveis`}
                  </p>

                  {/* Progress */}
                  {!isLocked && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-semibold text-primary">{module.progress}%</span>
                      </div>
                      <Progress value={module.progress} className="h-2" />
                    </div>
                  )}

                  {/* Arrow indicator */}
                  {!isLocked && (
                    <div className="flex justify-end mt-4">
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {modules.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
              Nenhuma trilha disponível
            </h3>
            <p className="text-muted-foreground">
              Em breve novas trilhas de estudo serão adicionadas.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
