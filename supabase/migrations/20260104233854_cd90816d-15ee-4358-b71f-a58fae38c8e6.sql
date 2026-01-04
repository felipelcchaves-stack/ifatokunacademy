-- Remove the old constraint
ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_type_check;

-- Add the new constraint with all exercise types
ALTER TABLE public.exercises 
ADD CONSTRAINT exercises_type_check 
CHECK (type IN (
  'reading', 
  'drag-drop', 
  'fill-columns', 
  'flashcard', 
  'video', 
  'memorization',
  'quiz',
  'tap-complete'
));