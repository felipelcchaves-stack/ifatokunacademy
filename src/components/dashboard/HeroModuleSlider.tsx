import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, BookOpen, Clock, Lock, Sparkles } from 'lucide-react';
import UnlockInfo from '@/components/modules/UnlockInfo';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';

// Interface for modules from database
interface DatabaseModule {
  id: string;
  title: string;
  description: string | null;
  type: 'proficiency' | 'thematic';
  level: string | null;
  theme: string | null;
  image_url: string | null;
  color: string | null;
  display_order: number;
  is_published: boolean;
  totalLessons?: number;
  progress: number;
  unlock_rule?: string;
  unlock_date?: string | null;
}

interface HeroModuleSliderProps {
  modules: DatabaseModule[];
  lockedModules?: Set<string>;
  unlockRequirements?: Record<string, string>;
  activeModuleIndex?: number;
}

const HeroModuleSlider: React.FC<HeroModuleSliderProps> = ({
  modules,
  lockedModules = new Set(),
  unlockRequirements = {},
  activeModuleIndex = 0,
}) => {
  const navigate = useNavigate();
  const { getOrgPath } = useOrgNavigate();
  const sliderRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (sliderRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = 340; // cardWidth + gap
      const newScrollPosition = direction === 'left' 
        ? sliderRef.current.scrollLeft - scrollAmount
        : sliderRef.current.scrollLeft + scrollAmount;
      
      sliderRef.current.scrollTo({
        left: newScrollPosition,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    checkScroll();
  }, [modules]);

  useEffect(() => {
    checkScroll();
  }, []);

  const handleModuleClick = (moduleId: string, isLocked: boolean) => {
    if (!isLocked) {
      navigate(getOrgPath(`/module/${moduleId}`));
    }
  };

  const getLevelGradient = (level: string | null) => {
    switch (level?.toLowerCase()) {
      case 'akapo': return 'from-forest-500 to-forest-700';
      case 'awo': return 'from-sacred-500 to-sacred-700';
      case 'oluwo': return 'from-purple-600 to-purple-800';
      default: return 'from-forest-500 to-forest-700';
    }
  };

  const getLevelBadgeColor = (level: string | null) => {
    switch (level?.toLowerCase()) {
      case 'akapo': return 'bg-forest-500/90';
      case 'awo': return 'bg-sacred-500/90';
      case 'oluwo': return 'bg-purple-600/90';
      default: return 'bg-forest-500/90';
    }
  };

  return (
    <div className="relative w-full">
      {/* Navigation Arrows */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => scroll('left')}
        disabled={!canScrollLeft}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 rounded-full w-10 h-10 bg-background/80 backdrop-blur-sm border-border hover:border-primary hover:bg-primary/10 shadow-md transition-all duration-300 disabled:opacity-0"
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={() => scroll('right')}
        disabled={!canScrollRight}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-full w-10 h-10 bg-background/80 backdrop-blur-sm border-border hover:border-primary hover:bg-primary/10 shadow-md transition-all duration-300 disabled:opacity-0"
      >
        <ChevronRight className="w-5 h-5" />
      </Button>

      {/* Slider Container */}
      <div 
        ref={sliderRef}
        onScroll={checkScroll}
        className="flex gap-6 overflow-x-auto pb-6 px-16 scroll-smooth snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {modules.map((module, index) => {
          const isLocked = lockedModules.has(module.id);
          
          return (
            <div 
              key={module.id}
              className="flex-shrink-0 snap-center transition-all duration-300"
              style={{ width: '320px' }}
            >
              {/* Module Card */}
              <div 
                className={cn(
                  "group bg-card rounded-2xl overflow-hidden shadow-lg transition-all duration-300 h-full border",
                  module.image_url 
                    ? "border-sacred-300/40 hover:border-sacred-400/60" 
                    : "border-border hover:border-primary/30",
                  isLocked 
                    ? "opacity-75 cursor-not-allowed" 
                    : "hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                )}
                onClick={() => handleModuleClick(module.id, isLocked)}
              >
                    {/* Image/Gradient Header - Expanded */}
                    <div className={cn(
                      "aspect-[16/9] relative overflow-hidden bg-gradient-to-br",
                      !module.image_url && getLevelGradient(module.level)
                    )}>
                      {module.image_url ? (
                        <img 
                          src={module.image_url} 
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
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center backdrop-blur-[2px] gap-3">
                          <div className="bg-white/10 backdrop-blur-sm rounded-full p-5 border border-white/20">
                            <Lock className="w-10 h-10 text-white" />
                          </div>
                          <UnlockInfo
                            unlockRule={(module.unlock_rule as any) || 'sequential'}
                            unlockDate={module.unlock_date}
                            unlockRequirement={unlockRequirements[module.id]}
                            lightText
                          />
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
                      
                      <p className={cn("text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[40px]", !isLocked && "pt-2")}>
                        {module.description || 'Continue sua jornada de aprendizado.'}
                      </p>

                      <div className="flex items-center gap-5 text-sm text-muted-foreground mb-5">
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-forest-600" />
                          <span>{module.totalLessons || 0} lições</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-forest-600" />
                          <span>~{(module.totalLessons || 0) * 30} min</span>
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

                  {/* Unlock requirement badge */}
                  {isLocked && unlockRequirements[module.id] && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mb-2 text-center">
                      {unlockRequirements[module.id]}
                    </p>
                  )}

                  <Button 
                    className={cn(
                      "w-full font-semibold h-11 transition-all duration-300",
                      isLocked 
                        ? "bg-muted text-muted-foreground cursor-not-allowed" 
                        : "bg-gradient-to-r from-forest-600 to-forest-700 hover:from-forest-700 hover:to-forest-800 text-white"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleModuleClick(module.id, isLocked);
                    }}
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
            </div>
          );
        })}
      </div>

      {/* Dot Indicators - Only show if more than 3 modules */}
      {modules.length > 3 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {modules.map((_, index) => (
            <div
              key={index}
              className="h-2 w-2 rounded-full bg-muted-foreground/30"
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HeroModuleSlider;
