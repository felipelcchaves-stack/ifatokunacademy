import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  Trash2, 
  Send, 
  Star, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Lightbulb
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import ContentProtection from '@/components/ContentProtection';

interface ValidatedCounsel {
  text: string;
  ranking: number;
  feedback: string;
  isRelevant: boolean;
  category: string;
}

interface ValidationResult {
  counsels: ValidatedCounsel[];
  totalCounsels: number;
  relevantCounsels: number;
  averageRanking: number;
  overallFeedback: string;
}

interface InterpretationExerciseProps {
  text: string;
  title?: string;
  minCounsels?: number;
  exerciseId: string;
  lessonId?: string;
  moduleId?: string;
  onComplete?: (score: number) => void;
  isOptional?: boolean;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  moral: { label: 'Moral', color: 'bg-purple-500' },
  espiritual: { label: 'Espiritual', color: 'bg-blue-500' },
  'prático': { label: 'Prático', color: 'bg-green-500' },
  social: { label: 'Social', color: 'bg-orange-500' },
  familiar: { label: 'Familiar', color: 'bg-pink-500' },
  profissional: { label: 'Profissional', color: 'bg-cyan-500' },
  'saúde': { label: 'Saúde', color: 'bg-red-500' },
  outro: { label: 'Outro', color: 'bg-gray-500' },
};

