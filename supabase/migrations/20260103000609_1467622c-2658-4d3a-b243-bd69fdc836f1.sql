-- Add phase column to exercises table
ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS phase text DEFAULT 'phase1';

-- Update existing exercises based on their titles
UPDATE public.exercises SET phase = 'phase2' 
WHERE (title ILIKE '%fase 2%' OR title ILIKE '%completo%' OR title ILIKE '%proficiência%')
AND (phase IS NULL OR phase = 'phase1');

-- Add phase column to user_recordings table
ALTER TABLE public.user_recordings 
ADD COLUMN IF NOT EXISTS phase text DEFAULT NULL;