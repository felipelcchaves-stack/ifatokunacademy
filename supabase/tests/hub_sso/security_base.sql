-- Academy: what the security fixes touch, as the migrations leave it (project_base.sql already has
-- organizations, a trimmed profiles, admin_emails, organization_admins and the role functions):
-- profiles columns and policies (20260101194522), handle_new_user (20260118222505),
-- organization_members and its policies (20260118224747), for the security fix tests.
ALTER TABLE auth.users ADD COLUMN raw_user_meta_data JSONB, ADD COLUMN raw_app_meta_data JSONB;
ALTER TABLE public.profiles
  ADD COLUMN email TEXT, ADD COLUMN full_name TEXT, ADD COLUMN avatar_url TEXT, ADD COLUMN bio TEXT,
  ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now(), ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile (trimmed)" ON public.profiles FOR SELECT USING (auth.uid() = id OR is_admin(auth.uid()));
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, organization_id)
  VALUES (NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url',
    (NEW.raw_user_meta_data ->> 'organization_id')::uuid);
  RETURN NEW;
END;
$function$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.organization_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin', 'owner')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (user_id, organization_id)
);
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own memberships" ON public.organization_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Org admins can view org members" ON public.organization_members FOR SELECT USING (is_organization_admin(organization_id, auth.uid()));
CREATE POLICY "Global admins can view all memberships" ON public.organization_members FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Org admins can add members" ON public.organization_members FOR INSERT WITH CHECK (is_organization_admin(organization_id, auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Org admins can update members" ON public.organization_members FOR UPDATE USING ((is_organization_admin(organization_id, auth.uid()) AND role != 'owner') OR is_admin(auth.uid()));
CREATE POLICY "Org admins can remove members" ON public.organization_members FOR DELETE USING ((is_organization_admin(organization_id, auth.uid()) AND role != 'owner') OR is_admin(auth.uid()) OR auth.uid() = user_id);

-- Organizations A and B. S = student of A, X = person to be added to A, OA = organization admin of A,
-- G = global admin, U = admin_emails entry whose account never confirmed its e-mail.
INSERT INTO public.organizations (id, name) VALUES
  ('60000000-0000-0000-0000-00000000000a', 'Org A'), ('60000000-0000-0000-0000-00000000000b', 'Org B');
INSERT INTO auth.users (id, email, email_confirmed_at, raw_user_meta_data) VALUES
  ('00000000-0000-0000-0000-0000000000f1', 'aluno@example.com', now(), '{"organization_id": "60000000-0000-0000-0000-00000000000a"}'),
  ('00000000-0000-0000-0000-0000000000f2', 'x@example.com', now(), '{}'),
  ('00000000-0000-0000-0000-0000000000f3', 'orgadmin@example.com', now(), '{}'),
  ('00000000-0000-0000-0000-0000000000a2', 'global2@ifatokun.com.br', now(), '{}'),
  ('00000000-0000-0000-0000-0000000000e2', 'reservado@ifatokun.com.br', NULL, '{}');
INSERT INTO public.organization_members (user_id, organization_id, role, is_primary) VALUES
  ('00000000-0000-0000-0000-0000000000f1', '60000000-0000-0000-0000-00000000000a', 'member', true);
INSERT INTO public.organization_admins (organization_id, user_id, role) VALUES
  ('60000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000f3', 'admin');
INSERT INTO public.admin_emails (email) VALUES ('global2@ifatokun.com.br'), ('reservado@ifatokun.com.br');
