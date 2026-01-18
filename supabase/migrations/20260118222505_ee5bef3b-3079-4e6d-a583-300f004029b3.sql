-- Etapa 1: Corrigir RLS de user_invites (parâmetros invertidos)
DROP POLICY IF EXISTS "Org admins can manage their org invites" ON public.user_invites;

CREATE POLICY "Org admins can manage their org invites"
ON public.user_invites
FOR ALL
USING (
  (organization_id IS NOT NULL) 
  AND is_organization_admin(auth.uid(), organization_id)
)
WITH CHECK (
  (organization_id IS NOT NULL) 
  AND is_organization_admin(auth.uid(), organization_id)
);

-- Etapa 2: Adicionar policy para Org Admins em user_module_permissions
CREATE POLICY "Org admins can manage permissions for their org modules"
ON public.user_module_permissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM modules m
    WHERE m.id = user_module_permissions.module_id
    AND m.organization_id IS NOT NULL
    AND is_organization_admin(auth.uid(), m.organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM modules m
    WHERE m.id = user_module_permissions.module_id
    AND m.organization_id IS NOT NULL
    AND is_organization_admin(auth.uid(), m.organization_id)
  )
);

-- Etapa 3: Adicionar policy para Org Admins em exercise_media
CREATE POLICY "Org admins can manage their org media"
ON public.exercise_media
FOR ALL
USING (
  module_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM modules m
    WHERE m.id = exercise_media.module_id
    AND m.organization_id IS NOT NULL
    AND is_organization_admin(auth.uid(), m.organization_id)
  )
)
WITH CHECK (
  module_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM modules m
    WHERE m.id = exercise_media.module_id
    AND m.organization_id IS NOT NULL
    AND is_organization_admin(auth.uid(), m.organization_id)
  )
);

-- Etapa 4: Atualizar trigger handle_new_user para suportar organization_id dos metadados
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, organization_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url',
    (NEW.raw_user_meta_data ->> 'organization_id')::uuid
  );
  RETURN NEW;
END;
$function$;