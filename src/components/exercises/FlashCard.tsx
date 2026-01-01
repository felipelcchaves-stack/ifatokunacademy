import React, { useState } from 'react';
import { RotateCw, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Card {
  front: string;
  back: string;
}

interface FlashCardProps {
  cards: Card[];
  onComplete?: () => void;
}

const FlashCard: React.FC<FlashCardProps> = ({ cards, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<number>>(new Set());

  const currentCard = cards[currentIndex];

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

      {/* Card */}
      <div 
        className="relative h-64 cursor-pointer perspective-1000"
        onClick={handleFlip}
      >
        <div 
          className={`absolute inset-0 transition-transform duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front */}
          <div 
            className="absolute inset-0 bg-card rounded-2xl shadow-elevated border border-border flex items-center justify-center p-8 backface-hidden"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <p className="font-serif text-2xl text-center text-foreground">{currentCard.front}</p>
          </div>
          
          {/* Back */}
          <div 
            className="absolute inset-0 bg-gradient-to-br from-primary to-gold-600 rounded-2xl shadow-gold flex items-center justify-center p-8 rotate-y-180"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <p className="font-serif text-2xl text-center text-primary-foreground">{currentCard.back}</p>
          </div>
        </div>
      </div>

      {/* Flip hint */}
      <p className="text-center text-sm text-muted-foreground mt-4 mb-6">
        <RotateCw className="w-4 h-4 inline mr-1" />
        Clique para virar o cartão
      </p>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex-1"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Anterior
        </Button>
        
        <Button
          className="gradient-gold text-secondary shadow-gold flex-1"
          onClick={handleMarkKnown}
          disabled={knownCards.has(currentIndex)}
        >
          <Check className="w-4 h-4 mr-2" />
          {knownCards.has(currentIndex) ? 'Memorizado' : 'Sei'}
        </Button>

        <Button
          variant="outline"
          onClick={handleNext}
          disabled={currentIndex === cards.length - 1}
          className="flex-1"
        >
          Próximo
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default FlashCard;
