-- Criar tabela de convites de usuários
CREATE TABLE public.user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT,
  invited_by_id UUID NOT NULL,
  invited_by_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days')
);

-- Índice para busca por email
CREATE INDEX idx_user_invites_email ON public.user_invites(email);
CREATE INDEX idx_user_invites_status ON public.user_invites(status);

-- RLS: Apenas admins podem gerenciar convites
ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invites"
ON public.user_invites FOR ALL
USING (is_admin(auth.uid()));

-- Criar tabela de permissões por módulo
CREATE TABLE public.user_module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by UUID,
  UNIQUE(user_id, module_id)
);

-- Índices para performance
CREATE INDEX idx_user_module_permissions_user ON public.user_module_permissions(user_id);
CREATE INDEX idx_user_module_permissions_module ON public.user_module_permissions(module_id);

-- RLS para permissões de módulos
ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own permissions"
ON public.user_module_permissions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all permissions"
ON public.user_module_permissions FOR ALL
USING (is_admin(auth.uid()));

-- Atualizar RLS de módulos para verificar permissões
DROP POLICY IF EXISTS "Anyone can view published modules" ON public.modules;

CREATE POLICY "Users can view permitted modules"
ON public.modules FOR SELECT
USING (
  is_admin(auth.uid()) 
  OR EXISTS (
    SELECT 1 FROM public.user_module_permissions
    WHERE user_id = auth.uid() AND module_id = modules.id
  )
  OR is_published = false -- Permite admin ver não publicados via outra policy
);