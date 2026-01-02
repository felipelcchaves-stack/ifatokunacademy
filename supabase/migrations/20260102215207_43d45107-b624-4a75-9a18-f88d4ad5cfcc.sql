-- Remover política problemática que não tem WITH CHECK para INSERT
DROP POLICY IF EXISTS "Authenticated users can manage modules" ON modules;

-- Criar nova política para admins gerenciarem módulos (INSERT, UPDATE, DELETE)
CREATE POLICY "Admins can manage modules" ON modules
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));