-- Hub single sign-on: a hub session that was signed out (back-channel logout) loses its admin
-- rights at once. Deleting the Supabase session already stops refreshes, but the access token it
-- already holds stays valid until it expires; every RLS policy that asks is_admin(),
-- is_org_or_global_admin() or is_organization_admin() now says "no" for it. Sessions that did not
-- come from the hub are not affected (hub_sso_current_session_revoked() is false for them).
-- Same signatures and bodies as in 20260101194522 / 20260118210404, plus the extra condition.

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
  )
  AND NOT public.hub_sso_current_session_revoked()
$$;

CREATE OR REPLACE FUNCTION public.is_organization_admin(p_user_id UUID, p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM organization_admins 
    WHERE user_id = p_user_id 
    AND organization_id = p_organization_id
  )
  AND NOT public.hub_sso_current_session_revoked()
$$;

CREATE OR REPLACE FUNCTION public.is_org_or_global_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    (is_admin(p_user_id) 
    OR EXISTS (
      SELECT 1 
      FROM organization_admins oa
      JOIN profiles p ON p.organization_id = oa.organization_id
      WHERE oa.user_id = p_user_id 
      AND p.id = p_user_id
    ))
    AND NOT public.hub_sso_current_session_revoked()
$$;
