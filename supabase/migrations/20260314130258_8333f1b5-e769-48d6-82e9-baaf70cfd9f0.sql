ALTER TABLE public.cohort_modules 
  ADD COLUMN IF NOT EXISTS unlock_rule text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS unlock_date timestamptz NULL;