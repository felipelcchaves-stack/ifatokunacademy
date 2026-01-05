-- Remover duplicados de drag-drop, mantendo o mais antigo
DELETE FROM exercises
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY lesson_id, COALESCE(content->>'sourceText', content->'items'->>0)
        ORDER BY created_at ASC
      ) as rn
    FROM exercises 
    WHERE type = 'drag-drop'
  ) ranked
  WHERE rn > 1
);

-- Atualizar drag-drops que não tem sourceText (extrair do primeiro item)
UPDATE exercises
SET content = content || jsonb_build_object(
  'sourceText', 
  COALESCE(content->'items'->>0, '')
)
WHERE type = 'drag-drop'
AND (content->>'sourceText' IS NULL OR content->>'sourceText' = '');