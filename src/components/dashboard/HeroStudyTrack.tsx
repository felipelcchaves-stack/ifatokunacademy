import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Sparkles } from 'lucide-react';
import { MainCTAButton } from '@/components/ui/MainCTAButton';
import HeroModuleSlider from './HeroModuleSlider';
import { getRandomProverb, YorubaProverb } from '@/data/yorubaProverbs';

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
  const [proverb, setProverb] = useState<YorubaProverb | null>(null);

  useEffect(() => {
    // Get a random motivational proverb
    setProverb(getRandomProverb('motivation'));
  }, []);

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
        {/* Greeting with Yoruba Proverb */}
        <div className="text-center mb-8">
          <p className="text-muted-foreground text-sm font-medium mb-2 tracking-wide uppercase">Bem-vindo de volta</p>
          <h1 className="heading-display text-4xl md:text-5xl lg:text-6xl text-foreground mb-4">
            Olá, <span className="text-gradient-forest">{displayName}</span>!
          </h1>
          
          {/* Yoruba Proverb */}
          {proverb && (
            <div className="max-w-lg mx-auto">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary/60" />
                <p className="text-primary font-serif italic text-lg">
                  "{proverb.yoruba}"
                </p>
                <Sparkles className="w-4 h-4 text-primary/60" />
              </div>
              <p className="text-muted-foreground text-sm">
                {proverb.portuguese}
              </p>
            </div>
          )}
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
