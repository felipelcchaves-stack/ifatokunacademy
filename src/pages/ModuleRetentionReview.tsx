import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { Brain, ChevronLeft, CheckCircle, XCircle, Loader2, Trophy, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ContentProtection from '@/components/ContentProtection';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useModuleRetention } from '@/hooks/useModuleRetention';
import { useSpacedRepetition } from '@/hooks/useSpacedRepetition';
import { calculateSimilarity, getTextRemainder, getTextStart } from '@/lib/textSimilarity';
import { cn } from '@/lib/utils';

const SIMILARITY_THRESHOLD = 80;
const START_WORD_COUNT = 4;
const REVIEW_ITEM_COUNT = 5; // Number of items to review

interface ReviewItem {
  id: string;
  item_text: string;
  exercise_id: string | null;
}

const ModuleRetentionReview: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { getOrgPath } = useOrgNavigate();
  const { user } = useAuth();
  const { updateRetentionAfterReview } = useModuleRetention();
  const { recordReview } = useSpacedRepetition();

  const [loading, setLoading] = useState(true);
  const [moduleTitle, setModuleTitle] = useState('');
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [similarity, setSimilarity] = useState(0);
  
  const [correctCount, setCorrectCount] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const fetchReviewItems = async () => {
      if (!user?.id || !moduleId) return;

      setLoading(true);
      try {
        // Fetch module title
        const { data: moduleData } = await supabase
          .from('modules')
          .select('title')
          .eq('id', moduleId)
          .single();
        
        if (moduleData) {
          setModuleTitle(moduleData.title);
        }

        // Fetch random items from this module for review
        const { data: items, error } = await supabase
          .from('spaced_repetition_items')
          .select('id, item_text, exercise_id')
          .eq('user_id', user.id)
          .eq('module_id', moduleId)
          .order('next_review_at', { ascending: true })
          .limit(REVIEW_ITEM_COUNT);

        if (error) throw error;

        if (items && items.length > 0) {
          // Shuffle items for variety
          const shuffled = [...items].sort(() => Math.random() - 0.5);
          setReviewItems(shuffled);
        }
      } catch (error) {
        console.error('Error fetching review items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReviewItems();
  }, [user?.id, moduleId]);

  const currentItem = reviewItems[currentIndex];
  const expectedText = currentItem ? getTextRemainder(currentItem.item_text, START_WORD_COUNT) : '';
  const textStart = currentItem ? getTextStart(currentItem.item_text, START_WORD_COUNT) : '';
  const progress = reviewItems.length > 0 ? ((reviewedCount) / reviewItems.length) * 100 : 0;

  const handleVerify = useCallback(async () => {
    if (!userInput.trim() || !currentItem) return;

    const sim = calculateSimilarity(expectedText, userInput);
    const correct = sim >= SIMILARITY_THRESHOLD;

    setSimilarity(sim);
    setIsCorrect(correct);
    setShowResult(true);

    if (correct) {
      setCorrectCount(prev => prev + 1);
    }
    
    setReviewedCount(prev => prev + 1);

    // Record the review in spaced repetition
    await recordReview(currentItem.id, correct);
  }, [userInput, currentItem, expectedText, recordReview]);

  const handleNext = useCallback(async () => {
    if (currentIndex < reviewItems.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setUserInput('');
      setShowResult(false);
      setIsCorrect(false);
      setSimilarity(0);
    } else {
      // Review complete
      setIsComplete(true);
      
      // Update module retention schedule
      if (moduleId) {
        await updateRetentionAfterReview(moduleId, reviewedCount, correctCount);
      }
    }
  }, [currentIndex, reviewItems.length, moduleId, reviewedCount, correctCount, updateRetentionAfterReview]);

  const handleReveal = () => {
    setSimilarity(0);
    setIsCorrect(false);
    setShowResult(true);
    setReviewedCount(prev => prev + 1);
  };

  const retentionScore = reviewedCount > 0 ? Math.round((correctCount / reviewedCount) * 100) : 0;

  if (loading) {
    return (
      <ContentProtection>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="pt-24 pb-16 flex items-center justify-center">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Carregando revisão...</span>
            </div>
          </main>
        </div>
      </ContentProtection>
    );
  }

  if (reviewItems.length === 0) {
    return (
      <ContentProtection>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="pt-24 pb-16">
            <div className="container mx-auto px-4 max-w-2xl">
              <div className="bg-card rounded-2xl border border-border p-8 text-center">
                <Brain className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="heading-display text-2xl mb-2">Nenhum item para revisar</h2>
                <p className="text-muted-foreground mb-6">
                  Você ainda não tem itens de memorização neste módulo.
                </p>
                <Button onClick={() => navigate(getOrgPath(`/module/${moduleId}`))}>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Voltar ao Módulo
                </Button>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </ContentProtection>
    );
  }

  if (isComplete) {
    return (
      <ContentProtection>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="pt-24 pb-16">
            <div className="container mx-auto px-4 max-w-2xl">
              <div className="bg-card rounded-2xl border border-border p-8 text-center">
                <Trophy className={cn(
                  "w-20 h-20 mx-auto mb-4",
                  retentionScore >= 90 ? "text-green-500" :
                  retentionScore >= 70 ? "text-amber-500" : "text-red-500"
                )} />
                
                <h2 className="heading-display text-3xl mb-2">Revisão Concluída!</h2>
                
                <div className="text-6xl font-bold mb-2">
                  {retentionScore}%
                </div>
                <p className="text-muted-foreground mb-6">
                  de retenção em {moduleTitle}
                </p>

                <div className="flex items-center justify-center gap-8 mb-8">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-green-600 text-2xl font-bold">
                      <CheckCircle className="w-6 h-6" />
                      {correctCount}
                    </div>
                    <p className="text-xs text-muted-foreground">Corretos</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-red-500 text-2xl font-bold">
                      <XCircle className="w-6 h-6" />
                      {reviewedCount - correctCount}
                    </div>
                    <p className="text-xs text-muted-foreground">Erros</p>
                  </div>
                </div>

                <div className={cn(
                  "p-4 rounded-lg mb-6",
                  retentionScore >= 90 ? "bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-900" :
                  retentionScore >= 70 ? "bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900" :
                  "bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900"
                )}>
                  <p className={cn(
                    "font-medium",
                    retentionScore >= 90 ? "text-green-700 dark:text-green-300" :
                    retentionScore >= 70 ? "text-amber-700 dark:text-amber-300" :
                    "text-red-700 dark:text-red-300"
                  )}>
                    {retentionScore >= 90 
                      ? "Excelente! Sua memória está firme. Próxima revisão em mais tempo."
                      : retentionScore >= 70
                        ? "Bom trabalho! Continue praticando para melhorar."
                        : "Atenção! Considere revisar este conteúdo novamente em breve."}
                  </p>
                </div>

                <div className="flex gap-4 justify-center">
                  <Button variant="outline" onClick={() => navigate(getOrgPath('/dashboard'))}>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                  <Button 
                    onClick={() => window.location.reload()}
                    className="gradient-forest text-primary-foreground"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Revisar Novamente
                  </Button>
                </div>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </ContentProtection>
    );
  }

  return (
    <ContentProtection>
      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-2xl">
            {/* Header */}
            <div className="mb-6">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/dashboard')}
                className="mb-4"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              
              <div className="flex items-center gap-3 mb-2">
                <Brain className="w-6 h-6 text-primary" />
                <h1 className="heading-display text-2xl">Revisão de Retenção</h1>
              </div>
              <p className="text-muted-foreground">{moduleTitle}</p>
            </div>

            {/* Progress */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  {reviewedCount} de {reviewItems.length}
                </span>
                <span className="font-medium text-primary">{correctCount} corretos</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Review Card */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className={cn(
                "p-8 min-h-[300px] flex flex-col items-center justify-center text-center transition-all duration-300",
                showResult && isCorrect && "bg-green-50 dark:bg-green-950/30",
                showResult && !isCorrect && "bg-amber-50 dark:bg-amber-950/30"
              )}>
                {!showResult ? (
                  <>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">
                      Complete o verso:
                    </p>
                    <p className="font-serif text-2xl text-primary font-medium mb-6">
                      {textStart}
                    </p>

                    <div className="w-full max-w-md">
                      <Textarea
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Digite o restante..."
                        className="min-h-[100px] text-center font-serif text-lg resize-none"
                      />
                      
                      <div className="flex gap-2 mt-4 justify-center">
                        <Button 
                          onClick={handleVerify}
                          disabled={!userInput.trim()}
                          className="gradient-forest text-primary-foreground"
                        >
                          Verificar
                        </Button>
                        <Button variant="ghost" onClick={handleReveal}>
                          Revelar
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={cn(
                      "mb-4 flex items-center gap-2",
                      isCorrect ? "text-green-600" : "text-amber-600"
                    )}>
                      {isCorrect ? (
                        <>
                          <CheckCircle className="w-8 h-8" />
                          <span className="text-xl font-bold">{similarity}% de acurácia</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-8 h-8" />
                          <span className="text-xl font-bold">
                            {similarity > 0 ? `${similarity}% - Quase lá!` : 'Resposta revelada'}
                          </span>
                        </>
                      )}
                    </div>

                    <p className="font-serif text-xl text-foreground leading-relaxed whitespace-pre-wrap mb-6">
                      {currentItem?.item_text}
                    </p>

                    <Button onClick={handleNext} className="gradient-gold text-secondary">
                      {currentIndex < reviewItems.length - 1 ? 'Próximo' : 'Ver Resultado'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </ContentProtection>
  );
};

export default ModuleRetentionReview;
