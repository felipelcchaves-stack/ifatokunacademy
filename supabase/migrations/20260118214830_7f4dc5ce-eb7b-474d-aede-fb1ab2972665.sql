-- Remover a policy com erro de recursão infinita
DROP POLICY IF EXISTS "Org owners can manage org admins" ON public.organization_admins;

-- Criar a policy corrigida com referência correta
CREATE POLICY "Org owners can manage org admins" 
ON public.organization_admins
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_admins oa
    WHERE oa.user_id = auth.uid()
      AND oa.organization_id = organization_admins.organization_id
      AND oa.role = 'owner'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_admins oa
    WHERE oa.user_id = auth.uid()
      AND oa.organization_id = organization_admins.organization_id
      AND oa.role = 'owner'
  )
);