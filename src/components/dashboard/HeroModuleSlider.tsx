import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, BookOpen, Clock, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

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
  const sliderRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(activeModuleIndex);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (sliderRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scrollToIndex = (index: number) => {
    if (sliderRef.current) {
      const cardWidth = 400;
      const gap = 24;
      const containerWidth = sliderRef.current.clientWidth;
      const scrollPosition = (cardWidth + gap) * index - (containerWidth - cardWidth) / 2;
      
      sliderRef.current.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: 'smooth',
      });
      setCurrentIndex(index);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    const newIndex = direction === 'left' 
      ? Math.max(0, currentIndex - 1)
      : Math.min(modules.length - 1, currentIndex + 1);
    scrollToIndex(newIndex);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToIndex(activeModuleIndex);
    }, 100);
    return () => clearTimeout(timer);
  }, [activeModuleIndex]);

  useEffect(() => {
    checkScroll();
  }, []);

  const handleModuleClick = (moduleId: string, isLocked: boolean) => {
    if (!isLocked) {
      navigate(`/module/${moduleId}`);
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

  return (
    <div className="relative w-full">
      {/* Navigation Arrows */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => scroll('left')}
        disabled={!canScrollLeft}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full w-12 h-12 bg-background/90 backdrop-blur-sm border-forest-300 hover:border-forest-500 hover:bg-forest-50 shadow-lg transition-all duration-300 disabled:opacity-30"
      >
        <ChevronLeft className="w-6 h-6 text-forest-700" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        onClick={() => scroll('right')}
        disabled={!canScrollRight}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full w-12 h-12 bg-background/90 backdrop-blur-sm border-forest-300 hover:border-forest-500 hover:bg-forest-50 shadow-lg transition-all duration-300 disabled:opacity-30"
      >
        <ChevronRight className="w-6 h-6 text-forest-700" />
      </Button>

      {/* Slider Container */}
      <div 
        ref={sliderRef}
        onScroll={checkScroll}
        className="flex gap-6 overflow-x-auto pb-6 px-16 scroll-smooth snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {modules.map((module, index) => {
          const isActive = index === currentIndex;
          const isLocked = lockedModules.has(module.id);
          
          return (
            <div 
              key={module.id}
              className={`flex-shrink-0 snap-center transition-all duration-500 ${
                isActive 
                  ? 'scale-100 opacity-100' 
                  : 'scale-95 opacity-70 hover:opacity-90'
              }`}
              style={{ width: '380px' }}
              onClick={() => scrollToIndex(index)}
            >
              <div className={`relative ${isActive ? 'ring-2 ring-forest-500 ring-offset-4 ring-offset-background rounded-2xl' : ''}`}>
                {isActive && (
                  <div className="absolute -inset-1 bg-gradient-to-r from-forest-400 to-sacred-500 rounded-2xl blur opacity-30 animate-pulse-forest" />
                )}
                <div className="relative">
                  {/* Hero Module Card */}
                  <div 
                    className={cn(
                      "group bg-card rounded-2xl overflow-hidden shadow-elevated transition-all duration-300 border border-border h-full",
                      isLocked 
                        ? "opacity-70 cursor-not-allowed" 
                        : "hover:shadow-xl hover:border-forest-400/50 cursor-pointer"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleModuleClick(module.id, isLocked);
                    }}
                  >
                    {/* Image/Gradient Header */}
                    <div className={cn(
                      "h-48 relative overflow-hidden bg-gradient-to-br",
                      !module.image_url && getLevelGradient(module.level)
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
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      
                      {isLocked && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="bg-white/10 backdrop-blur-sm rounded-full p-5">
                            <Lock className="w-10 h-10 text-white" />
                          </div>
                        </div>
                      )}
                      
                      <div className="absolute bottom-4 left-5 right-5">
                        <span className="inline-block px-3 py-1.5 bg-forest-500/80 backdrop-blur-sm rounded-full text-xs font-semibold text-white mb-3">
                          {module.type === 'proficiency' ? `Nível ${module.level}` : module.theme}
                        </span>
                        <h3 className="font-serif text-2xl font-bold text-white">{module.title}</h3>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-5 min-h-[40px]">
                        {isLocked && unlockRequirements[module.id] 
                          ? unlockRequirements[module.id] 
                          : module.description || 'Continue sua jornada de aprendizado.'}
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

                      <Button 
                        className={cn(
                          "w-full font-semibold h-12 text-base",
                          isLocked 
                            ? "bg-muted text-muted-foreground cursor-not-allowed" 
                            : "bg-gradient-to-r from-forest-600 to-forest-700 hover:from-forest-700 hover:to-forest-800 text-white shadow-lg"
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
              </div>
            </div>
          );
        })}
      </div>

      {/* Dot Indicators */}
      <div className="flex justify-center gap-2 mt-4">
        {modules.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToIndex(index)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? 'bg-forest-600 w-8' 
                : 'bg-forest-300 hover:bg-forest-400'
            }`}
            aria-label={`Ir para módulo ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroModuleSlider;
