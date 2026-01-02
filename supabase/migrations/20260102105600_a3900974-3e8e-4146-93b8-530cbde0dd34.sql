-- Add lesson_id and module_id to spaced_repetition_items for context
ALTER TABLE public.spaced_repetition_items 
ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL;

-- Create index for filtering by module
CREATE INDEX IF NOT EXISTS idx_spaced_repetition_module ON public.spaced_repetition_items(module_id);
CREATE INDEX IF NOT EXISTS idx_spaced_repetition_lesson ON public.spaced_repetition_items(lesson_id);

-- Create module retention schedule table
CREATE TABLE IF NOT EXISTS public.module_retention_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  last_review_at timestamptz DEFAULT now(),
  next_review_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  review_count integer DEFAULT 0,
  retention_score integer DEFAULT 100,
  items_reviewed integer DEFAULT 0,
  items_correct integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- Enable RLS
ALTER TABLE public.module_retention_schedule ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own retention schedule"
ON public.module_retention_schedule
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own retention schedule"
ON public.module_retention_schedule
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own retention schedule"
ON public.module_retention_schedule
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own retention schedule"
ON public.module_retention_schedule
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_module_retention_schedule_updated_at
BEFORE UPDATE ON public.module_retention_schedule
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();