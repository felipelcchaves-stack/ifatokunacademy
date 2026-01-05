-- Padronizar títulos dos exercícios tap-complete existentes
UPDATE exercises
SET title = 'Fase 1 - ' || title, updated_at = now()
WHERE type = 'tap-complete'
AND title NOT LIKE 'Fase 1%'
AND title NOT LIKE 'Fase 2%';

-- Padronizar títulos dos exercícios drag-drop existentes (sem marcação de fase)
UPDATE exercises
SET title = 'Fase 1 - ' || title, updated_at = now()
WHERE type = 'drag-drop'
AND title NOT LIKE 'Fase 1%'
AND title NOT LIKE 'Fase 2%';