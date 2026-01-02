import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  CheckCircle,
  Lightbulb,
  Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface MemorizationItem {
  text: string;
  hint?: string;
  imageUrl?: string;
}

interface MemorizationExerciseProps {
  items: MemorizationItem[];
  onComplete?: () => void;
}

const MemorizationExercise: React.FC<MemorizationExerciseProps> = ({ items, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [masteredItems, setMasteredItems] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<'learn' | 'review'>('learn');

  const currentItem = items[currentIndex];
  const progress = (masteredItems.size / items.length) * 100;
  const isCompleted = masteredItems.size === items.length;

  // Extrai o início do texto (primeiras palavras) para mostrar como pista
  const getTextStart = (text: string, wordCount: number = 3): string => {
    const words = text.split(/\s+/);
    if (words.length <= wordCount) return text;
    return words.slice(0, wordCount).join(' ') + '...';
  };

  useEffect(() => {
    if (isCompleted && mode === 'learn') {
      onComplete?.();
    }
  }, [isCompleted, mode, onComplete]);

  const handleNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowContent(false);
      setShowHint(false);
    } else {
      // Loop back to start
      setCurrentIndex(0);
      setShowContent(false);
      setShowHint(false);
    }
  }, [currentIndex, items.length]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowContent(false);
      setShowHint(false);
    }
  };

  const handleReveal = () => {
    setShowContent(true);
  };

  const handleToggleHint = () => {
    setShowHint(!showHint);
  };

  const handleMarkMastered = () => {
    setMasteredItems(prev => new Set([...prev, currentIndex]));
    handleNext();
  };

  const handleNeedsPractice = () => {
    setMasteredItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(currentIndex);
      return newSet;
    });
    handleNext();
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setShowContent(false);
    setShowHint(false);
    setMasteredItems(new Set());
    setMode('learn');
  };

  const handleStartReview = () => {
    setMode('review');
    setCurrentIndex(0);
    setShowContent(false);
    setShowHint(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (showContent) {
          handleNext();
        } else {
          handleReveal();
        }
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'h') {
        handleToggleHint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showContent, handleNext]);

  if (items.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-soft p-8 text-center">
        <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Nenhum item para memorizar</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <span className="font-medium text-foreground">
              {mode === 'learn' ? 'Modo Aprendizado' : 'Modo Revisão'}
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} de {items.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{masteredItems.size} dominados</span>
          <span>{items.length - masteredItems.size} restantes</span>
        </div>
      </div>

      {/* Card */}
      <div className="p-8">
        <div 
          className={`
            min-h-[250px] rounded-xl border-2 border-dashed border-border p-6
            flex flex-col items-center justify-center text-center
            transition-all duration-300
            ${showContent ? 'bg-primary/5 border-primary/30' : 'bg-muted/30'}
          `}
        >
          {currentItem.imageUrl && (
            <img 
              src={currentItem.imageUrl} 
              alt="" 
              className="max-h-32 rounded-lg mb-4 object-contain"
            />
          )}

          {!showContent ? (
            <>
              {/* Mostra o início do texto como pista */}
              <div className="mb-6">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Complete o verso:
                </p>
                <p className="font-serif text-2xl text-primary font-medium">
                  {getTextStart(currentItem.text, 4)}
                </p>
              </div>

              <EyeOff className="w-8 h-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Tente lembrar o restante antes de revelar
              </p>
              
              {/* Hint */}
              {currentItem.hint && (
                <div className="mb-4">
                  {showHint ? (
                    <div className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      <span className="text-sm">{currentItem.hint}</span>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={handleToggleHint}>
                      <Lightbulb className="w-4 h-4 mr-2" />
                      Ver Dica
                    </Button>
                  )}
                </div>
              )}

              <Button 
                onClick={handleReveal}
                className="gradient-gold text-secondary shadow-gold"
              >
                <Eye className="w-4 h-4 mr-2" />
                Revelar Completo
              </Button>
            </>
          ) : (
            <>
              <p className="font-serif text-xl text-foreground leading-relaxed whitespace-pre-wrap">
                {currentItem.text}
              </p>
              
              {masteredItems.has(currentIndex) && (
                <div className="mt-4 px-3 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Dominado
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border bg-muted/30">
        {showContent ? (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              onClick={handleNeedsPractice}
              className="flex-1"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Preciso Praticar
            </Button>
            <Button 
              onClick={handleMarkMastered}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Já Sei!
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Anterior
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleNext}
            >
              Próximo
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>

      {/* Completion */}
      {isCompleted && (
        <div className="p-6 border-t border-border bg-green-50">
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="font-serif text-xl font-semibold text-green-800 mb-2">
              Parabéns!
            </h3>
            <p className="text-green-700 mb-4">
              Você dominou todos os {items.length} itens!
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Recomeçar
              </Button>
              <Button onClick={handleStartReview} className="gradient-gold text-secondary">
                <Brain className="w-4 h-4 mr-2" />
                Revisar Novamente
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard hints */}
      <div className="px-4 py-2 border-t border-border text-center">
        <p className="text-xs text-muted-foreground">
          Use as teclas <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">←</kbd> <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">→</kbd> para navegar, 
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs ml-1">Espaço</kbd> para revelar
        </p>
      </div>
    </div>
  );
};

export default MemorizationExercise;
