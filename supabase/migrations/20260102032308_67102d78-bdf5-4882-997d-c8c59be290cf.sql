-- Criar tabela de estimativas de tempo por tipo de exercício
CREATE TABLE public.exercise_time_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_type TEXT NOT NULL UNIQUE,
  base_minutes INTEGER NOT NULL,
  review_minutes INTEGER NOT NULL,
  repetitions_to_master INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.exercise_time_estimates ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública (configurações de tempo são públicas)
CREATE POLICY "Anyone can view time estimates"
ON public.exercise_time_estimates
FOR SELECT
USING (true);

-- Apenas admins podem modificar
CREATE POLICY "Admins can manage time estimates"
ON public.exercise_time_estimates
FOR ALL
USING (is_admin(auth.uid()));

-- Valores iniciais realistas para cada tipo de exercício
INSERT INTO public.exercise_time_estimates (exercise_type, base_minutes, review_minutes, repetitions_to_master, description) VALUES
  ('reading', 10, 5, 2, 'Leitura guiada com áudio'),
  ('memorization', 15, 8, 5, 'Textos para memorização com técnicas'),
  ('flashcard', 8, 3, 4, 'Flash cards com repetição espaçada'),
  ('quiz', 5, 3, 2, 'Questionários de múltipla escolha'),
  ('drag_drop', 8, 4, 3, 'Arrastar e soltar elementos'),
  ('fill_columns', 10, 5, 3, 'Preencher colunas/tabelas'),
  ('video', 20, 10, 1, 'Vídeo aulas com anotações');

-- Trigger para updated_at
CREATE TRIGGER update_exercise_time_estimates_updated_at
BEFORE UPDATE ON public.exercise_time_estimates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();