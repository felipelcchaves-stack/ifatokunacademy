import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Module } from '@/data/mockData';
import ModuleCard from './ModuleCard';
import { Button } from '@/components/ui/button';

interface ModuleSliderProps {
  modules: Module[];
  title: string;
  subtitle?: string;
  lockedModules?: Set<string>;
  unlockRequirements?: Record<string, string>;
  pendingPhase2Modules?: string[];
}

const ModuleSlider: React.FC<ModuleSliderProps> = ({ 
  modules, 
  title, 
  subtitle,
  lockedModules = new Set(),
  unlockRequirements = {},
  pendingPhase2Modules = [],
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (sliderRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (sliderRef.current) {
      const scrollAmount = sliderRef.current.clientWidth * 0.8;
      sliderRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkScroll, 300);
    }
  };

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-foreground">{title}</h2>
          {subtitle && (
            <p className="text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        
        {/* Navigation Buttons */}
        <div className="hidden md:flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="rounded-full border-border hover:border-primary hover:bg-primary/10"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="rounded-full border-border hover:border-primary hover:bg-primary/10"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Slider */}
      <div 
        ref={sliderRef}
        onScroll={checkScroll}
        className="module-slider flex gap-4 md:gap-6 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {modules.map((module) => (
          <div 
            key={module.id} 
            className="module-slide w-[280px] md:w-[320px] flex-shrink-0"
          >
            <ModuleCard 
              module={module} 
              isLocked={lockedModules.has(module.id)}
              unlockRequirement={unlockRequirements[module.id]}
              hasPendingPhase2={pendingPhase2Modules.includes(module.id)}
            />
          </div>
        ))}
      </div>

      {/* Mobile Navigation Dots */}
      <div className="flex justify-center gap-2 mt-4 md:hidden">
        {modules.map((_, index) => (
          <div 
            key={index}
            className="w-2 h-2 rounded-full bg-border transition-colors"
          />
        ))}
      </div>
    </div>
  );
};

export default ModuleSlider;
