-- PROPOSED FIX — NOT a migration, NOT applied. Review, then move to supabase/migrations/ with a
-- new timestamp (AFTER 20261008230100_hub_sso_role_guard.sql) if you want it.
-- Found while adding the hub login (deploy/HUB-SSO.md, "Achados").
--
-- 1) is_admin() matches auth.users.email against public.admin_emails WITHOUT requiring the e-mail
--    to be confirmed. If an address is listed in admin_emails before its owner has an account,
--    and e-mail sign-up is open with "Confirm email" off, anyone can sign up with that address
--    (supabase.auth.signUp via the public anon key) and be a global admin. Require a confirmed
--    e-mail (same rule the hub lookup uses).
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_emails ae
    JOIN auth.users u ON u.email = ae.email
    WHERE u.id = user_id
      AND u.email_confirmed_at IS NOT NULL
  )
  AND NOT public.hub_sso_current_session_revoked()
$$;

-- 2) "Users can update their own profile" (20260101194522) lets a user set ANY organization_id on
--    their own profile. Organization-scoped policies use get_user_organization_id(auth.uid()), so
--    a student can move into another organization and read its data. The app only changes it in
--    useUserOrganizations.setPrimaryOrganization, to an organization the user belongs to.
CREATE OR REPLACE FUNCTION public.guard_profile_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NOT DISTINCT FROM OLD.organization_id
     OR NEW.organization_id IS NULL
     OR coalesce(auth.jwt() ->> 'role', '') = 'service_role'
     OR current_user IN ('postgres', 'supabase_admin', 'service_role')
     OR public.is_admin(auth.uid())
     OR EXISTS (SELECT 1 FROM public.organization_members m
                WHERE m.user_id = NEW.id AND m.organization_id = NEW.organization_id)
     OR EXISTS (SELECT 1 FROM public.organization_admins oa
                WHERE oa.user_id = NEW.id AND oa.organization_id = NEW.organization_id) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'not a member of this organization' USING ERRCODE = '42501';
END
$$;

DROP TRIGGER IF EXISTS guard_profile_organization ON public.profiles;
CREATE TRIGGER guard_profile_organization
  BEFORE UPDATE OF organization_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_organization();
