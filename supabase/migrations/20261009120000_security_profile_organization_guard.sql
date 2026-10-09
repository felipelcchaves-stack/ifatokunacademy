-- SECURITY FIX (independent of the hub login: safe to apply on its own, before or after the hub_sso
-- migrations). Replaces part 2 of supabase/proposed/admin_confirmed_email_and_profile_org_guard.sql
-- (part 1, is_admin() with a confirmed e-mail, is 20261009120100 and needs the hub_sso migrations).
-- Idempotent.
--
-- Problems:
-- 1. "Users can update their own profile" (20260101194522) lets a student set ANY organization_id
--    on their own profile. Organization-scoped policies use get_user_organization_id(auth.uid()), so
--    the student moves into another organization and reads its data.
-- 2. Same result at sign-up: handle_new_user (20260118222505) copies organization_id from
--    raw_user_meta_data, which the person signing up controls
--    (supabase.auth.signUp({ ..., options: { data: { organization_id } } }) with the public key).
-- 3. Bug (denies access, no leak): the organization_members policies call
--    is_organization_admin(organization_id, auth.uid()) with the arguments swapped (the function is
--    (p_user_id, p_organization_id)), so only global admins can add, see, update or remove members.
--
-- Who legitimately sets profiles.organization_id today (checked in the code, 2026-10-09):
--   * the student, to an organization they are a member of: useUserOrganizations
--     .setPrimaryOrganization (organization switcher), right after updating organization_members;
--   * create-user Edge Function (service role), after creating the user (it does NOT pass the
--     organization in the user metadata; nothing in the app does);
--   * nothing else (no other Edge Function, no admin screen writes another person's profile).
--
-- Fix:
-- 1. Trigger: a browser request (anon / authenticated) can set its OWN profile's organization only
--    to an organization it belongs to (organization_members or organization_admins), or clear it.
--    Global admins, service_role, postgres and SECURITY DEFINER functions are not affected.
-- 2. handle_new_user takes organization_id from raw_app_meta_data (only the service role can write
--    it) instead of raw_user_meta_data. Same columns otherwise.
-- 3. The four organization_members policies with the arguments in the right order.

-- 1. Organization guard ---------------------------------------------------------------------------
-- Does the CALLER belong to the organization? Only answers about auth.uid(), so exposing it to
-- authenticated leaks nothing about other people.
CREATE OR REPLACE FUNCTION public.current_user_belongs_to_organization(_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.organization_members m
            WHERE m.user_id = auth.uid() AND m.organization_id = _organization_id)
    OR EXISTS (SELECT 1 FROM public.organization_admins oa
               WHERE oa.user_id = auth.uid() AND oa.organization_id = _organization_id)
  )
$$;
REVOKE ALL ON FUNCTION public.current_user_belongs_to_organization(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_belongs_to_organization(UUID) TO authenticated, service_role;

-- NOT security definer on purpose: current_user must be the caller's role (anon / authenticated
-- through the API, service_role in Edge Functions, postgres in the SQL editor and definer functions).
CREATE OR REPLACE FUNCTION public.guard_profile_organization()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated')
     OR NEW.organization_id IS NULL
     OR (TG_OP = 'UPDATE' AND NEW.organization_id IS NOT DISTINCT FROM OLD.organization_id)
     OR public.is_admin(auth.uid())
     OR (NEW.id = auth.uid() AND public.current_user_belongs_to_organization(NEW.organization_id)) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Você não faz parte desta organização' USING ERRCODE = '42501';
END
$$;

DROP TRIGGER IF EXISTS guard_profile_organization ON public.profiles;
CREATE TRIGGER guard_profile_organization
  BEFORE INSERT OR UPDATE OF organization_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_organization();

-- 2. Sign-up: organization only from app metadata ---------------------------------------------------
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
    NULLIF(NEW.raw_app_meta_data ->> 'organization_id', '')::uuid
  );
  RETURN NEW;
END;
$function$;

-- 3. organization_members policies with the arguments in the right order -----------------------------
DROP POLICY IF EXISTS "Org admins can view org members" ON public.organization_members;
CREATE POLICY "Org admins can view org members"
ON public.organization_members
FOR SELECT
USING (is_organization_admin(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org admins can add members" ON public.organization_members;
CREATE POLICY "Org admins can add members"
ON public.organization_members
FOR INSERT
WITH CHECK (
  is_organization_admin(auth.uid(), organization_id)
  OR is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Org admins can update members" ON public.organization_members;
CREATE POLICY "Org admins can update members"
ON public.organization_members
FOR UPDATE
USING (
  (is_organization_admin(auth.uid(), organization_id) AND role != 'owner')
  OR is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Org admins can remove members" ON public.organization_members;
CREATE POLICY "Org admins can remove members"
ON public.organization_members
FOR DELETE
USING (
  (is_organization_admin(auth.uid(), organization_id) AND role != 'owner')
  OR is_admin(auth.uid())
  OR auth.uid() = user_id -- Usuários podem sair de uma org
);