const InterpretationExercise: React.FC<InterpretationExerciseProps> = ({
  text,
  title,
  minCounsels = 5,
  exerciseId,
  lessonId,
  moduleId,
  onComplete,
  isOptional = true,
}) => {
  const [counsels, setCounsels] = useState<string[]>(Array(minCounsels).fill(''));
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isTextExpanded, setIsTextExpanded] = useState(true);
  const [showResults, setShowResults] = useState(false);

  const handleCounselChange = (index: number, value: string) => {
    const newCounsels = [...counsels];
    newCounsels[index] = value;
    setCounsels(newCounsels);
  };

  const addCounsel = () => {
    setCounsels([...counsels, '']);
  };

  const removeCounsel = (index: number) => {
    if (counsels.length > minCounsels) {
      const newCounsels = counsels.filter((_, i) => i !== index);
      setCounsels(newCounsels);
    }
  };

  const filledCounsels = counsels.filter((c) => c.trim().length > 0);
  const canSubmit = filledCounsels.length >= minCounsels;

  const handleValidate = async () => {
    if (!canSubmit) {
      toast.error(`Escreva pelo menos ${minCounsels} conselhos antes de validar.`);
      return;
    }

    setIsValidating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-interpretation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token && {
              Authorization: `Bearer ${session.access_token}`,
            }),
          },
          body: JSON.stringify({
            originalText: text,
            counsels: filledCounsels.map((text) => ({ text })),
            exerciseId,
            lessonId,
            moduleId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 429) {
          toast.error('Limite de requisições excedido. Aguarde alguns minutos.');
          return;
        }
        if (response.status === 402) {
          toast.error('Créditos insuficientes para validação.');
          return;
        }
        throw new Error(error.error || 'Erro ao validar');
      }

      const result: ValidationResult = await response.json();
      setValidationResult(result);
      setShowResults(true);

      // Calculate score as percentage of average ranking
      const score = Math.round((result.averageRanking / 5) * 100);
      
      toast.success(`Interpretação validada! Média: ${result.averageRanking.toFixed(1)}/5`);

      if (onComplete) {
        onComplete(score);
      }
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Erro ao validar interpretação. Tente novamente.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRetry = () => {
    setValidationResult(null);
    setShowResults(false);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              'w-4 h-4',
              star <= rating ? 'fill-primary text-primary' : 'text-muted-foreground/30'
            )}
          />
        ))}
      </div>
    );
  };

  if (showResults && validationResult) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-bold">Resultado da Interpretação</h3>
          {isOptional && (
            <Badge variant="secondary" className="text-xs">
              <Lightbulb className="w-3 h-3 mr-1" />
              Exercício Orientador
            </Badge>
          )}
        </div>

        {/* Overall Stats */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-primary">
                  {validationResult.averageRanking.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">Média</div>
                <div className="flex justify-center mt-1">
                  {renderStars(Math.round(validationResult.averageRanking))}
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600">
                  {validationResult.relevantCounsels}
                </div>
                <div className="text-sm text-muted-foreground">Relevantes</div>
              </div>
              <div>
                <div className="text-3xl font-bold">
                  {validationResult.totalCounsels}
                </div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
            </div>

            <div className="mt-4">
              <Progress 
                value={(validationResult.averageRanking / 5) * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Overall Feedback */}
        {validationResult.overallFeedback && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-3">
                <MessageSquare className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  {validationResult.overallFeedback}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Individual Counsels */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Seus Conselhos
          </h4>
          
          <AnimatePresence>
            {validationResult.counsels.map((counsel, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={cn(
                  "border-l-4",
                  counsel.isRelevant ? "border-l-green-500" : "border-l-yellow-500"
                )}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium">{counsel.text}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {renderStars(counsel.ranking)}
                        <div className="flex gap-1">
                          {counsel.isRelevant ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-yellow-500" />
                          )}
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "text-xs text-white",
                              CATEGORY_LABELS[counsel.category]?.color || 'bg-gray-500'
                            )}
                          >
                            {CATEGORY_LABELS[counsel.category]?.label || counsel.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                      {counsel.feedback}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <Button variant="outline" onClick={handleRetry}>
            Tentar Novamente
          </Button>
          <Button 
            className="gradient-gold text-secondary"
            onClick={() => onComplete?.(Math.round((validationResult.averageRanking / 5) * 100))}
          >
            Continuar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold">{title || 'Exercício de Interpretação'}</h3>
        {isOptional && (
          <Badge variant="secondary" className="text-xs">
            <Lightbulb className="w-3 h-3 mr-1" />
            Exercício Orientador - Não bloqueia progresso
          </Badge>
        )}
        <p className="text-muted-foreground">
          Leia o texto abaixo e escreva pelo menos {minCounsels} conselhos que você extrai dessa história.
        </p>
      </div>

      {/* Text Display */}
      <Card>
        <CardHeader 
          className="cursor-pointer flex flex-row items-center justify-between"
          onClick={() => setIsTextExpanded(!isTextExpanded)}
        >
          <CardTitle className="text-lg">Texto para Interpretação</CardTitle>
          <Button variant="ghost" size="sm">
            {isTextExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </CardHeader>
        
        <AnimatePresence>
          {isTextExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent>
                <ContentProtection>
                  <div className="prose prose-sm dark:prose-invert max-w-none max-h-[400px] overflow-y-auto p-4 bg-muted/30 rounded-lg">
                    {text.split('\n').map((paragraph, index) => (
                      <p key={index} className="mb-3 last:mb-0">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </ContentProtection>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Counsels Input */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">
            Seus Conselhos ({filledCounsels.length}/{minCounsels} mínimo)
          </h4>
          <Button variant="outline" size="sm" onClick={addCounsel}>
            <Plus className="w-4 h-4 mr-1" />
            Adicionar
          </Button>
        </div>

        <div className="space-y-3">
          {counsels.map((counsel, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-2"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm flex-shrink-0 mt-2">
                {index + 1}
              </div>
              <Textarea
                value={counsel}
                onChange={(e) => handleCounselChange(index, e.target.value)}
                placeholder={`Escreva um conselho que você extrai do texto...`}
                className="min-h-[80px] resize-none"
              />
              {counsels.length > minCounsels && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 mt-2 text-destructive hover:text-destructive"
                  onClick={() => removeCounsel(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progresso</span>
          <span className={cn(
            "font-medium",
            canSubmit ? "text-green-600" : "text-muted-foreground"
          )}>
            {filledCounsels.length}/{minCounsels} conselhos
          </span>
        </div>
        <Progress 
          value={(filledCounsels.length / minCounsels) * 100} 
          className="h-2"
        />
      </div>

      {/* Submit Button */}
      <Button
        className="w-full gradient-gold text-secondary"
        size="lg"
        disabled={!canSubmit || isValidating}
        onClick={handleValidate}
      >
        {isValidating ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Validando com IA...
          </>
        ) : (
          <>
            <Send className="w-5 h-5 mr-2" />
            Validar Conselhos
          </>
        )}
      </Button>

      {!canSubmit && (
        <p className="text-sm text-center text-muted-foreground">
          Escreva mais {minCounsels - filledCounsels.length} conselho(s) para poder validar.
        </p>
      )}
    </div>
  );
};

export default InterpretationExercise;