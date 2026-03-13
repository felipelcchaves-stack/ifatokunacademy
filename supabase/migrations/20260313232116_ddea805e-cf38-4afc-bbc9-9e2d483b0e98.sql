
-- Table: cohorts
CREATE TABLE public.cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  starts_at date,
  ends_at date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table: cohort_members
CREATE TABLE public.cohort_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cohort_id, user_id)
);

-- Table: cohort_modules
CREATE TABLE public.cohort_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  UNIQUE(cohort_id, module_id)
);

-- Enable RLS
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_modules ENABLE ROW LEVEL SECURITY;

-- Helper function to check cohort membership
CREATE OR REPLACE FUNCTION public.is_cohort_member(p_cohort_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM cohort_members
    WHERE cohort_id = p_cohort_id AND user_id = p_user_id
  )
$$;

-- Helper to get cohort's organization_id
CREATE OR REPLACE FUNCTION public.get_cohort_organization_id(p_cohort_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM cohorts WHERE id = p_cohort_id
$$;

-- RLS: cohorts
CREATE POLICY "Org admins can manage cohorts" ON public.cohorts
  FOR ALL TO authenticated
  USING (is_organization_admin(auth.uid(), organization_id) OR is_admin(auth.uid()))
  WITH CHECK (is_organization_admin(auth.uid(), organization_id) OR is_admin(auth.uid()));

CREATE POLICY "Members can view their enrolled cohorts" ON public.cohorts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cohort_members cm
      WHERE cm.cohort_id = cohorts.id AND cm.user_id = auth.uid()
    )
    AND is_active = true
  );

-- RLS: cohort_members
CREATE POLICY "Org admins can manage cohort members" ON public.cohort_members
  FOR ALL TO authenticated
  USING (
    is_organization_admin(auth.uid(), get_cohort_organization_id(cohort_id))
    OR is_admin(auth.uid())
  )
  WITH CHECK (
    is_organization_admin(auth.uid(), get_cohort_organization_id(cohort_id))
    OR is_admin(auth.uid())
  );

CREATE POLICY "Users can view own cohort memberships" ON public.cohort_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- RLS: cohort_modules
CREATE POLICY "Org admins can manage cohort modules" ON public.cohort_modules
  FOR ALL TO authenticated
  USING (
    is_organization_admin(auth.uid(), get_cohort_organization_id(cohort_id))
    OR is_admin(auth.uid())
  )
  WITH CHECK (
    is_organization_admin(auth.uid(), get_cohort_organization_id(cohort_id))
    OR is_admin(auth.uid())
  );

CREATE POLICY "Enrolled users can view cohort modules" ON public.cohort_modules
  FOR SELECT TO authenticated
  USING (
    is_cohort_member(cohort_id, auth.uid())
  );
