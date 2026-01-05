-- Publicar todos os exercícios TapComplete e DragDrop existentes que estão não publicados
UPDATE exercises
SET is_published = true, updated_at = now()
WHERE type IN ('tap-complete', 'drag-drop')
AND is_published = false;