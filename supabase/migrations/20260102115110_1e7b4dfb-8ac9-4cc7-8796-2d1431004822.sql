-- Inserir módulo temático de Provérbios Yorubá
INSERT INTO modules (title, description, type, theme, color, is_published, display_order, image_url)
VALUES (
  'Òwe Yorùbá - Provérbios Sagrados',
  'Aprenda os provérbios tradicionais Yorubá que carregam a sabedoria ancestral de Ifá. Cada provérbio traz ensinamentos profundos sobre a vida, perseverança e espiritualidade.',
  'thematic',
  'Língua Yorubá',
  '#D4A574',
  true,
  100,
  NULL
)
ON CONFLICT DO NOTHING;

-- Inserir lições por categoria de provérbio usando subquery para pegar o module_id
INSERT INTO lessons (module_id, title, description, display_order, is_published, duration_minutes)
SELECT 
  m.id,
  lesson_data.title,
  lesson_data.description,
  lesson_data.display_order,
  true,
  lesson_data.duration_minutes
FROM modules m
CROSS JOIN (
  VALUES 
    ('Provérbios de Motivação', 'Provérbios que inspiram e motivam a ação e a coragem.', 1, 15),
    ('Provérbios de Perseverança', 'Provérbios sobre paciência, persistência e cooperação.', 2, 15),
    ('Provérbios de Sabedoria', 'Provérbios que transmitem conhecimento ancestral e discernimento.', 3, 20),
    ('Provérbios de Vitória', 'Provérbios sobre conquistas, esforço e recompensa divina.', 4, 15),
    ('Provérbios de Proteção', 'Provérbios sobre cuidado, prevenção e não retroceder.', 5, 10),
    ('Saudações Yorubá', 'Saudações tradicionais e bênçãos para uso diário.', 6, 10)
) AS lesson_data(title, description, display_order, duration_minutes)
WHERE m.title = 'Òwe Yorùbá - Provérbios Sagrados'
ON CONFLICT DO NOTHING;