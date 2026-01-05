-- 1. Corrigir progresso do usuário - marcar exercício faltante como completo
INSERT INTO user_progress (user_id, exercise_id, lesson_id, module_id, completed_at)
VALUES (
  'c50ed8ee-60ab-46f0-9689-4f002fa7175b',
  'bc321885-cdd2-449a-97b5-e55ecbfb16ea',
  '81dc4fe7-0cb1-4322-a134-d343f9a79452',
  '35fdf7f7-0c8a-4f24-990c-cf3723cd653f',
  now()
)
ON CONFLICT DO NOTHING;

-- 2. Reorganizar display_order dos exercícios da lição Obi
-- Fase 1 (0-8): Todos os exercícios de aprendizado inicial
UPDATE exercises SET display_order = 0 WHERE id = '05d2ab43-d01a-41b2-8ccb-8ea44e54acf9' AND lesson_id = '81dc4fe7-0cb1-4322-a134-d343f9a79452';
UPDATE exercises SET display_order = 1 WHERE id = 'cbcf16ac-b2e5-4b31-84fc-1ff54c5f5ba3' AND lesson_id = '81dc4fe7-0cb1-4322-a134-d343f9a79452';
UPDATE exercises SET display_order = 2 WHERE id = '09a0b29b-7b15-4f5d-a4f3-56dd9f437a10' AND lesson_id = '81dc4fe7-0cb1-4322-a134-d343f9a79452';
UPDATE exercises SET display_order = 3 WHERE id = '0f1c19f5-a814-424b-8de9-d2a79f2cc2e0' AND lesson_id = '81dc4fe7-0cb1-4322-a134-d343f9a79452';
UPDATE exercises SET display_order = 4 WHERE id = 'f4dc7b13-80f2-453e-96b8-dfa664068bc2' AND lesson_id = '81dc4fe7-0cb1-4322-a134-d343f9a79452';
UPDATE exercises SET display_order = 5 WHERE id = '97091d43-c2a2-47bb-b4ba-d98ca6abbb65' AND lesson_id = '81dc4fe7-0cb1-4322-a134-d343f9a79452';
UPDATE exercises SET display_order = 6 WHERE id = '8be6a787-e13f-4e84-8dc7-36e1a0ed4bc8' AND lesson_id = '81dc4fe7-0cb1-4322-a134-d343f9a79452';
UPDATE exercises SET display_order = 7 WHERE id = 'bc321885-cdd2-449a-97b5-e55ecbfb16ea' AND lesson_id = '81dc4fe7-0cb1-4322-a134-d343f9a79452';
UPDATE exercises SET display_order = 8 WHERE id = 'db2f316a-d75a-4b5d-980a-7a1d9cfd4b80' AND lesson_id = '81dc4fe7-0cb1-4322-a134-d343f9a79452';

-- Fase 2 (9-14): Exercícios de consolidação
UPDATE exercises SET display_order = 9 WHERE id = 'b26123e9-56e9-45f2-818f-6cbccd8cefdd' AND lesson_id = '81dc4fe7-0cb1-4322-a134-d343f9a79452';
UPDATE exercises SET display_order = 10 WHERE id = 'bb58eca1-a572-458b-8061-8345ba2f0567' AND lesson_id = '81dc4fe7-0cb1-4322-a134-d343f9a79452';
UPDATE exercises SET display_order = 11 WHERE id = '5bfa500d-d99a-4acd-abf0-1b2ed6cdaca2' AND lesson_id = '81dc4fe7-0cb1-4322-a134-d343f9a79452';
UPDATE exercises SET display_order = 12 WHERE id = '69e0e1b5-5d66-4dfc-bf89-e5c78dc9bc36' AND lesson_id = '81dc4fe7-0cb1-4322-a134-d343f9a79452';
UPDATE exercises SET display_order = 13 WHERE id = 'dc0da5a9-b6a6-4f45-9ec2-bd6be8b00e87' AND lesson_id = '81dc4fe7-0cb1-4322-a134-d343f9a79452';
UPDATE exercises SET display_order = 14 WHERE id = '05d6e33d-6c51-4d77-8c81-cbb92020a8d9' AND lesson_id = '81dc4fe7-0cb1-4322-a134-d343f9a79452';