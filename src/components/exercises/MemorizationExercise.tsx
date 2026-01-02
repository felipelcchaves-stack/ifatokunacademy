import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  RotateCcw, 
  CheckCircle,
  Lightbulb,
  Brain,
  Send,
  XCircle,
  AlertCircle,
  Layers,
  GitBranch,
  TrendingUp,
  Settings2,
  Volume2,
  Sparkles,
  Hand,
  Music,
  Blocks,
  Headphones,
  Accessibility
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { calculateSimilarity, getTextRemainder, getTextStart } from '@/lib/textSimilarity';
import { 
  splitIntoChunks, 
  generateScaffoldLevels, 
  calculateTextDifficulty,
  generateChainSequence,
  combineChunks,
  generateSummary,
  generateIntermediateText,
  countWords,
  TextChunk,
  ScaffoldLevel
} from '@/lib/textChunking';
import ChunkProgress from './ChunkProgress';
import MemorizationHints from './MemorizationHints';
import TapComplete from './TapComplete';
import KaraokeMode from './KaraokeMode';
import VisualBuilder from './VisualBuilder';
import MicrolearningMode from './MicrolearningMode';
import ListenRepeatMode from './ListenRepeatMode';
import AccessibilitySettings from './AccessibilitySettings';
import { ProgressiveLevelIndicator, AudioSourceSelector, AudioSource } from './ProgressiveLevelSelector';
import { useSpacedRepetition } from '@/hooks/useSpacedRepetition';
import { useAccessibilityPreferences } from '@/hooks/useAccessibilityPreferences';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface MemorizationItem {
  text: string;
  hint?: string;
  imageUrl?: string;
  // Novos campos para memorização progressiva
  summary?: string;       // Nível 1: Resumo (5-10 palavras)
  intermediate?: string;  // Nível 2: Intermediário (20-40 palavras)
  // Múltiplos áudios
  audioUrls?: AudioSource[];
}

interface MemorizationExerciseProps {
  items: MemorizationItem[];
  exerciseId?: string;
  lessonId?: string;
  moduleId?: string;
  onComplete?: () => void;
}

type StudyMode = 'classic' | 'scaffold' | 'chunk' | 'chain' | 'microlearning' | 'tap' | 'karaoke' | 'visual' | 'listen' | 'progressive';

const LONG_TEXT_THRESHOLD = 30; // palavras
const START_WORD_COUNT = 4;
const PROGRESSIVE_THRESHOLD = 15; // mínimo de palavras para ativar modo progressivo

// Helper to categorize text difficulty by word count
const categorizeDifficulty = (wordCount: number): {
  level: 'short' | 'medium' | 'long' | 'very_long';
  label: string;
  color: string;
  bgColor: string;
} => {
  if (wordCount <= 20) {
    return { level: 'short', label: 'Curto', color: 'text-green-700', bgColor: 'bg-green-100' };
  } else if (wordCount <= 40) {
    return { level: 'medium', label: 'Médio', color: 'text-yellow-700', bgColor: 'bg-yellow-100' };
  } else if (wordCount <= 70) {
    return { level: 'long', label: 'Longo', color: 'text-orange-700', bgColor: 'bg-orange-100' };
  } else {
    return { level: 'very_long', label: 'Muito Longo', color: 'text-red-700', bgColor: 'bg-red-100' };
  }
};

