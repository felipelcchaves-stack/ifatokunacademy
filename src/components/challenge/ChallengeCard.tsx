import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateSimilarity } from '@/lib/textSimilarity';

interface ChallengeCardProps {
  prompt: string;
  answer: string;
  onAnswer: (correct: boolean, responseTimeMs: number) => void;
  isActive: boolean;
}

export const ChallengeCard: React.FC<ChallengeCardProps> = ({
  prompt,
  answer,
  onAnswer,
  isActive,
}) => {
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    startTimeRef.current = Date.now();
    setUserInput('');
    setFeedback(null);
    setShowAnswer(false);
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [prompt, isActive]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isActive || feedback) return;

    const responseTime = Date.now() - startTimeRef.current;
    const similarity = calculateSimilarity(userInput.trim(), answer);
    const isCorrect = similarity >= 0.8;

    setFeedback(isCorrect ? 'correct' : 'incorrect');
    setShowAnswer(true);

    // Brief delay before moving to next
    setTimeout(() => {
      onAnswer(isCorrect, responseTime);
    }, 800);
  };

  const getMultiplierBadge = () => {
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    if (elapsed < 3) return { text: '3x', color: 'bg-yellow-500' };
    if (elapsed < 5) return { text: '2x', color: 'bg-orange-500' };
    if (elapsed < 10) return { text: '1.5x', color: 'bg-blue-500' };
    return { text: '1x', color: 'bg-muted' };
  };

  const multiplier = getMultiplierBadge();

  return (
    <Card className={cn(
      'transition-all duration-300 border-2',
      feedback === 'correct' && 'border-green-500 bg-green-500/10',
      feedback === 'incorrect' && 'border-red-500 bg-red-500/10',
      !feedback && 'border-primary/20'
    )}>
      <CardContent className="p-6 space-y-4">
        {/* Multiplier Badge */}
        <div className="flex justify-end">
          <div className={cn(
            'px-3 py-1 rounded-full text-white text-sm font-bold flex items-center gap-1',
            multiplier.color
          )}>
            <Zap className="w-3 h-3" />
            {multiplier.text}
          </div>
        </div>

        {/* Prompt */}
        <div className="text-center py-6">
          <p className="text-xl font-medium text-foreground">{prompt}</p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            ref={inputRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Digite sua resposta..."
            disabled={!isActive || !!feedback}
            className="text-center text-lg"
            autoComplete="off"
          />

          {!feedback && (
            <Button
              type="submit"
              className="w-full"
              disabled={!userInput.trim() || !isActive}
            >
              <Check className="w-4 h-4 mr-2" />
              Responder
            </Button>
          )}
        </form>

        {/* Feedback */}
        {feedback && (
          <div className={cn(
            'flex items-center justify-center gap-2 py-3 rounded-lg',
            feedback === 'correct' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
          )}>
            {feedback === 'correct' ? (
              <>
                <Check className="w-5 h-5" />
                <span className="font-semibold">Correto!</span>
              </>
            ) : (
              <>
                <X className="w-5 h-5" />
                <span className="font-semibold">Incorreto</span>
              </>
            )}
          </div>
        )}

        {/* Show correct answer if wrong */}
        {showAnswer && feedback === 'incorrect' && (
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Resposta correta:</p>
            <p className="font-medium text-foreground">{answer}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
