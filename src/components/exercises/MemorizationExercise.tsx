import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  CheckCircle,
  Lightbulb,
  Brain,
  Send,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { calculateSimilarity, getTextRemainder, getTextStart } from '@/lib/textSimilarity';

interface MemorizationItem {
  text: string;
  hint?: string;
  imageUrl?: string;
}

interface MemorizationExerciseProps {
  items: MemorizationItem[];
  onComplete?: () => void;
}

const SIMILARITY_THRESHOLD = 80; // Mínimo de 80% de acurácia para considerar correto
const START_WORD_COUNT = 4; // Quantidade de palavras iniciais mostradas

const MemorizationExercise: React.FC<MemorizationExerciseProps> = ({ items, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [masteredItems, setMasteredItems] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<'learn' | 'review'>('learn');
  
  // Estados para validação por digitação
  const [userInput, setUserInput] = useState('');
  const [validationResult, setValidationResult] = useState<{
    similarity: number;
    isCorrect: boolean;
    showResult: boolean;
  } | null>(null);
  const [attempts, setAttempts] = useState(0);

  const currentItem = items[currentIndex];
  const progress = (masteredItems.size / items.length) * 100;
  const isCompleted = masteredItems.size === items.length;
  
  // Texto esperado (restante após as primeiras palavras)
  const expectedText = currentItem ? getTextRemainder(currentItem.text, START_WORD_COUNT) : '';
  const textStart = currentItem ? getTextStart(currentItem.text, START_WORD_COUNT) : '';

  useEffect(() => {
    if (isCompleted && mode === 'learn') {
      onComplete?.();
    }
  }, [isCompleted, mode, onComplete]);

  const resetItemState = useCallback(() => {
    setShowContent(false);
    setShowHint(false);
    setUserInput('');
    setValidationResult(null);
    setAttempts(0);
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
    resetItemState();
  }, [currentIndex, items.length, resetItemState]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      resetItemState();
    }
  };

  const handleValidate = () => {
    if (!userInput.trim()) return;
    
    const similarity = calculateSimilarity(expectedText, userInput);
    const isCorrect = similarity >= SIMILARITY_THRESHOLD;
    
    setValidationResult({
      similarity,
      isCorrect,
      showResult: true
    });
    
    setAttempts(prev => prev + 1);
    
    if (isCorrect) {
      setMasteredItems(prev => new Set([...prev, currentIndex]));
      setShowContent(true);
    }
  };

  const handleRevealWithoutValidation = () => {
    // Permite revelar sem validar, mas não marca como dominado
    setShowContent(true);
    setValidationResult({
      similarity: 0,
      isCorrect: false,
      showResult: false
    });
  };

  const handleTryAgain = () => {
    setUserInput('');
    setValidationResult(null);
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
    resetItemState();
    setMasteredItems(new Set());
    setMode('learn');
  };

  const handleStartReview = () => {
    setMode('review');
    setCurrentIndex(0);
    resetItemState();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Não interferir quando está digitando no textarea
      if (e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Enter' && e.ctrlKey) {
          e.preventDefault();
          handleValidate();
        }
        return;
      }
      
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (showContent) {
          handleNext();
        }
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'h') {
        handleToggleHint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showContent, handleNext, handleValidate]);

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
            min-h-[300px] rounded-xl border-2 border-dashed border-border p-6
            flex flex-col items-center justify-center text-center
            transition-all duration-300
            ${showContent ? 'bg-primary/5 border-primary/30' : 'bg-muted/30'}
            ${validationResult?.isCorrect ? 'bg-green-50 border-green-300' : ''}
            ${validationResult?.showResult && !validationResult?.isCorrect ? 'bg-amber-50 border-amber-300' : ''}
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
              <div className="mb-4 w-full">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Complete o verso:
                </p>
                <p className="font-serif text-2xl text-primary font-medium">
                  {textStart}
                </p>
              </div>

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

              {/* Validation Result */}
              {validationResult?.showResult && !validationResult.isCorrect && (
                <div className="mb-4 w-full">
                  <div className="flex items-center justify-center gap-2 text-amber-600 mb-2">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">
                      {validationResult.similarity}% de acurácia - Tente novamente!
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mínimo necessário: {SIMILARITY_THRESHOLD}%
                  </p>
                </div>
              )}

              {/* Input Area */}
              <div className="w-full max-w-lg">
                <Textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Digite o restante do verso..."
                  className="min-h-[100px] text-center font-serif text-lg resize-none"
                  disabled={validationResult?.showResult}
                />
                
                <div className="flex gap-2 mt-4 justify-center">
                  {!validationResult?.showResult ? (
                    <>
                      <Button 
                        onClick={handleValidate}
                        disabled={!userInput.trim()}
                        className="gradient-gold text-secondary shadow-gold"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Verificar
                      </Button>
                      <Button 
                        variant="ghost"
                        onClick={handleRevealWithoutValidation}
                        className="text-muted-foreground"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Revelar
                      </Button>
                    </>
                  ) : (
                    <Button 
                      onClick={handleTryAgain}
                      variant="outline"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Tentar Novamente
                    </Button>
                  )}
                </div>

                {attempts > 0 && !validationResult?.isCorrect && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Tentativas: {attempts}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              {validationResult?.isCorrect && (
                <div className="mb-4 flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-6 h-6" />
                  <span className="font-medium text-lg">
                    Excelente! {validationResult.similarity}% de acurácia
                  </span>
                </div>
              )}

              {!validationResult?.isCorrect && showContent && (
                <div className="mb-4 flex items-center gap-2 text-amber-600">
                  <XCircle className="w-6 h-6" />
                  <span className="font-medium">
                    Resposta revelada (não contabilizado)
                  </span>
                </div>
              )}

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
            {!masteredItems.has(currentIndex) && (
              <Button 
                onClick={handleMarkMastered}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Marcar como Dominado
              </Button>
            )}
            <Button 
              onClick={handleNext}
              className="flex-1 gradient-gold text-secondary"
            >
              Próximo
              <ChevronRight className="w-4 h-4 ml-2" />
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
              Pular
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
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl+Enter</kbd> para verificar, 
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs ml-1">←</kbd> <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">→</kbd> para navegar
        </p>
      </div>
    </div>
  );
};

export default MemorizationExercise;
