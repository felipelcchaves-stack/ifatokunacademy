-- Reclassificar exercícios tap-complete baseados no texto do verso completo (Fase 2)
-- Estratégia: Comparar o texto do exercício com o texto do exercício de leitura "Fase 2" da mesma lição

WITH fase2_reading_texts AS (
  SELECT 
    lesson_id,
    content->>'text' as fase2_text
  FROM exercises
  WHERE type = 'reading'
  AND title ILIKE '%Fase 2%'
  AND is_published = true
)
UPDATE exercises e
SET 
  title = REPLACE(title, 'Fase 1 -', 'Fase 2 -'),
  updated_at = now()
FROM fase2_reading_texts f2
WHERE e.lesson_id = f2.lesson_id
AND e.type = 'tap-complete'
AND e.title LIKE 'Fase 1 -%'
AND e.content->>'text' IS NOT NULL
AND f2.fase2_text ILIKE '%' || LEFT(e.content->>'text', 50) || '%';

-- Reclassificar exercícios drag-drop baseados no sourceText do verso completo (Fase 2)
WITH fase2_reading_texts AS (
  SELECT 
    lesson_id,
    content->>'text' as fase2_text
  FROM exercises
  WHERE type = 'reading'
  AND title ILIKE '%Fase 2%'
  AND is_published = true
)
UPDATE exercises e
SET 
  title = REPLACE(title, 'Fase 1 -', 'Fase 2 -'),
  updated_at = now()
FROM fase2_reading_texts f2
WHERE e.lesson_id = f2.lesson_id
AND e.type = 'drag-drop'
AND e.title LIKE 'Fase 1 -%'
AND e.content->>'sourceText' IS NOT NULL
AND f2.fase2_text ILIKE '%' || LEFT(e.content->>'sourceText', 50) || '%';