const MemorizationExercise: React.FC<MemorizationExerciseProps> = ({ 
  items, 
  exerciseId, 
  lessonId, 
  moduleId, 
  onComplete 
}) => {
  // Sort items by word count (shortest first) for progressive learning
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const wordsA = a.text.split(/\s+/).length;
      const wordsB = b.text.split(/\s+/).length;
      return wordsA - wordsB;
    });
  }, [items]);

  // Core state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [masteredItems, setMasteredItems] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<'learn' | 'review'>('learn');
  
  // Study mode state - Auto-select progressive mode for medium+ texts
  const [studyMode, setStudyMode] = useState<StudyMode>('classic');
  const [showModeSelector, setShowModeSelector] = useState(true);
  const [modeManuallySelected, setModeManuallySelected] = useState(false);
  
  // Progressive mode state (3 níveis: resumo, intermediário, completo)
  const [progressiveLevel, setProgressiveLevel] = useState<1 | 2 | 3>(1);
  const [levelsMastered, setLevelsMastered] = useState<Record<1 | 2 | 3, boolean>>({ 1: false, 2: false, 3: false });
  const [hasSeenFullText, setHasSeenFullText] = useState(false);
  
  // Audio source state
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  
  // Scaffold mode state
  const [scaffoldLevel, setScaffoldLevel] = useState(0);
  const [scaffoldLevels, setScaffoldLevels] = useState<ScaffoldLevel[]>([]);
  
  // Chunk mode state
  const [chunks, setChunks] = useState<TextChunk[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [masteredChunks, setMasteredChunks] = useState<Set<number>>(new Set());
  
  // Chain mode state
  const [chainStep, setChainStep] = useState(0);
  const [chainSequence, setChainSequence] = useState<ReturnType<typeof generateChainSequence>>([]);
  
  // Validation state
  const [userInput, setUserInput] = useState('');
  const [validationResult, setValidationResult] = useState<{
    similarity: number;
    isCorrect: boolean;
    showResult: boolean;
  } | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [hintPenalty, setHintPenalty] = useState(0);
  
  // Audio state
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const { addItem } = useSpacedRepetition(exerciseId);
  const { toast } = useToast();
  const { preferences } = useAccessibilityPreferences();

  const currentItem = sortedItems[currentIndex];
  const progress = (masteredItems.size / sortedItems.length) * 100;
  const isCompleted = masteredItems.size === sortedItems.length;
  
  // Calculate current item difficulty info
  const currentDifficultyInfo = useMemo(() => {
    if (!currentItem) return null;
    const wordCount = currentItem.text.split(/\s+/).length;
    return {
      wordCount,
      ...categorizeDifficulty(wordCount)
    };
  }, [currentItem]);

  // Calculate difficulty distribution for progress display
  const difficultyDistribution = useMemo(() => {
    const distribution = {
      short: { total: 0, mastered: 0 },
      medium: { total: 0, mastered: 0 },
      long: { total: 0, mastered: 0 },
      very_long: { total: 0, mastered: 0 }
    };
    
    sortedItems.forEach((item, index) => {
      const wordCount = item.text.split(/\s+/).length;
      const { level } = categorizeDifficulty(wordCount);
      distribution[level].total++;
      if (masteredItems.has(index)) {
        distribution[level].mastered++;
      }
    });
    
    return distribution;
  }, [sortedItems, masteredItems]);
  
  // Analyze text difficulty
  const textDifficulty = useMemo(() => {
    if (!currentItem) return null;
    return calculateTextDifficulty(currentItem.text);
  }, [currentItem]);

  const isLongText = textDifficulty && textDifficulty.wordCount >= LONG_TEXT_THRESHOLD;

  // Progressive mode: get text for each level
  const getProgressiveText = useCallback((item: MemorizationItem, level: 1 | 2 | 3): string => {
    switch (level) {
      case 1:
        return item.summary || generateSummary(item.text);
      case 2:
        return item.intermediate || generateIntermediateText(item.text);
      case 3:
        return item.text;
    }
  }, []);

  // Progressive mode: word counts for each level
  const progressiveWordCounts = useMemo(() => {
    if (!currentItem) return { level1: 0, level2: 0, level3: 0 };
    return {
      level1: countWords(getProgressiveText(currentItem, 1)),
      level2: countWords(getProgressiveText(currentItem, 2)),
      level3: countWords(getProgressiveText(currentItem, 3)),
    };
  }, [currentItem, getProgressiveText]);

  // Check if progressive mode should be available
  const canUseProgressiveMode = useMemo(() => {
    if (!currentItem) return false;
    const wordCount = countWords(currentItem.text);
    return wordCount >= PROGRESSIVE_THRESHOLD;
  }, [currentItem]);

  // Auto-select progressive mode for medium+ texts (if not manually selected)
  useEffect(() => {
    if (!currentItem || modeManuallySelected) return;
    
    const wordCount = countWords(currentItem.text);
    if (wordCount >= PROGRESSIVE_THRESHOLD) {
      // Auto-select progressive mode and hide selector for seamless experience
      setStudyMode('progressive');
      setShowModeSelector(false);
    }
  }, [currentItem, modeManuallySelected]);

  // Initialize study mode data when item changes
  useEffect(() => {
    if (!currentItem) return;

    const text = currentItem.text;
    
    if (studyMode === 'scaffold') {
      setScaffoldLevels(generateScaffoldLevels(text));
      setScaffoldLevel(0);
    } else if (studyMode === 'chunk' || studyMode === 'chain') {
      const newChunks = splitIntoChunks(text);
      setChunks(newChunks);
      setCurrentChunkIndex(0);
      setMasteredChunks(new Set());
      
      if (studyMode === 'chain') {
        setChainSequence(generateChainSequence(newChunks));
        setChainStep(0);
      }
    } else if (studyMode === 'progressive') {
      setProgressiveLevel(1);
      setLevelsMastered({ 1: false, 2: false, 3: false });
      setHasSeenFullText(false);
    }
  }, [currentItem, studyMode]);

  // Check if text is short (should type full text instead of remainder)
  const isShortText = useCallback((text: string): boolean => {
    const words = text.split(/\s+/);
    return words.length <= START_WORD_COUNT;
  }, []);

  // Get expected text based on mode
  const getExpectedText = useCallback(() => {
    if (!currentItem) return '';

    switch (studyMode) {
      case 'progressive':
        return getProgressiveText(currentItem, progressiveLevel);
      case 'scaffold':
        return scaffoldLevels[scaffoldLevel]?.hiddenText || '';
      case 'chunk':
        return chunks[currentChunkIndex]?.text || '';
      case 'chain':
        const currentChainStep = chainSequence[chainStep];
        if (currentChainStep) {
          return combineChunks(currentChainStep.chunksToMemorize);
        }
        return '';
      default:
        // Para textos curtos, espera o texto completo; para longos, espera o restante
        if (isShortText(currentItem.text)) {
          return currentItem.text;
        }
        return getTextRemainder(currentItem.text, START_WORD_COUNT);
    }
  }, [currentItem, studyMode, progressiveLevel, getProgressiveText, scaffoldLevel, scaffoldLevels, chunks, currentChunkIndex, chainSequence, chainStep, isShortText]);

  // Get visible text/prompt based on mode
  const getVisibleText = useCallback(() => {
    if (!currentItem) return '';

    switch (studyMode) {
      case 'progressive':
        // No modo progressivo, mostra o nível anterior como contexto
        if (progressiveLevel === 1) return '';
        if (progressiveLevel === 2) return '✓ ' + getProgressiveText(currentItem, 1);
        if (progressiveLevel === 3) return '✓ ' + getProgressiveText(currentItem, 2);
        return '';
      case 'scaffold':
        return scaffoldLevels[scaffoldLevel]?.visibleText || '';
      case 'chunk':
        // Show previous chunks as context
        const previousChunks = chunks.slice(0, currentChunkIndex);
        return previousChunks.map(c => c.text).join(' ');
      case 'chain':
        const currentChainStep = chainSequence[chainStep];
        if (currentChainStep?.isReview && currentChainStep.chunksToMemorize.length > 1) {
          return ''; // Full review, no visible text
        }
        // Show previous chunks
        const chainContext = chunks.slice(0, chainSequence[chainStep]?.chunksToMemorize[0]?.id || 0);
        return chainContext.map(c => c.text).join(' ');
      default:
        // Para textos curtos, não mostra pista (usuário digita tudo)
        if (isShortText(currentItem.text)) {
          return '';
        }
        return getTextStart(currentItem.text, START_WORD_COUNT);
    }
  }, [currentItem, studyMode, progressiveLevel, getProgressiveText, scaffoldLevel, scaffoldLevels, chunks, currentChunkIndex, chainSequence, chainStep, isShortText]);

  // Get similarity threshold based on mode and level
  const getSimilarityThreshold = useCallback(() => {
    const basePenalty = hintPenalty;
    let baseThreshold = 80;

    if (studyMode === 'progressive') {
      // Thresholds mais baixos para níveis iniciais
      baseThreshold = progressiveLevel === 1 ? 70 : progressiveLevel === 2 ? 75 : 80;
    } else if (studyMode === 'scaffold') {
      // Lower threshold for early scaffold levels
      baseThreshold = 60 + (scaffoldLevel * 5);
    } else if (studyMode === 'chunk') {
      baseThreshold = 75;
    }

    return Math.max(50, baseThreshold - basePenalty);
  }, [studyMode, progressiveLevel, scaffoldLevel, hintPenalty]);

  const expectedText = getExpectedText();
  const visibleText = getVisibleText();
  const similarityThreshold = getSimilarityThreshold();

  // Prevent duplicate onComplete calls
  const hasCalledComplete = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (isCompleted && mode === 'learn' && !hasCalledComplete.current) {
      hasCalledComplete.current = true;
      onCompleteRef.current?.();
    }
  }, [isCompleted, mode]);

  const resetItemState = useCallback(() => {
    setShowContent(false);
    setShowHint(false);
    setUserInput('');
    setValidationResult(null);
    setAttempts(0);
    setHintPenalty(0);
    setScaffoldLevel(0);
    setCurrentChunkIndex(0);
    setMasteredChunks(new Set());
    setChainStep(0);
    setAudioUrl(null);
    // Progressive mode reset
    setProgressiveLevel(1);
    setLevelsMastered({ 1: false, 2: false, 3: false });
    setHasSeenFullText(false);
    setSelectedAudioId(null);
    // Reset completion flag for new items
    hasCalledComplete.current = false;
  }, []);

  const handleNext = useCallback(() => {
    const nextIndex = currentIndex < sortedItems.length - 1 ? currentIndex + 1 : 0;
    
    // Check if we're transitioning to a new difficulty level
    if (nextIndex !== 0 && nextIndex < sortedItems.length) {
      const currentWordCount = sortedItems[currentIndex]?.text.split(/\s+/).length || 0;
      const nextWordCount = sortedItems[nextIndex]?.text.split(/\s+/).length || 0;
      const currentDiff = categorizeDifficulty(currentWordCount).level;
      const nextDiff = categorizeDifficulty(nextWordCount).level;
      
      if (currentDiff !== nextDiff) {
        const difficultyLabels = {
          short: 'textos curtos',
          medium: 'textos médios',
          long: 'textos longos',
          very_long: 'textos muito longos'
        };
        toast({
          title: "🎉 Novo nível de dificuldade!",
          description: `Parabéns! Agora você está nos ${difficultyLabels[nextDiff]}.`,
          duration: 4000,
        });
      }
    }
    
    setCurrentIndex(nextIndex);
    resetItemState();
  }, [currentIndex, sortedItems, resetItemState, toast]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      resetItemState();
    }
  };

  const addToSpacedRepetition = async (itemIndex: number, itemText: string, wasCorrect: boolean) => {
    if (!exerciseId) return;
    
    try {
      let easeFactor = 2.5;
      if (!wasCorrect) {
        easeFactor = attempts > 0 ? 2.0 : 1.5;
      }
      
      await addItem(exerciseId, itemIndex, itemText, {
        lessonId,
        moduleId,
        easeFactor,
      });
      
      if (!wasCorrect) {
        toast({
          title: "Adicionado à revisão",
          description: "Este item será revisado novamente em breve.",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error adding to spaced repetition:', error);
    }
  };

  const handleValidate = async () => {
    if (!userInput.trim()) return;
    
    const similarity = calculateSimilarity(expectedText, userInput);
    const adjustedThreshold = similarityThreshold;
    const isCorrect = similarity >= adjustedThreshold;
    
    setValidationResult({
      similarity,
      isCorrect,
      showResult: true
    });
    
    setAttempts(prev => prev + 1);
    
    if (isCorrect) {
      // Handle progression based on mode
      if (studyMode === 'progressive') {
        // Mark current level as mastered
        setLevelsMastered(prev => ({ ...prev, [progressiveLevel]: true }));
        
        if (progressiveLevel < 3) {
          // Move to next progressive level
          setTimeout(() => {
            setProgressiveLevel(prev => (prev + 1) as 1 | 2 | 3);
            setUserInput('');
            setValidationResult(null);
          }, 1500);
        } else {
          // Completed all 3 levels
          setMasteredItems(prev => new Set([...prev, currentIndex]));
          setShowContent(true);
          await addToSpacedRepetition(currentIndex, currentItem.text, true);
        }
      } else if (studyMode === 'scaffold') {
        if (scaffoldLevel < scaffoldLevels.length - 1) {
          // Move to next scaffold level
          setTimeout(() => {
            setScaffoldLevel(prev => prev + 1);
            setUserInput('');
            setValidationResult(null);
          }, 1500);
        } else {
          // Completed all scaffold levels
          setMasteredItems(prev => new Set([...prev, currentIndex]));
          setShowContent(true);
          await addToSpacedRepetition(currentIndex, currentItem.text, true);
        }
      } else if (studyMode === 'chunk') {
        setMasteredChunks(prev => new Set([...prev, currentChunkIndex]));
        
        if (currentChunkIndex < chunks.length - 1) {
          setTimeout(() => {
            setCurrentChunkIndex(prev => prev + 1);
            setUserInput('');
            setValidationResult(null);
          }, 1500);
        } else {
          setMasteredItems(prev => new Set([...prev, currentIndex]));
          setShowContent(true);
          await addToSpacedRepetition(currentIndex, currentItem.text, true);
        }
      } else if (studyMode === 'chain') {
        if (chainStep < chainSequence.length - 1) {
          setTimeout(() => {
            setChainStep(prev => prev + 1);
            setUserInput('');
            setValidationResult(null);
          }, 1500);
        } else {
          setMasteredItems(prev => new Set([...prev, currentIndex]));
          setShowContent(true);
          await addToSpacedRepetition(currentIndex, currentItem.text, true);
        }
      } else {
        setMasteredItems(prev => new Set([...prev, currentIndex]));
        setShowContent(true);
        await addToSpacedRepetition(currentIndex, currentItem.text, true);
      }
    } else {
      await addToSpacedRepetition(currentIndex, currentItem.text, false);
    }
  };

  const handleRevealWithoutValidation = async () => {
    setShowContent(true);
    setValidationResult({
      similarity: 0,
      isCorrect: false,
      showResult: false
    });
    await addToSpacedRepetition(currentIndex, currentItem.text, false);
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
    setShowModeSelector(true);
  };

  const handleStartReview = () => {
    setMode('review');
    setCurrentIndex(0);
    resetItemState();
  };

  const handleModeSelect = (newMode: StudyMode) => {
    setStudyMode(newMode);
    setShowModeSelector(false);
    setModeManuallySelected(true); // Mark as manually selected
    resetItemState();
  };

  const handleHintUsed = (hintLevel: number) => {
    const penalties = { 1: 5, 2: 10, 3: 15 };
    setHintPenalty(prev => prev + (penalties[hintLevel as keyof typeof penalties] || 0));
  };

  const handlePlayAudio = async () => {
    if (!currentItem) return;

    setAudioLoading(true);
    try {
      let textToSpeak = currentItem.text;
      
      if (studyMode === 'chunk' && chunks[currentChunkIndex]) {
        textToSpeak = chunks[currentChunkIndex].text;
      } else if (studyMode === 'chain' && chainSequence[chainStep]) {
        textToSpeak = combineChunks(chainSequence[chainStep].chunksToMemorize);
      }

      const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
        body: { text: textToSpeak, voiceId: 'onwK4e9ZLuTAKqWW03F9' }
      });

      if (error) throw error;

      if (data?.audioUrl) {
        setAudioUrl(data.audioUrl);
        const audio = new Audio(data.audioUrl);
        await audio.play();
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      toast({
        title: "Erro ao reproduzir áudio",
        description: "Não foi possível gerar o áudio.",
        variant: "destructive"
      });
    } finally {
      setAudioLoading(false);
    }
  };

  const handleChunkClick = (index: number) => {
    if (masteredChunks.has(index) || index === currentChunkIndex) {
      setCurrentChunkIndex(index);
      setUserInput('');
      setValidationResult(null);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  // Mode Selector Screen - show for long texts OR when progressive mode is available
  if (showModeSelector && (isLongText || canUseProgressiveMode)) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
        <div className="p-6 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-5 h-5 text-primary" />
            <span className="font-medium text-foreground">Texto Longo Detectado</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Este texto tem {textDifficulty?.wordCount} palavras. Recomendamos usar um modo de estudo especial.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <h3 className="font-serif text-lg font-semibold text-foreground mb-4">
            Escolha o modo de estudo:
          </h3>

          <div className="grid gap-3">
            {/* Progressive Mode - NEW recommended */}
            {canUseProgressiveMode && (
              <button
                onClick={() => handleModeSelect('progressive')}
                className="flex items-start gap-4 p-4 rounded-lg border-2 border-primary bg-primary/10 ring-2 ring-primary/20 text-left transition-all hover:border-primary/50"
              >
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Modo Progressivo</span>
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      ⭐ Recomendado
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Comece pelo resumo (5-10 palavras), depois versão intermediária, e por fim o texto completo. Construção gradual da memória.
                  </p>
                </div>
              </button>
            )}

            {/* Scaffold Mode */}
            <button
              onClick={() => handleModeSelect('scaffold')}
              className={cn(
                "flex items-start gap-4 p-4 rounded-lg border-2 text-left transition-all hover:border-primary/50 hover:bg-primary/5",
                !canUseProgressiveMode && textDifficulty?.recommendedMode === 'scaffold' 
                  ? "border-primary bg-primary/10 ring-2 ring-primary/20" 
                  : "border-border"
              )}
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Modo Escada</span>
                  {!canUseProgressiveMode && textDifficulty?.recommendedMode === 'scaffold' && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      Recomendado
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Começa mostrando 80% do texto e vai reduzindo até você recitar tudo. Ideal para textos de 20-50 palavras.
                </p>
              </div>
            </button>

            {/* Chunk Mode */}
            <button
              onClick={() => handleModeSelect('chunk')}
              className={cn(
                "flex items-start gap-4 p-4 rounded-lg border-2 text-left transition-all hover:border-primary/50 hover:bg-primary/5",
                textDifficulty?.recommendedMode === 'chunk' 
                  ? "border-primary bg-primary/10 ring-2 ring-primary/20" 
                  : "border-border"
              )}
            >
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Modo Fragmentos</span>
                  {textDifficulty?.recommendedMode === 'chunk' && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      Recomendado
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Divide o texto em partes menores (5-10 palavras). Memorize uma parte por vez. Ideal para 50-100 palavras.
                </p>
              </div>
            </button>

            {/* Chain Mode */}
            <button
              onClick={() => handleModeSelect('chain')}
              className={cn(
                "flex items-start gap-4 p-4 rounded-lg border-2 text-left transition-all hover:border-primary/50 hover:bg-primary/5",
                textDifficulty?.recommendedMode === 'chain' 
                  ? "border-primary bg-primary/10 ring-2 ring-primary/20" 
                  : "border-border"
              )}
            >
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                <GitBranch className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Modo Encadeamento</span>
                  {textDifficulty?.recommendedMode === 'chain' && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                      Recomendado
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Memoriza partes e depois conecta: 1 → 2 → 1+2 → 3 → 1+2+3... Ideal para textos longos (100+ palavras).
                </p>
              </div>
            </button>

            {/* Classic Mode */}
            <button
              onClick={() => handleModeSelect('classic')}
              className="flex items-start gap-4 p-4 rounded-lg border-2 border-border text-left transition-all hover:border-primary/50 hover:bg-primary/5"
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Brain className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <span className="font-semibold">Modo Clássico</span>
                <p className="text-sm text-muted-foreground mt-1">
                  Complete o texto a partir das primeiras palavras.
                </p>
              </div>
            </button>
          </div>

          {/* Inclusive Modes Section */}
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center gap-2 mb-4">
              <Accessibility className="w-4 h-4 text-primary" />
              <h4 className="font-medium text-sm text-foreground">Modos para Foco e Acessibilidade</h4>
            </div>
            
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Microlearning Mode */}
              <button
                onClick={() => handleModeSelect('microlearning')}
                className="flex items-start gap-3 p-3 rounded-lg border-2 border-border text-left transition-all hover:border-primary/50 hover:bg-primary/5"
              >
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <span className="font-medium text-sm">Microlearning</span>
                  <p className="text-xs text-muted-foreground">3-5 palavras por vez, pausas forçadas</p>
                </div>
              </button>

              {/* Tap Mode */}
              <button
                onClick={() => handleModeSelect('tap')}
                className="flex items-start gap-3 p-3 rounded-lg border-2 border-border text-left transition-all hover:border-primary/50 hover:bg-primary/5"
              >
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                  <Hand className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <span className="font-medium text-sm">Toque e Complete</span>
                  <p className="text-xs text-muted-foreground">Sem digitação, toque nas palavras</p>
                </div>
              </button>

              {/* Karaoke Mode */}
              <button
                onClick={() => handleModeSelect('karaoke')}
                className="flex items-start gap-3 p-3 rounded-lg border-2 border-border text-left transition-all hover:border-primary/50 hover:bg-primary/5"
              >
                <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center shrink-0">
                  <Music className="w-4 h-4 text-pink-600" />
                </div>
                <div>
                  <span className="font-medium text-sm">Karaokê Visual</span>
                  <p className="text-xs text-muted-foreground">Acompanhe palavra por palavra</p>
                </div>
              </button>

              {/* Visual Builder Mode */}
              <button
                onClick={() => handleModeSelect('visual')}
                className="flex items-start gap-3 p-3 rounded-lg border-2 border-border text-left transition-all hover:border-primary/50 hover:bg-primary/5"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <Blocks className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <span className="font-medium text-sm">Construção Visual</span>
                  <p className="text-xs text-muted-foreground">Monte o texto com blocos</p>
                </div>
              </button>

              {/* Listen & Repeat Mode */}
              <button
                onClick={() => handleModeSelect('listen')}
                className="flex items-start gap-3 p-3 rounded-lg border-2 border-border text-left transition-all hover:border-primary/50 hover:bg-primary/5 sm:col-span-2"
              >
                <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center shrink-0">
                  <Headphones className="w-4 h-4 text-cyan-600" />
                </div>
                <div>
                  <span className="font-medium text-sm">Escuta e Repete</span>
                  <p className="text-xs text-muted-foreground">Áudio primeiro, grave sua voz</p>
                </div>
              </button>
            </div>
          </div>

          {/* Accessibility Settings */}
          <div className="mt-4 pt-4 border-t border-border flex justify-center">
            <AccessibilitySettings />
          </div>
        </div>
      </div>
    );
  }

  // Render inclusive modes directly
  if (studyMode === 'microlearning') {
    return (
      <div className="bg-card rounded-xl border border-border shadow-soft p-6">
        <MicrolearningMode
          text={currentItem.text}
          onComplete={(correct) => {
            if (correct) {
              setMasteredItems(prev => new Set([...prev, currentIndex]));
            }
            handleNext();
          }}
          pauseDuration={preferences.pauseBetweenChunks}
        />
      </div>
    );
  }

  if (studyMode === 'tap') {
    return (
      <div className="bg-card rounded-xl border border-border shadow-soft p-6">
        <TapComplete
          text={currentItem.text}
          onComplete={(correct) => {
            if (correct) {
              setMasteredItems(prev => new Set([...prev, currentIndex]));
            }
            handleNext();
          }}
          onPlayAudio={handlePlayAudio}
          audioLoading={audioLoading}
        />
      </div>
    );
  }

  if (studyMode === 'karaoke') {
    return (
      <div className="bg-card rounded-xl border border-border shadow-soft p-6">
        <KaraokeMode
          text={currentItem.text}
          onComplete={() => {
            setMasteredItems(prev => new Set([...prev, currentIndex]));
            handleNext();
          }}
        />
      </div>
    );
  }

  if (studyMode === 'visual') {
    return (
      <div className="bg-card rounded-xl border border-border shadow-soft p-6">
        <VisualBuilder
          text={currentItem.text}
          onComplete={(correct) => {
            if (correct) {
              setMasteredItems(prev => new Set([...prev, currentIndex]));
            }
            handleNext();
          }}
          onPlayAudio={handlePlayAudio}
          audioLoading={audioLoading}
        />
      </div>
    );
  }

  if (studyMode === 'listen') {
    return (
      <div className="bg-card rounded-xl border border-border shadow-soft p-6">
        <ListenRepeatMode
          text={currentItem.text}
          onComplete={(correct) => {
            if (correct) {
              setMasteredItems(prev => new Set([...prev, currentIndex]));
            }
            handleNext();
          }}
        />
      </div>
    );
  }

  // Get progress info based on mode
  const getModeProgress = () => {
    switch (studyMode) {
      case 'scaffold':
        return {
          current: scaffoldLevel + 1,
          total: scaffoldLevels.length,
          label: `Nível ${scaffoldLevel + 1} de ${scaffoldLevels.length}`
        };
      case 'chunk':
        return {
          current: masteredChunks.size,
          total: chunks.length,
          label: `Trecho ${currentChunkIndex + 1} de ${chunks.length}`
        };
      case 'chain':
        return {
          current: chainStep + 1,
          total: chainSequence.length,
          label: chainSequence[chainStep]?.description || ''
        };
      default:
        return null;
    }
  };

  const modeProgress = getModeProgress();

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
            {studyMode !== 'classic' && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">
                {studyMode === 'progressive' ? 'Progressivo' : studyMode === 'scaffold' ? 'Escada' : studyMode === 'chunk' ? 'Fragmentos' : studyMode === 'chain' ? 'Encadeamento' : studyMode}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Difficulty Badge */}
            {currentDifficultyInfo && (
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium",
                currentDifficultyInfo.bgColor,
                currentDifficultyInfo.color
              )}>
                {currentDifficultyInfo.label} • {currentDifficultyInfo.wordCount} palavras
              </span>
            )}
            {(isLongText || canUseProgressiveMode) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowModeSelector(true)}
                className="h-7 px-2"
                title="Configurar modo de estudo"
              >
                <Settings2 className="w-4 h-4" />
              </Button>
            )}
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} de {sortedItems.length}
            </span>
          </div>
        </div>
        
        <Progress value={progress} className="h-2" />
        
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{masteredItems.size} dominados</span>
          {modeProgress && <span>{modeProgress.label}</span>}
          <span>{sortedItems.length - masteredItems.size} restantes</span>
        </div>

        {/* Difficulty Distribution Mini-bar */}
        <div className="flex gap-1 mt-2">
          {difficultyDistribution.short.total > 0 && (
            <div className="flex items-center gap-1">
              <div className="h-1.5 bg-green-200 rounded-full overflow-hidden" style={{ width: `${difficultyDistribution.short.total * 8}px` }}>
                <div 
                  className="h-full bg-green-500 rounded-full transition-all duration-300" 
                  style={{ width: `${(difficultyDistribution.short.mastered / difficultyDistribution.short.total) * 100}%` }}
                />
              </div>
            </div>
          )}
          {difficultyDistribution.medium.total > 0 && (
            <div className="flex items-center gap-1">
              <div className="h-1.5 bg-yellow-200 rounded-full overflow-hidden" style={{ width: `${difficultyDistribution.medium.total * 8}px` }}>
                <div 
                  className="h-full bg-yellow-500 rounded-full transition-all duration-300" 
                  style={{ width: `${(difficultyDistribution.medium.mastered / difficultyDistribution.medium.total) * 100}%` }}
                />
              </div>
            </div>
          )}
          {difficultyDistribution.long.total > 0 && (
            <div className="flex items-center gap-1">
              <div className="h-1.5 bg-orange-200 rounded-full overflow-hidden" style={{ width: `${difficultyDistribution.long.total * 8}px` }}>
                <div 
                  className="h-full bg-orange-500 rounded-full transition-all duration-300" 
                  style={{ width: `${(difficultyDistribution.long.mastered / difficultyDistribution.long.total) * 100}%` }}
                />
              </div>
            </div>
          )}
          {difficultyDistribution.very_long.total > 0 && (
            <div className="flex items-center gap-1">
              <div className="h-1.5 bg-red-200 rounded-full overflow-hidden" style={{ width: `${difficultyDistribution.very_long.total * 8}px` }}>
                <div 
                  className="h-full bg-red-500 rounded-full transition-all duration-300" 
                  style={{ width: `${(difficultyDistribution.very_long.mastered / difficultyDistribution.very_long.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chunk Progress (for chunk/chain modes) */}
      {(studyMode === 'chunk' || studyMode === 'chain') && chunks.length > 1 && !showContent && (
        <div className="p-4 border-b border-border bg-muted/10">
          <ChunkProgress
            chunks={chunks}
            masteredChunks={masteredChunks}
            currentChunkIndex={studyMode === 'chain' 
              ? chainSequence[chainStep]?.chunksToMemorize[0]?.id || 0 
              : currentChunkIndex
            }
            onChunkClick={studyMode === 'chunk' ? handleChunkClick : undefined}
            showChainLinks={studyMode === 'chain'}
          />
        </div>
      )}

      {/* Card */}
      <div className="p-8">
        <div 
          className={cn(
            "min-h-[300px] rounded-xl border-2 border-dashed border-border p-6",
            "flex flex-col items-center justify-center text-center",
            "transition-all duration-300",
            showContent ? 'bg-primary/5 border-primary/30' : 'bg-muted/30',
            validationResult?.isCorrect && 'bg-green-50 border-green-300',
            validationResult?.showResult && !validationResult?.isCorrect && 'bg-amber-50 border-amber-300'
          )}
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
              {/* Progressive Level Indicator */}
              {studyMode === 'progressive' && (
                <div className="mb-4 w-full">
                  <ProgressiveLevelIndicator
                    currentLevel={progressiveLevel}
                    levelsMastered={levelsMastered}
                    wordCounts={progressiveWordCounts}
                  />
                </div>
              )}

              {/* Visible Text Prompt */}
              <div className="mb-4 w-full">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  {studyMode === 'progressive'
                    ? progressiveLevel === 1 
                      ? 'Memorize o resumo:'
                      : progressiveLevel === 2
                      ? 'Agora o texto intermediário:'
                      : 'Texto completo:'
                    : studyMode === 'scaffold' 
                    ? `Complete (${scaffoldLevels[scaffoldLevel]?.visiblePercent || 0}% visível):`
                    : studyMode === 'chunk'
                    ? `Memorize o trecho ${currentChunkIndex + 1}:`
                    : studyMode === 'chain'
                    ? chainSequence[chainStep]?.description || 'Complete:'
                    : currentItem && isShortText(currentItem.text)
                    ? 'Digite o verso completo:'
                    : 'Complete o verso:'
                  }
                </p>
                
                {/* Progressive mode: show text to memorize */}
                {studyMode === 'progressive' && (
                  <div className="bg-muted/50 rounded-lg p-4 mb-3">
                    <p className="font-serif text-lg text-foreground leading-relaxed">
                      {getProgressiveText(currentItem, progressiveLevel)}
                    </p>
                  </div>
                )}
                
                {visibleText && studyMode !== 'progressive' && (
                  <p className="font-serif text-lg text-foreground/70 mb-2">
                    {visibleText}
                  </p>
                )}
                
                {/* Progressive mode: show previous levels as context */}
                {studyMode === 'progressive' && visibleText && (
                  <p className="font-serif text-sm text-muted-foreground mb-2">
                    {visibleText}
                  </p>
                )}
                
                {studyMode === 'scaffold' && scaffoldLevels[scaffoldLevel]?.hint && (
                  <p className="font-mono text-sm text-primary/60 mt-2">
                    {scaffoldLevels[scaffoldLevel].hint}
                  </p>
                )}
              </div>

              {/* Hints Component */}
              {!validationResult?.showResult && (
                <div className="mb-4 w-full max-w-md">
                  <MemorizationHints
                    text={expectedText}
                    exerciseId={exerciseId}
                    lessonId={lessonId}
                    moduleId={moduleId}
                    onHintUsed={handleHintUsed}
                    onPlayAudio={handlePlayAudio}
                    audioLoading={audioLoading}
                    showAudioSourceSelector={true}
                  />
                </div>
              )}

              {/* Legacy Hint */}
              {currentItem.hint && !validationResult?.showResult && (
                <div className="mb-4">
                  {showHint ? (
                    <div className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      <span className="text-sm">{currentItem.hint}</span>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={handleToggleHint}>
                      <Lightbulb className="w-4 h-4 mr-2" />
                      Ver Dica do Autor
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
                    Mínimo necessário: {similarityThreshold}%
                    {hintPenalty > 0 && ` (ajustado por dicas: -${hintPenalty}%)`}
                  </p>
                </div>
              )}

              {validationResult?.isCorrect && (studyMode === 'scaffold' || studyMode === 'chunk' || studyMode === 'chain' || studyMode === 'progressive') && (
                <div className="mb-4 flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">
                    {studyMode === 'progressive' && progressiveLevel < 3 
                      ? `Nível ${progressiveLevel} dominado! Avançando para o nível ${progressiveLevel + 1}...`
                      : 'Correto! Avançando...'
                    }
                  </span>
                </div>
              )}

              {/* Input Area */}
              <div className="w-full max-w-lg">
                <Textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder={
                    studyMode === 'chunk' || studyMode === 'chain'
                      ? "Digite o trecho..."
                      : studyMode === 'classic' && currentItem && isShortText(currentItem.text)
                      ? "Digite o verso completo..."
                      : "Digite o restante do verso..."
                  }
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
                  ) : !validationResult.isCorrect ? (
                    <Button 
                      onClick={handleTryAgain}
                      variant="outline"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Tentar Novamente
                    </Button>
                  ) : null}
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
