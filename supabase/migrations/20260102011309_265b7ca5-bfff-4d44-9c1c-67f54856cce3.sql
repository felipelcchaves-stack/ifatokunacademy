-- Tabela para rastrear itens de repetição espaçada
CREATE TABLE public.spaced_repetition_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
  item_index INTEGER NOT NULL, -- Índice do item dentro do exercício
  item_text TEXT NOT NULL, -- Texto do item para identificação
  next_review_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  interval_days INTEGER NOT NULL DEFAULT 1, -- Intervalo atual em dias
  ease_factor NUMERIC(3,2) NOT NULL DEFAULT 2.50, -- Fator de facilidade (SM-2)
  repetitions INTEGER NOT NULL DEFAULT 0, -- Repetições corretas consecutivas
  total_reviews INTEGER NOT NULL DEFAULT 0, -- Total de revisões
  correct_reviews INTEGER NOT NULL DEFAULT 0, -- Revisões corretas
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Único por usuário/exercício/item
  UNIQUE(user_id, exercise_id, item_index)
);

-- Habilitar RLS
ALTER TABLE public.spaced_repetition_items ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Users can view their own spaced repetition items"
ON public.spaced_repetition_items
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own spaced repetition items"
ON public.spaced_repetition_items
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own spaced repetition items"
ON public.spaced_repetition_items
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own spaced repetition items"
ON public.spaced_repetition_items
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_spaced_repetition_items_updated_at
BEFORE UPDATE ON public.spaced_repetition_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índice para buscar itens pendentes de revisão
CREATE INDEX idx_spaced_repetition_next_review 
ON public.spaced_repetition_items(user_id, next_review_at);

-- Índice para buscar por exercício
CREATE INDEX idx_spaced_repetition_exercise 
ON public.spaced_repetition_items(exercise_id);