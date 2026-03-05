
-- Phase 1: Add organization_type to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS organization_type TEXT NOT NULL DEFAULT 'educational';

-- Phase 2: Temple roles table
CREATE TABLE public.temple_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'spiritual',
  is_board_member BOOLEAN NOT NULL DEFAULT false,
  grants_fee_exemption BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.temple_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage temple roles"
ON public.temple_roles FOR ALL TO authenticated
USING (is_organization_admin(auth.uid(), organization_id) OR is_admin(auth.uid()))
WITH CHECK (is_organization_admin(auth.uid(), organization_id) OR is_admin(auth.uid()));

CREATE POLICY "Org members can view temple roles"
ON public.temple_roles FOR SELECT TO authenticated
USING (is_organization_member(organization_id, auth.uid()));

-- Organization bylaws table
CREATE TABLE public.organization_bylaws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_bylaws ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage bylaws"
ON public.organization_bylaws FOR ALL TO authenticated
USING (is_organization_admin(auth.uid(), organization_id) OR is_admin(auth.uid()))
WITH CHECK (is_organization_admin(auth.uid(), organization_id) OR is_admin(auth.uid()));

CREATE POLICY "Org members can view published bylaws"
ON public.organization_bylaws FOR SELECT TO authenticated
USING (is_organization_member(organization_id, auth.uid()) AND is_published = true);

-- Organization benefits table
CREATE TABLE public.organization_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_benefits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage benefits"
ON public.organization_benefits FOR ALL TO authenticated
USING (is_organization_admin(auth.uid(), organization_id) OR is_admin(auth.uid()))
WITH CHECK (is_organization_admin(auth.uid(), organization_id) OR is_admin(auth.uid()));

CREATE POLICY "Org members can view active benefits"
ON public.organization_benefits FOR SELECT TO authenticated
USING (is_organization_member(organization_id, auth.uid()) AND is_active = true);
