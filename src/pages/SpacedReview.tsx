import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Brain, 
  Calendar, 
  CheckCircle, 
  ChevronRight, 
  Clock, 
  RotateCcw,
  Send,
  Trophy,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ContentProtection from '@/components/ContentProtection';
import { useSpacedRepetition, SpacedRepetitionItem } from '@/hooks/useSpacedRepetition';
import { calculateSimilarity, getTextStart, getTextRemainder } from '@/lib/textSimilarity';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SIMILARITY_THRESHOLD = 80;
const START_WORD_COUNT = 4;

const SpacedReview: React.FC = () => {
  const navigate = useNavigate();
  const { dueItems, allItems, loading, dueCount, recordReview, removeItem, refreshItems } = useSpacedRepetition();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<{ similarity: number; correct: boolean } | null>(null);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const currentItem = dueItems[currentIndex];
  const isSessionComplete = currentIndex >= dueItems.length || dueItems.length === 0;

  const handleVerify = async () => {
    if (!currentItem || !userInput.trim()) return;

    const expectedText = getTextRemainder(currentItem.item_text, START_WORD_COUNT);
    const similarity = calculateSimilarity(expectedText, userInput);
    const isCorrect = similarity >= SIMILARITY_THRESHOLD;

    setLastResult({ similarity, correct: isCorrect });
    setShowResult(true);

    await recordReview(currentItem.id, isCorrect);
    setReviewedCount(prev => prev + 1);
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
    }
  };

  const handleNext = () => {
    setCurrentIndex(prev => prev + 1);
    setUserInput('');
    setShowResult(false);
    setLastResult(null);
  };

  const handleRemoveItem = async () => {
    if (!currentItem) return;
    await removeItem(currentItem.id);
    setShowResult(false);
    setLastResult(null);
    setUserInput('');
  };

  const handleRestart = () => {
    refreshItems();
    setCurrentIndex(0);
    setUserInput('');
    setShowResult(false);
    setLastResult(null);
    setReviewedCount(0);
    setCorrectCount(0);
  };

  if (loading) {
    return (
      <ContentProtection>
        <div className="min-h-screen flex flex-col bg-background">
          <Header />
          <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Carregando revisões...</p>
            </div>
          </main>
          <Footer />
        </div>
      </ContentProtection>
    );
  }

  return (
    <ContentProtection>
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <Brain className="w-8 h-8 text-primary" />
                <h1 className="font-serif text-3xl font-bold text-foreground">
                  Revisão Espaçada
                </h1>
              </div>
              <p className="text-muted-foreground">
                Revise os itens que precisam de reforço para consolidar sua memória.
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold">{dueCount}</p>
                  <p className="text-xs text-muted-foreground">Pendentes hoje</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Brain className="w-6 h-6 text-primary mx-auto mb-1" />
                  <p className="text-2xl font-bold">{allItems.length}</p>
                  <p className="text-xs text-muted-foreground">Total de itens</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold">{reviewedCount}</p>
                  <p className="text-xs text-muted-foreground">Revisados hoje</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Trophy className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
                  <p className="text-2xl font-bold">
                    {reviewedCount > 0 ? Math.round((correctCount / reviewedCount) * 100) : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Acertos</p>
                </CardContent>
              </Card>
            </div>

            {/* Review Card */}
            {isSessionComplete ? (
              <Card className="border-2 border-green-200 bg-green-50">
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h2 className="font-serif text-2xl font-bold text-green-800 mb-2">
                    Revisão Completa!
                  </h2>
                  <p className="text-green-700 mb-6">
                    {reviewedCount > 0 
                      ? `Você revisou ${reviewedCount} itens com ${correctCount} acertos (${Math.round((correctCount / reviewedCount) * 100)}%).`
                      : 'Não há itens pendentes para revisão no momento.'}
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Button variant="outline" onClick={() => navigate('/dashboard')}>
                      Voltar ao Dashboard
                    </Button>
                    <Button onClick={handleRestart} className="gradient-gold text-secondary">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Verificar Novamente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="border-b border-border">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Item {currentIndex + 1} de {dueItems.length}
                    </CardTitle>
                    <span className="text-sm text-muted-foreground">
                      Próxima revisão em: {currentItem.interval_days} dias
                    </span>
                  </div>
                  <Progress value={((currentIndex) / dueItems.length) * 100} className="h-2" />
                </CardHeader>
                
                <CardContent className="p-6">
                  {/* Prompt */}
                  <div className="mb-6 text-center">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                      Complete o verso:
                    </p>
                    <p className="font-serif text-2xl text-primary font-medium">
                      {getTextStart(currentItem.item_text, START_WORD_COUNT)}
                    </p>
                  </div>

                  {/* Result Feedback */}
                  {showResult && lastResult && (
                    <div className={`mb-4 p-4 rounded-lg text-center ${
                      lastResult.correct 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-amber-50 border border-amber-200'
                    }`}>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        {lastResult.correct ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="font-medium text-green-800">
                              Correto! {lastResult.similarity}% de acurácia
                            </span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                            <span className="font-medium text-amber-800">
                              {lastResult.similarity}% - Precisa revisar mais
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground font-serif">
                        {currentItem.item_text}
                      </p>
                    </div>
                  )}

                  {/* Input Area */}
                  {!showResult && (
                    <div className="mb-4">
                      <Textarea
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Digite o restante do verso..."
                        className="min-h-[100px] text-center font-serif text-lg resize-none"
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 justify-center">
                    {!showResult ? (
                      <Button 
                        onClick={handleVerify}
                        disabled={!userInput.trim()}
                        className="gradient-gold text-secondary shadow-gold"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Verificar
                      </Button>
                    ) : (
                      <>
                        <Button 
                          variant="outline"
                          onClick={handleRemoveItem}
                          className="text-destructive"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Remover Item
                        </Button>
                        <Button 
                          onClick={handleNext}
                          className="gradient-gold text-secondary"
                        >
                          Próximo
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Reviews */}
            {allItems.length > 0 && (
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Próximas Revisões
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {allItems.slice(0, 10).map(item => (
                      <div 
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                      >
                        <p className="text-sm font-serif truncate flex-1 mr-4">
                          {getTextStart(item.item_text, 6)}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          new Date(item.next_review_at) <= new Date()
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {new Date(item.next_review_at) <= new Date()
                            ? 'Agora'
                            : formatDistanceToNow(new Date(item.next_review_at), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </ContentProtection>
  );
};

export default SpacedReview;
