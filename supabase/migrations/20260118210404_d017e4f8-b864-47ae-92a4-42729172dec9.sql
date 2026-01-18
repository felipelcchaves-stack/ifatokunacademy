-- =============================================
-- MULTI-TENANCY COMPLETO - FASE 1: ESTRUTURA
-- =============================================

-- 1. Criar tabela de organizações (tenants)
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- subdomínio (ex: cliente1.ifatokunacademy.com)
  custom_domain TEXT UNIQUE, -- domínio customizado opcional
  branding JSONB DEFAULT '{
    "logo_url": null,
    "favicon_url": null,
    "primary_color": "263 70% 50%",
    "secondary_color": "263 30% 25%",
    "accent_color": "45 93% 47%",
    "font_family": "Inter",
    "login_background_url": null
  }'::jsonb,
  settings JSONB DEFAULT '{
    "max_users": 100,
    "max_modules": 50,
    "plan_type": "free",
    "features": []
  }'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar índices para busca rápida por slug e domínio
CREATE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_organizations_custom_domain ON public.organizations(custom_domain);
CREATE INDEX idx_organizations_is_active ON public.organizations(is_active);

-- 2. Adicionar organization_id na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX idx_profiles_organization_id ON public.profiles(organization_id);

-- 3. Adicionar organization_id nas tabelas principais de conteúdo
ALTER TABLE public.modules 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX idx_modules_organization_id ON public.modules(organization_id);

-- 4. Adicionar organization_id na tabela platform_settings
ALTER TABLE public.platform_settings 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX idx_platform_settings_organization_id ON public.platform_settings(organization_id);

-- 5. Criar tabela de administradores da organização (separada de admin_emails global)
CREATE TABLE public.organization_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'moderator')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_organization_admins_org ON public.organization_admins(organization_id);
CREATE INDEX idx_organization_admins_user ON public.organization_admins(user_id);

-- 6. Função para obter a organização do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_organization_id(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id 
  FROM profiles 
  WHERE id = p_user_id
$$;

-- 7. Função para verificar se usuário é admin da organização
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
$$;

-- 8. Função para verificar se usuário é admin global OU admin da própria organização
CREATE OR REPLACE FUNCTION public.is_org_or_global_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_admin(p_user_id) 
    OR EXISTS (
      SELECT 1 
      FROM organization_admins oa
      JOIN profiles p ON p.organization_id = oa.organization_id
      WHERE oa.user_id = p_user_id 
      AND p.id = p_user_id
    )
$$;

-- =============================================
-- FASE 2: RLS POLICIES PARA ORGANIZATIONS
-- =============================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_admins ENABLE ROW LEVEL SECURITY;

-- Políticas para organizations
CREATE POLICY "Global admins can manage all organizations"
ON public.organizations
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can view their own organization"
ON public.organizations
FOR SELECT
USING (
  id = get_user_organization_id(auth.uid())
);

CREATE POLICY "Organization admins can update their organization"
ON public.organizations
FOR UPDATE
USING (
  is_organization_admin(auth.uid(), id)
);

-- Políticas para organization_admins
CREATE POLICY "Global admins can manage all org admins"
ON public.organization_admins
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Org owners can manage org admins"
ON public.organization_admins
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM organization_admins 
    WHERE user_id = auth.uid() 
    AND organization_id = organization_admins.organization_id 
    AND role = 'owner'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_admins 
    WHERE user_id = auth.uid() 
    AND organization_id = organization_admins.organization_id 
    AND role = 'owner'
  )
);

CREATE POLICY "Users can view admins of their organization"
ON public.organization_admins
FOR SELECT
USING (
  organization_id = get_user_organization_id(auth.uid())
);

-- =============================================
-- FASE 3: ATUALIZAR RLS POLICIES EXISTENTES
-- =============================================

-- Atualizar policy de modules para considerar organization_id
DROP POLICY IF EXISTS "Users can view permitted modules" ON public.modules;

CREATE POLICY "Users can view permitted modules"
ON public.modules
FOR SELECT
USING (
  is_admin(auth.uid()) 
  OR (
    -- Módulos da mesma organização ou sem organização (legacy)
    (organization_id IS NULL OR organization_id = get_user_organization_id(auth.uid()))
    AND (
      EXISTS (
        SELECT 1 FROM user_module_permissions 
        WHERE user_id = auth.uid() AND module_id = modules.id
      )
      OR is_published = false
    )
  )
);

-- Atualizar policy de platform_settings
DROP POLICY IF EXISTS "Anyone can read general platform settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Admins can read settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.platform_settings;

CREATE POLICY "Admins can read all settings"
ON public.platform_settings
FOR SELECT
USING (
  is_admin(auth.uid()) 
  OR is_organization_admin(auth.uid(), organization_id)
);

CREATE POLICY "Admins can update settings"
ON public.platform_settings
FOR UPDATE
USING (
  is_admin(auth.uid()) 
  OR is_organization_admin(auth.uid(), organization_id)
);

CREATE POLICY "Users can read general and org settings"
ON public.platform_settings
FOR SELECT
USING (
  key = 'general' 
  AND (
    organization_id IS NULL 
    OR organization_id = get_user_organization_id(auth.uid())
  )
);

-- Permitir admins inserir configurações
CREATE POLICY "Admins can insert settings"
ON public.platform_settings
FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) 
  OR is_organization_admin(auth.uid(), organization_id)
);

-- =============================================
-- FASE 4: CRIAR ORGANIZAÇÃO PADRÃO E MIGRAR DADOS
-- =============================================

-- Inserir organização padrão para dados existentes
INSERT INTO public.organizations (id, name, slug, branding, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Ifatokun Academy',
  'ifatokun',
  '{
    "logo_url": null,
    "favicon_url": null,
    "primary_color": "263 70% 50%",
    "secondary_color": "263 30% 25%",
    "accent_color": "45 93% 47%",
    "font_family": "Inter",
    "login_background_url": null
  }'::jsonb,
  '{
    "max_users": -1,
    "max_modules": -1,
    "plan_type": "enterprise",
    "features": ["unlimited"]
  }'::jsonb
);

-- Associar todos os usuários existentes à organização padrão
UPDATE public.profiles 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Associar todos os módulos existentes à organização padrão
UPDATE public.modules 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Associar configurações existentes à organização padrão
UPDATE public.platform_settings 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Tornar admins globais como owners da organização padrão
INSERT INTO public.organization_admins (organization_id, user_id, role)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  p.id,
  'owner'
FROM profiles p
JOIN admin_emails ae ON p.email = ae.email
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();