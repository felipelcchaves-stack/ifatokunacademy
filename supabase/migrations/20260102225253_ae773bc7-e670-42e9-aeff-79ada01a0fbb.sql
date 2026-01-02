-- Remover políticas problemáticas que não têm WITH CHECK para INSERT

-- Tabela lessons
DROP POLICY IF EXISTS "Authenticated users can manage lessons" ON lessons;

-- Tabela exercises
DROP POLICY IF EXISTS "Authenticated users can manage exercises" ON exercises;

-- Tabela exercise_media
DROP POLICY IF EXISTS "Authenticated users can manage media" ON exercise_media;

-- Criar novas políticas para admins gerenciarem conteúdo educacional

-- Política para lessons
CREATE POLICY "Admins can manage lessons" ON lessons
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Política para exercises
CREATE POLICY "Admins can manage exercises" ON exercises
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Política para exercise_media
CREATE POLICY "Admins can manage media" ON exercise_media
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));