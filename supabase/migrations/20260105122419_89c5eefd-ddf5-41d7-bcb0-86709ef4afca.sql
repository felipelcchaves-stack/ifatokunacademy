-- Primeiro, remover a constraint existente e recriar com o novo tipo
ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_type_check;

-- Adicionar nova constraint com fill-blanks incluído
ALTER TABLE exercises ADD CONSTRAINT exercises_type_check 
CHECK (type IN ('reading', 'drag-drop', 'fill-columns', 'fill-blanks', 'flashcard', 'video', 'memorization', 'quiz', 'tap-complete'));