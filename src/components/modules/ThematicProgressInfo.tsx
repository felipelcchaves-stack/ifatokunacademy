import React from 'react';
import { Info, Lock, BookOpen, CheckCircle2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

interface ThematicProgressInfoProps {
  isUnlocked: boolean;
  awoProgress: { completed: number; total: number; percentage: number };
  activeThematicTitle?: string;
}

export const ThematicProgressInfo: React.FC<ThematicProgressInfoProps> = ({
  isUnlocked,
  awoProgress,
  activeThematicTitle,
}) => {
  // Se os temáticos estão desbloqueados
  if (isUnlocked && !activeThematicTitle) {
    return (
      <Alert className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
        <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        <AlertTitle className="text-purple-800 dark:text-purple-200 font-semibold">
          Módulos Temáticos Desbloqueados!
        </AlertTitle>
        <AlertDescription className="text-purple-700 dark:text-purple-300">
          Parabéns! Você completou todos os módulos Awo e pode agora explorar os módulos temáticos.
          <span className="block mt-1 text-sm opacity-80">
            Lembre-se: você só pode estudar um módulo temático por vez.
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  // Se há um temático em progresso
  if (activeThematicTitle) {
    return (
      <Alert className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
        <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <AlertTitle className="text-blue-800 dark:text-blue-200 font-semibold">
          Módulo em Andamento: "{activeThematicTitle}"
        </AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          Você já iniciou um módulo temático. Conclua-o com 90% ou mais no quiz final para desbloquear outros.
          <span className="block mt-1 text-sm opacity-80">
            Foco é a chave do aprendizado profundo.
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  // Se ainda não completou todos os módulos Awo
  return (
    <Alert className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
      <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-800 dark:text-amber-200 font-semibold flex items-center gap-2">
        <span>Módulos Temáticos Bloqueados</span>
        <span className="text-sm font-normal bg-amber-200 dark:bg-amber-800 px-2 py-0.5 rounded-full">
          {awoProgress.completed}/{awoProgress.total} Awo
        </span>
      </AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-300 space-y-3">
        <p>
          Complete todos os módulos do nível <strong>Awo</strong> com 90% ou mais no quiz para desbloquear os módulos temáticos.
        </p>
        
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span>Progresso para desbloqueio</span>
            <span className="font-semibold">{awoProgress.percentage}%</span>
          </div>
          <Progress 
            value={awoProgress.percentage} 
            className="h-2 bg-amber-200 dark:bg-amber-900"
          />
        </div>
        
        <p className="text-sm opacity-80 flex items-center gap-1.5">
          <Info className="w-4 h-4" />
          Depois de desbloquear, você poderá estudar um módulo temático por vez.
        </p>
      </AlertDescription>
    </Alert>
  );
};
