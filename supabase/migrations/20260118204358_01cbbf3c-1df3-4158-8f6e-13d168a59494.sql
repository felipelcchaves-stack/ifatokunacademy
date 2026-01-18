-- Add study mode preference to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS study_mode TEXT DEFAULT 'complete' CHECK (study_mode IN ('complete', 'express'));