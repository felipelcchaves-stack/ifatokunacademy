-- Migração em lote: Renomear exercícios para estrutura de fases
-- 1. Primeiro, ajustar display_order de todos os exercícios que NÃO são "Contexto" (+6)
UPDATE public.exercises
SET display_order = display_order + 6
WHERE title NOT LIKE 'Contexto:%'
  AND title NOT LIKE 'Fase 1%'
  AND title NOT LIKE 'Fase 2%';

-- 2. Renomear exercícios de leitura do verso completo
UPDATE public.exercises
SET title = REPLACE(title, 'Verso:', 'Fase 2 - Verso Completo:')
WHERE title LIKE 'Verso:%';

-- 3. Renomear exercícios de memorização
UPDATE public.exercises
SET title = REPLACE(title, 'Memorizar:', 'Fase 2 - Memorizar Verso:')
WHERE title LIKE 'Memorizar:%';

-- 4. Renomear exercícios de ordenação
UPDATE public.exercises
SET title = REPLACE(title, 'Ordenar Verso:', 'Fase 2 - Ordenar Verso Completo:')
WHERE title LIKE 'Ordenar Verso:%';

-- 5. Renomear exercícios de completar
UPDATE public.exercises
SET title = REPLACE(title, 'Completar Verso:', 'Fase 2 - Completar Verso:')
WHERE title LIKE 'Completar Verso:%';

-- 6. Renomear exercícios de revisão
UPDATE public.exercises
SET title = REPLACE(title, 'Revisão:', 'Fase 2 - Revisão Verso:')
WHERE title LIKE 'Revisão:%';

-- 7. Renomear exercícios de leitura (Língua Yoruba)
UPDATE public.exercises
SET title = REPLACE(title, 'Leitura - ', 'Fase 2 - Leitura Completa: ')
WHERE title LIKE 'Leitura - %';

-- 8. Renomear exercícios de flashcards (Língua Yoruba)
UPDATE public.exercises
SET title = REPLACE(title, 'Flashcards - ', 'Fase 2 - Flashcards: ')
WHERE title LIKE 'Flashcards - %';

-- 9. Renomear exercícios de ordenar palavras (Língua Yoruba)
UPDATE public.exercises
SET title = REPLACE(title, 'Ordenar Palavras - ', 'Fase 2 - Ordenar Palavras: ')
WHERE title LIKE 'Ordenar Palavras - %';