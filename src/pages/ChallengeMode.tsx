import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ContentProtection from '@/components/ContentProtection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChallengeTimer } from '@/components/challenge/ChallengeTimer';
import { ChallengeCard } from '@/components/challenge/ChallengeCard';
import { ChallengeResults } from '@/components/challenge/ChallengeResults';
import { useChallenge } from '@/hooks/useChallenge';
import { useSpacedRepetition } from '@/hooks/useSpacedRepetition';
import { useExperience } from '@/hooks/useExperience';
import { useAchievementTriggers } from '@/hooks/useAchievementTriggers';
import { showAchievementUnlockToast } from '@/components/achievements/AchievementUnlockToast';
import { useAchievements } from '@/hooks/useAchievements';
import { Trophy, Zap, Play, Loader2 } from 'lucide-react';

type ChallengePhase = 'ready' | 'playing' | 'finished';

const ChallengeMode: React.FC = () => {
  const navigate = useNavigate();
  const { bestRecord, saveRecord, calculatePoints, CHALLENGE_DURATION, loading: recordsLoading } = useChallenge();
  const { allItems, loading: itemsLoading } = useSpacedRepetition();
  const { addXP } = useExperience();
  const { onChallengeComplete, onStudySessionStart } = useAchievementTriggers();
  const { checkAllAchievements } = useAchievements();

  const [phase, setPhase] = useState<ChallengePhase>('ready');
  const [timeRemaining, setTimeRemaining] = useState(CHALLENGE_DURATION);
  const [score, setScore] = useState(0);
  const [itemsAnswered, setItemsAnswered] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [shuffledItems, setShuffledItems] = useState<typeof allItems>([]);
  const [xpGained, setXpGained] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);

  // Shuffle items when starting
  const shuffleItems = useCallback(() => {
    const shuffled = [...allItems].sort(() => Math.random() - 0.5);
    setShuffledItems(shuffled);
  }, [allItems]);

  // Timer effect
  useEffect(() => {
    if (phase !== 'playing') return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setPhase('finished');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  // Save record and check achievements when finished
  useEffect(() => {
    if (phase === 'finished' && itemsAnswered > 0) {
      const timeUsed = CHALLENGE_DURATION - timeRemaining;
      const timeMs = (Date.now() - startTime);
      saveRecord(score, itemsAnswered, correctCount, timeUsed);
      
      // Calculate XP: base + bonus for performance
      const baseXP = correctCount * 5;
      const bonusXP = correctCount >= 20 ? 50 : correctCount >= 10 ? 25 : 0;
      const totalXP = baseXP + bonusXP;
      setXpGained(totalXP);
      
      if (totalXP > 0) {
        addXP(totalXP, 'challenge_item');
      }

      // Trigger achievement check for challenge completion
      onChallengeComplete(score, correctCount, timeMs).then(async () => {
        // Also check all achievements to catch any new unlocks
        const newAchievements = await checkAllAchievements();
        newAchievements.forEach(achievement => {
          showAchievementUnlockToast(achievement);
        });
      });
    }
  }, [phase]);

  const handleStart = () => {
    shuffleItems();
    setTimeRemaining(CHALLENGE_DURATION);
    setScore(0);
    setItemsAnswered(0);
    setCorrectCount(0);
    setCurrentItemIndex(0);
    setXpGained(0);
    setStartTime(Date.now());
    setPhase('playing');
    
    // Check time-based achievements
    onStudySessionStart();
  };

  const handleAnswer = (correct: boolean, responseTimeMs: number) => {
    const points = calculatePoints(correct, responseTimeMs);
    setScore((prev) => prev + points);
    setItemsAnswered((prev) => prev + 1);
    if (correct) {
      setCorrectCount((prev) => prev + 1);
    }

    // Move to next item or loop
    setCurrentItemIndex((prev) => {
      if (prev + 1 >= shuffledItems.length) {
        shuffleItems();
        return 0;
      }
      return prev + 1;
    });
  };

  const currentItem = shuffledItems[currentItemIndex];
  const loading = recordsLoading || itemsLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <ContentProtection>
        <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
          {phase === 'ready' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Zap className="w-8 h-8" />
                  <h1 className="text-3xl font-bold">Modo Desafio</h1>
                </div>
                <p className="text-muted-foreground">
                  Responda o máximo de itens em 5 minutos!
                </p>
              </div>

              {/* Best Record */}
              {bestRecord && (
                <Card>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        <span className="text-muted-foreground">Seu recorde:</span>
                      </div>
                      <span className="text-2xl font-bold text-primary">{bestRecord.score} pts</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Rules */}
              <Card>
                <CardHeader>
                  <CardTitle>Como funciona</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 font-bold">3x</div>
                    <div>
                      <p className="font-medium">Resposta em menos de 3s</p>
                      <p className="text-sm text-muted-foreground">Triplo de pontos!</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 font-bold">2x</div>
                    <div>
                      <p className="font-medium">Resposta em menos de 5s</p>
                      <p className="text-sm text-muted-foreground">Dobro de pontos!</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 font-bold">1.5x</div>
                    <div>
                      <p className="font-medium">Resposta em menos de 10s</p>
                      <p className="text-sm text-muted-foreground">Bônus de 50%!</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Items Available */}
              {allItems.length === 0 ? (
                <Card className="border-yellow-500/50 bg-yellow-500/10">
                  <CardContent className="py-6 text-center">
                    <p className="text-yellow-500 font-medium">
                      Você ainda não tem itens para revisar.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Complete alguns exercícios de memorização primeiro!
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => navigate('/dashboard')}
                    >
                      Ir para o Dashboard
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Button
                  size="lg"
                  className="w-full text-lg py-6"
                  onClick={handleStart}
                >
                  <Play className="w-5 h-5 mr-2" />
                  Iniciar Desafio ({allItems.length} itens disponíveis)
                </Button>
              )}
            </div>
          )}

          {phase === 'playing' && currentItem && (
            <div className="space-y-6">
              {/* Timer and Score */}
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Pontuação</p>
                  <p className="text-3xl font-bold text-primary">{score}</p>
                </div>
                <ChallengeTimer
                  timeRemaining={timeRemaining}
                  totalTime={CHALLENGE_DURATION}
                />
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Acertos</p>
                  <p className="text-3xl font-bold text-green-500">{correctCount}</p>
                </div>
              </div>

              {/* Challenge Card */}
              <ChallengeCard
                prompt={currentItem.item_text}
                answer={currentItem.item_text}
                onAnswer={handleAnswer}
                isActive={phase === 'playing'}
              />

              {/* Progress */}
              <div className="text-center text-sm text-muted-foreground">
                Respondidos: {itemsAnswered}
              </div>
            </div>
          )}

          {phase === 'finished' && (
            <ChallengeResults
              score={score}
              itemsAnswered={itemsAnswered}
              correctCount={correctCount}
              timeUsed={CHALLENGE_DURATION - timeRemaining}
              bestScore={bestRecord?.score ?? null}
              xpGained={xpGained}
              onRestart={handleStart}
            />
          )}
        </main>
      </ContentProtection>
      <Footer />
    </div>
  );
};

export default ChallengeMode;
