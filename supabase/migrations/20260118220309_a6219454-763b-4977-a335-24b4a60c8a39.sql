-- Criar função SECURITY DEFINER para verificar se usuário é owner de uma organização
-- Esta função ignora RLS, quebrando o ciclo de recursão infinita
CREATE OR REPLACE FUNCTION public.is_organization_owner(p_user_id uuid, p_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM organization_admins 
    WHERE user_id = p_user_id 
    AND organization_id = p_organization_id
    AND role = 'owner'
  )
$$;

-- Remover a policy que causa recursão infinita
DROP POLICY IF EXISTS "Org owners can manage org admins" ON public.organization_admins;

-- Criar nova policy usando a função SECURITY DEFINER
CREATE POLICY "Org owners can manage org admins" 
ON public.organization_admins
FOR ALL
TO authenticated
USING (
  is_organization_owner(auth.uid(), organization_id)
)
WITH CHECK (
  is_organization_owner(auth.uid(), organization_id)
);