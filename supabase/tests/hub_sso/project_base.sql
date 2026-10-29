-- Academy: the role objects the hub_sso migrations depend on, copied (trimmed) from
-- supabase/migrations/20260101194522_*.sql and 20260118210404_*.sql, plus helpers for test.sql.
CREATE TABLE public.organizations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT);
CREATE TABLE public.profiles (id UUID PRIMARY KEY, organization_id UUID REFERENCES public.organizations(id));
CREATE TABLE public.admin_emails (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT NOT NULL UNIQUE);
CREATE TABLE public.organization_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  UNIQUE (organization_id, user_id)
);
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_emails ae JOIN auth.users u ON u.email = ae.email WHERE u.id = user_id)
$$;
CREATE OR REPLACE FUNCTION public.is_organization_admin(p_user_id UUID, p_organization_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM organization_admins WHERE user_id = p_user_id AND organization_id = p_organization_id)
$$;
CREATE OR REPLACE FUNCTION public.is_org_or_global_admin(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT is_admin(p_user_id) OR EXISTS (
    SELECT 1 FROM organization_admins oa JOIN profiles p ON p.organization_id = oa.organization_id
    WHERE oa.user_id = p_user_id AND p.id = p_user_id)
$$;

CREATE SCHEMA tests;
GRANT USAGE ON SCHEMA tests TO anon, authenticated, service_role;
CREATE FUNCTION tests.make_admin(_uid UUID) RETURNS void LANGUAGE sql AS $$
  INSERT INTO public.admin_emails (email) SELECT email FROM auth.users WHERE id = _uid
$$;
-- A member here is an organization admin: a role the hub does not manage by default.
CREATE FUNCTION tests.make_member(_uid UUID) RETURNS void LANGUAGE sql AS $$
  WITH o AS (INSERT INTO public.organizations (name) VALUES ('Templo') RETURNING id)
  INSERT INTO public.organization_admins (organization_id, user_id, role) SELECT id, _uid, 'admin' FROM o
$$;
-- The admin checks the RLS policies use, as seen by the current request.
CREATE FUNCTION tests.admin_check() RETURNS boolean LANGUAGE sql AS $$
  SELECT public.is_admin(auth.uid()) AND public.is_org_or_global_admin(auth.uid())
$$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tests TO anon, authenticated, service_role;
