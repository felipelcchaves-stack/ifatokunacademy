DROP POLICY IF EXISTS "Org admins can manage cohorts" ON public.cohorts;

CREATE POLICY "Admins can select cohorts" ON public.cohorts
  FOR SELECT TO authenticated
  USING (is_organization_admin(auth.uid(), organization_id) OR is_admin(auth.uid()));

CREATE POLICY "Admins can insert cohorts" ON public.cohorts
  FOR INSERT TO authenticated
  WITH CHECK (is_organization_admin(auth.uid(), organization_id) OR is_admin(auth.uid()));

CREATE POLICY "Admins can update cohorts" ON public.cohorts
  FOR UPDATE TO authenticated
  USING (is_organization_admin(auth.uid(), organization_id) OR is_admin(auth.uid()));

CREATE POLICY "Admins can delete cohorts" ON public.cohorts
  FOR DELETE TO authenticated
  USING (is_organization_admin(auth.uid(), organization_id) OR is_admin(auth.uid()));