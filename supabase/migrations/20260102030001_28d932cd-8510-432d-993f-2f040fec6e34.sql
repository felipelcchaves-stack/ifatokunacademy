-- Tabela para armazenar planos de estudo personalizados
CREATE TABLE public.user_study_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  availability JSONB NOT NULL DEFAULT '[]'::jsonb,
  session_duration_minutes INTEGER NOT NULL DEFAULT 45,
  preferred_time TEXT NOT NULL DEFAULT 'evening',
  last_calculated_at TIMESTAMPTZ,
  estimated_completion_date DATE,
  total_study_hours NUMERIC,
  weekly_hours NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Habilitar RLS
ALTER TABLE public.user_study_plans ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own study plan"
  ON public.user_study_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own study plan"
  ON public.user_study_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study plan"
  ON public.user_study_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study plan"
  ON public.user_study_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_study_plans_updated_at
  BEFORE UPDATE ON public.user_study_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();