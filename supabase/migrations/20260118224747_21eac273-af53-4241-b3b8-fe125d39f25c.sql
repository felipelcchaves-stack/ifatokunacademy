-- Tabela para relacionamento muitos-para-muitos entre usuários e organizações
CREATE TABLE public.organization_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin', 'owner')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Cada usuário só pode pertencer a uma org uma vez
  UNIQUE(user_id, organization_id)
);

-- Índices para performance
CREATE INDEX idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX idx_organization_members_organization_id ON public.organization_members(organization_id);
CREATE INDEX idx_organization_members_primary ON public.organization_members(user_id, is_primary) WHERE is_primary = true;

-- Enable RLS
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Usuários podem ver suas próprias memberships
CREATE POLICY "Users can view their own memberships"
ON public.organization_members
FOR SELECT
USING (auth.uid() = user_id);

-- Org admins podem ver todos os membros da sua org
CREATE POLICY "Org admins can view org members"
ON public.organization_members
FOR SELECT
USING (
  is_organization_admin(organization_id, auth.uid())
);

-- Global admins podem ver tudo
CREATE POLICY "Global admins can view all memberships"
ON public.organization_members
FOR SELECT
USING (is_admin(auth.uid()));

-- Org admins podem adicionar membros
CREATE POLICY "Org admins can add members"
ON public.organization_members
FOR INSERT
WITH CHECK (
  is_organization_admin(organization_id, auth.uid())
  OR is_admin(auth.uid())
);

-- Org admins podem atualizar membros (exceto owners)
CREATE POLICY "Org admins can update members"
ON public.organization_members
FOR UPDATE
USING (
  (is_organization_admin(organization_id, auth.uid()) AND role != 'owner')
  OR is_admin(auth.uid())
);

-- Org admins podem remover membros (exceto owners)
CREATE POLICY "Org admins can remove members"
ON public.organization_members
FOR DELETE
USING (
  (is_organization_admin(organization_id, auth.uid()) AND role != 'owner')
  OR is_admin(auth.uid())
  OR auth.uid() = user_id -- Usuários podem sair de uma org
);

-- Função para verificar se usuário é membro de uma organização
CREATE OR REPLACE FUNCTION public.is_organization_member(p_organization_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_organization_id
    AND user_id = p_user_id
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id
    AND organization_id = p_organization_id
  );
$$;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_organization_members_updated_at
BEFORE UPDATE ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrar dados existentes: criar memberships para usuários que já têm organization_id
INSERT INTO public.organization_members (user_id, organization_id, role, is_primary)
SELECT 
  p.id as user_id,
  p.organization_id,
  CASE 
    WHEN EXISTS (SELECT 1 FROM organization_admins oa WHERE oa.user_id = p.id AND oa.organization_id = p.organization_id)
    THEN 'admin'
    ELSE 'member'
  END as role,
  true as is_primary
FROM profiles p
WHERE p.organization_id IS NOT NULL
ON CONFLICT (user_id, organization_id) DO NOTHING;