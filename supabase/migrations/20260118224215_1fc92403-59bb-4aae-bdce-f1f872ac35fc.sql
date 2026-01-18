-- Criar função SECURITY DEFINER para obter organization_id de um módulo sem acionar RLS
CREATE OR REPLACE FUNCTION public.get_module_organization_id(p_module_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM modules WHERE id = p_module_id;
$$;

-- Remover a policy problemática que causa recursão
DROP POLICY IF EXISTS "Org admins can manage permissions for their org modules" ON public.user_module_permissions;

-- Recriar a policy usando a função auxiliar (quebra o ciclo de recursão)
CREATE POLICY "Org admins can manage permissions for their org modules"
ON public.user_module_permissions
FOR ALL
USING (
  is_organization_admin(
    get_module_organization_id(module_id),
    auth.uid()
  )
)
WITH CHECK (
  is_organization_admin(
    get_module_organization_id(module_id),
    auth.uid()
  )
);