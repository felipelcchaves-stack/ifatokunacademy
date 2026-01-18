-- Etapa 2: Corrigir policy de org admins em modules (ordem correta de parâmetros)
DROP POLICY IF EXISTS "Org admins can manage their organization modules" ON public.modules;

CREATE POLICY "Org admins can manage their organization modules"
ON public.modules
FOR ALL
USING (is_organization_admin(auth.uid(), organization_id))
WITH CHECK (is_organization_admin(auth.uid(), organization_id));

-- Etapa 3: Adicionar isolamento para Lições por Organização
DROP POLICY IF EXISTS "Anyone can view published lessons" ON public.lessons;

CREATE POLICY "Users can view published lessons from their org or global"
ON public.lessons
FOR SELECT
USING (
  is_published = true
  AND EXISTS (
    SELECT 1 FROM modules m 
    WHERE m.id = lessons.module_id
    AND (
      m.organization_id IS NULL 
      OR m.organization_id = get_user_organization_id(auth.uid())
      OR is_admin(auth.uid())
    )
  )
);

CREATE POLICY "Org admins can manage lessons of their modules"
ON public.lessons
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM modules m 
    WHERE m.id = lessons.module_id
    AND is_organization_admin(auth.uid(), m.organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM modules m 
    WHERE m.id = lessons.module_id
    AND is_organization_admin(auth.uid(), m.organization_id)
  )
);

-- Etapa 4: Adicionar isolamento para Exercícios por Organização
DROP POLICY IF EXISTS "Anyone can view published exercises" ON public.exercises;

CREATE POLICY "Users can view published exercises from their org or global"
ON public.exercises
FOR SELECT
USING (
  is_published = true
  AND EXISTS (
    SELECT 1 FROM lessons l
    JOIN modules m ON m.id = l.module_id
    WHERE l.id = exercises.lesson_id
    AND (
      m.organization_id IS NULL 
      OR m.organization_id = get_user_organization_id(auth.uid())
      OR is_admin(auth.uid())
    )
  )
);

CREATE POLICY "Org admins can manage exercises of their modules"
ON public.exercises
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM lessons l
    JOIN modules m ON m.id = l.module_id
    WHERE l.id = exercises.lesson_id
    AND is_organization_admin(auth.uid(), m.organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM lessons l
    JOIN modules m ON m.id = l.module_id
    WHERE l.id = exercises.lesson_id
    AND is_organization_admin(auth.uid(), m.organization_id)
  )
);

-- Etapa 5: Restringir visualização de Profiles por Organização
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view profiles from their organization"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
  OR is_admin(auth.uid())
  OR (
    organization_id IS NOT NULL 
    AND organization_id = get_user_organization_id(auth.uid())
  )
);

-- Etapa 6: Restringir visualização de Media por Organização
DROP POLICY IF EXISTS "Anyone can view media" ON public.exercise_media;

CREATE POLICY "Users can view media from their org or global"
ON public.exercise_media
FOR SELECT
USING (
  module_id IS NULL
  OR is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM modules m 
    WHERE m.id = exercise_media.module_id
    AND (
      m.organization_id IS NULL 
      OR m.organization_id = get_user_organization_id(auth.uid())
    )
  )
);