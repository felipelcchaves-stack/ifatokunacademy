-- Corrigir Fase 1 - Completar Contexto: Ritualística de Obi
UPDATE exercises
SET content = '{"items": [{"text": "Obi {{blank}} ku", "answers": ["gibi."], "hint": ""}]}'::jsonb,
    updated_at = now()
WHERE id = 'f4dc7b13-80f2-453e-96b8-dfa664068bc2';

-- Corrigir Fase 2 - Completar Verso: Ritualística de Obi
UPDATE exercises
SET content = '{"items": [{"text": "Aqui {{blank}} a ritualística {{blank}}", "answers": ["é", "completa"], "hint": ""}]}'::jsonb,
    updated_at = now()
WHERE id = 'bb58eca1-a572-458b-8061-8345ba2f0567';