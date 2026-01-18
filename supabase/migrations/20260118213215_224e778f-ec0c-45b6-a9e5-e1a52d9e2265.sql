-- Drop existing SELECT policy for modules
DROP POLICY IF EXISTS "Users can view permitted modules" ON public.modules;

-- Create new policy that properly filters by organization
CREATE POLICY "Users can view modules from their organization or public"
ON public.modules
FOR SELECT
USING (
  is_admin(auth.uid()) 
  OR (
    -- Module belongs to user's organization OR is a global module (null organization_id)
    (organization_id IS NULL OR organization_id = get_user_organization_id(auth.uid()))
    AND (
      -- User has explicit permission OR module is published
      is_published = true
      OR EXISTS (
        SELECT 1 FROM user_module_permissions
        WHERE user_module_permissions.user_id = auth.uid()
        AND user_module_permissions.module_id = modules.id
      )
    )
  )
);

-- Update admin policy to also filter by organization for org admins
DROP POLICY IF EXISTS "Admins can manage modules" ON public.modules;

-- Global admins can manage all modules
CREATE POLICY "Global admins can manage all modules"
ON public.modules
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Org admins can manage modules from their organization
CREATE POLICY "Org admins can manage their organization modules"
ON public.modules
FOR ALL
USING (
  is_organization_admin(organization_id, auth.uid())
)
WITH CHECK (
  is_organization_admin(organization_id, auth.uid())
);