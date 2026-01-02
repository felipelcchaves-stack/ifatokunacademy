-- 1. Criar tabela de progresso por fase
CREATE TABLE public.module_phase_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  phase1_completed_at timestamptz,
  phase2_completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- 2. Enable RLS
ALTER TABLE public.module_phase_progress ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Users can view their own phase progress"
  ON public.module_phase_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own phase progress"
  ON public.module_phase_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own phase progress"
  ON public.module_phase_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own phase progress"
  ON public.module_phase_progress FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Trigger para updated_at
CREATE TRIGGER update_module_phase_progress_updated_at
  BEFORE UPDATE ON public.module_phase_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Função auxiliar para verificar se Fase 1 está completa
CREATE OR REPLACE FUNCTION public.is_module_phase1_complete(
  p_user_id uuid,
  p_module_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM exercises e
    INNER JOIN lessons l ON e.lesson_id = l.id
    WHERE l.module_id = p_module_id
      AND e.is_published = true
      AND (
        e.title NOT ILIKE '%fase 2%' 
        AND e.title NOT ILIKE '%proficiência%'
        AND e.title NOT ILIKE '%completo%'
      )
      AND NOT EXISTS (
        SELECT 1 
        FROM user_progress up 
        WHERE up.user_id = p_user_id 
          AND up.exercise_id = e.id
      )
  );
$$;

-- 6. Migrar dados existentes (quem completou módulo, completou Fase 1)
INSERT INTO module_phase_progress (user_id, module_id, phase1_completed_at, phase2_completed_at)
SELECT 
  mc.user_id,
  mc.module_id,
  mc.completed_at,
  CASE WHEN mc.quiz_score >= 90 THEN mc.completed_at ELSE NULL END
FROM module_completions mc
ON CONFLICT (user_id, module_id) DO NOTHING;