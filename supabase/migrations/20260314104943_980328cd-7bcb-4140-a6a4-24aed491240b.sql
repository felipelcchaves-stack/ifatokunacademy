
-- Update RLS policy on exercises to allow users to see ALL exercises (published and draft)
-- so we can show draft exercises as "coming soon" placeholders
DROP POLICY IF EXISTS "Users can view published exercises from their org or global" ON public.exercises;

CREATE POLICY "Users can view exercises from their org or global"
ON public.exercises
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM lessons l
    JOIN modules m ON m.id = l.module_id
    WHERE l.id = exercises.lesson_id
    AND (
      m.organization_id IS NULL
      OR m.organization_id = get_user_organization_id(auth.uid())
      OR is_admin(auth.uid())
    )
  )
);
