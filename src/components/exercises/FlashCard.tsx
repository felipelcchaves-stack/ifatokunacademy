import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { RotateCw, ChevronLeft, ChevronRight, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Card {
  front: string;
  back: string;
}

interface FlashCardProps {
  cards: Card[];
  onComplete?: () => void;
}

export interface FlashCardRef {
  reset: () => void;
}

const FlashCard = forwardRef<FlashCardRef, FlashCardProps>(({ cards, onComplete }, ref) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<number>>(new Set());

  // Expose reset method to parent
  useImperativeHandle(ref, () => ({
    reset: () => {
      setCurrentIndex(0);
      setIsFlipped(false);
      setKnownCards(new Set());
    }
  }));

  // Handle empty or invalid cards array
  if (!cards || cards.length === 0) {
    return (
      <div className="protected-content w-full max-w-lg mx-auto">
        <div className="bg-muted/50 rounded-xl border border-border p-8 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Nenhum cartão configurado
          </h3>
          <p className="text-sm text-muted-foreground">
            Este exercício ainda não possui cartões de revisão. 
            Por favor, adicione cartões no painel administrativo.
          </p>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  // Safety check for current card
  if (!currentCard) {
    return (
      <div className="protected-content w-full max-w-lg mx-auto">
        <div className="bg-destructive/10 rounded-xl border border-destructive/20 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Erro ao carregar cartão
          </h3>
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar o cartão atual. Tente recarregar a página.
          </p>
        </div>
      </div>
    );
  }

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleMarkKnown = () => {
    const newKnown = new Set(knownCards);
    newKnown.add(currentIndex);
    setKnownCards(newKnown);
    
    if (newKnown.size === cards.length) {
      onComplete?.();
    } else {
      handleNext();
    }
  };

  return (
    <div className="protected-content w-full max-w-lg mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-muted-foreground">
          Cartão {currentIndex + 1} de {cards.length}
        </span>
        <span className="text-sm font-medium text-primary">
          {knownCards.size} memorizados
        </span>
      </div>

      {/* Card with flip animation */}
      <div 
        className="relative h-64 cursor-pointer group"
        onClick={handleFlip}
        style={{ perspective: '1000px' }}
      >
        <div 
          className="absolute inset-0 transition-transform duration-500"
          style={{ 
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}
        >
          {/* Front */}
          <div 
            className="absolute inset-0 bg-card rounded-2xl shadow-elevated border border-border flex items-center justify-center p-8"
            style={{ 
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden'
            }}
          >
            <p className="font-serif text-xl md:text-2xl text-center text-foreground leading-relaxed">
              {currentCard.front}
            </p>
          </div>
          
          {/* Back */}
          <div 
            className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-2xl shadow-lg flex items-center justify-center p-8"
            style={{ 
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            <p className="font-serif text-lg md:text-xl text-center text-primary-foreground leading-relaxed max-h-full overflow-y-auto">
              {currentCard.back}
            </p>
          </div>
        </div>
      </div>

      {/* Flip hint */}
      <p className="text-center text-sm text-muted-foreground mt-4 mb-6">
        <RotateCw className="w-4 h-4 inline mr-1" />
        Clique para virar o cartão
      </p>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 mb-6">
        {cards.map((_, idx) => (
          <button
            key={idx}
            onClick={() => {
              setCurrentIndex(idx);
              setIsFlipped(false);
            }}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              idx === currentIndex 
                ? 'bg-primary scale-125' 
                : knownCards.has(idx)
                  ? 'bg-primary/50'
                  : 'bg-muted-foreground/30'
            }`}
            aria-label={`Ir para cartão ${idx + 1}`}
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex-1"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Anterior
        </Button>
        
        <Button
          className="gradient-gold text-secondary shadow-gold flex-1"
          onClick={handleMarkKnown}
          disabled={knownCards.has(currentIndex)}
        >
          <Check className="w-4 h-4 mr-1" />
          {knownCards.has(currentIndex) ? 'Memorizado' : 'Sei'}
        </Button>

        <Button
          variant="outline"
          onClick={handleNext}
          disabled={currentIndex === cards.length - 1}
          className="flex-1"
        >
          Próximo
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
});

FlashCard.displayName = 'FlashCard';

export default FlashCard;
