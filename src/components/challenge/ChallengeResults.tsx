import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Target, Zap, Clock, RotateCcw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ChallengeResultsProps {
  score: number;
  itemsAnswered: number;
  correctCount: number;
  timeUsed: number;
  bestScore: number | null;
  xpGained: number;
  onRestart: () => void;
}

export const ChallengeResults: React.FC<ChallengeResultsProps> = ({
  score,
  itemsAnswered,
  correctCount,
  timeUsed,
  bestScore,
  xpGained,
  onRestart,
}) => {
  const navigate = useNavigate();
  const isNewRecord = bestScore !== null && score > bestScore;
  const accuracy = itemsAnswered > 0 ? Math.round((correctCount / itemsAnswered) * 100) : 0;
  const minutes = Math.floor(timeUsed / 60);
  const seconds = timeUsed % 60;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-foreground">Desafio Concluído!</h2>
        {isNewRecord && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-500 rounded-full animate-pulse">
            <Trophy className="w-5 h-5" />
            <span className="font-bold">Novo Recorde!</span>
          </div>
        )}
      </div>

      {/* Main Score Card */}
      <Card className="border-2 border-primary">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-6xl font-bold text-primary">{score}</CardTitle>
          <p className="text-muted-foreground">pontos</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <Target className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{correctCount}/{itemsAnswered}</p>
              <p className="text-sm text-muted-foreground">Acertos</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <Zap className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold">{accuracy}%</p>
              <p className="text-sm text-muted-foreground">Precisão</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <Clock className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{minutes}:{seconds.toString().padStart(2, '0')}</p>
              <p className="text-sm text-muted-foreground">Tempo</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <Trophy className="w-6 h-6 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold">+{xpGained}</p>
              <p className="text-sm text-muted-foreground">XP Ganho</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best Score Comparison */}
      {bestScore !== null && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Melhor pontuação anterior:</span>
              <span className={cn(
                'font-bold text-lg',
                isNewRecord ? 'text-muted-foreground line-through' : 'text-foreground'
              )}>
                {bestScore} pts
              </span>
            </div>
            {isNewRecord && (
              <div className="flex items-center justify-between mt-2">
                <span className="text-green-500">Diferença:</span>
                <span className="font-bold text-lg text-green-500">+{score - bestScore} pts</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button variant="outline" className="flex-1" onClick={() => navigate('/dashboard')}>
          <Home className="w-4 h-4 mr-2" />
          Dashboard
        </Button>
        <Button className="flex-1" onClick={onRestart}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Jogar Novamente
        </Button>
      </div>
    </div>
  );
};
