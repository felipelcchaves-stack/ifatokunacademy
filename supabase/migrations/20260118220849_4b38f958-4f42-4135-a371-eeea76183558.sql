-- Adicionar coluna organization_id na tabela user_invites
ALTER TABLE public.user_invites 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Remover policy antiga (global)
DROP POLICY IF EXISTS "Admins can manage invites" ON public.user_invites;

-- Criar policies RLS por organizacao
CREATE POLICY "Global admins can manage all invites" 
ON public.user_invites FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Org admins can manage their org invites" 
ON public.user_invites FOR ALL
TO authenticated
USING (
  organization_id IS NOT NULL 
  AND is_organization_admin(organization_id, auth.uid())
)
WITH CHECK (
  organization_id IS NOT NULL 
  AND is_organization_admin(organization_id, auth.uid())
);

-- Permitir leitura publica de organizacoes ativas (para branding na tela de login)
DROP POLICY IF EXISTS "Anyone can view active organizations for login" ON public.organizations;

CREATE POLICY "Anyone can view active organizations for login" 
ON public.organizations FOR SELECT
USING (is_active = true);