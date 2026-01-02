import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { MainCTAButton } from '@/components/ui/MainCTAButton';
import HeroModuleSlider from './HeroModuleSlider';

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

interface HeroStudyTrackProps {
  modules: DatabaseModule[];
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

  // Find active module index (first unlocked with progress or first unlocked)
  const activeModuleIndex = useMemo(() => {
    const progressIndex = modules.findIndex(m => 
      !lockedModules.has(m.id) && m.progress > 0 && m.progress < 100
    );
    if (progressIndex !== -1) return progressIndex;
    
    const firstUnlockedIndex = modules.findIndex(m => !lockedModules.has(m.id));
    return firstUnlockedIndex !== -1 ? firstUnlockedIndex : 0;
  }, [modules, lockedModules]);

  const activeModule = modules[activeModuleIndex];

  return (
    <section className="relative min-h-[70vh] flex flex-col justify-center py-8">
      {/* Background pattern */}
      <div className="absolute inset-0 pattern-adinkra opacity-50" />
      
      <div className="relative z-10">
        {/* Greeting */}
        <div className="text-center mb-8">
          <p className="text-muted-foreground text-sm font-medium mb-2 tracking-wide uppercase">Bem-vindo de volta</p>
          <h1 className="heading-display text-4xl md:text-5xl lg:text-6xl text-foreground mb-4">
            Olá, <span className="text-gradient-forest">{displayName}</span>!
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto text-lg">
            Continue sua jornada de conhecimento. Cada passo te aproxima da sabedoria.
          </p>
        </div>

        {/* Main CTA */}
        {activeModule && (
          <div className="text-center mb-10">
            <MainCTAButton
              size="xl"
              onClick={() => navigate(`/module/${activeModule.id}`)}
            >
              {activeModule.progress > 0 ? 'Continuar Estudando' : 'Começar a Estudar'}
            </MainCTAButton>
          </div>
        )}

        {/* Module Slider */}
        {modules.length > 0 ? (
          <HeroModuleSlider
            modules={modules}
            lockedModules={lockedModules}
            unlockRequirements={unlockRequirements}
            activeModuleIndex={activeModuleIndex}
          />
        ) : (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="heading-display text-xl text-foreground mb-2">
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
