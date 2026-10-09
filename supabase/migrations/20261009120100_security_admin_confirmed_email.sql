-- SECURITY FIX. Needs the hub_sso migrations (20261008230000 and 20261008230100) because it keeps
-- the hub check is_admin() got there. Replaces part 1 of
-- supabase/proposed/admin_confirmed_email_and_profile_org_guard.sql. Idempotent.
--
-- Problem: is_admin() matches auth.users.email against public.admin_emails WITHOUT requiring the
-- e-mail to be confirmed. If an address is listed in admin_emails before its owner has an account,
-- and e-mail sign-up is open without "Confirm email", anyone can sign up with that address (public
-- anon key) and be a global admin.
--
-- Fix: only a CONFIRMED e-mail counts (the same rule hub_sso_find_user uses). Every real admin
-- signs in with a confirmed address (create-user and the hub login both require it). Check before
-- applying, in the SQL editor (must return no rows, or confirm those people first):
--   SELECT ae.email FROM public.admin_emails ae JOIN auth.users u ON u.email = ae.email
--   WHERE u.email_confirmed_at IS NULL;
-- Same signature and body as 20261008230100, plus the extra condition.

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
