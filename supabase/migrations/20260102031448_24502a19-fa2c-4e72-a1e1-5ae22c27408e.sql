-- Corrigir política RLS da tabela admin_emails
-- A política atual é auto-referencial e causa problemas

-- Dropar política problemática
DROP POLICY IF EXISTS "Admins can view admin emails" ON public.admin_emails;

-- Criar nova política usando a função is_admin() que já é SECURITY DEFINER
CREATE POLICY "Admins can view admin emails" ON public.admin_emails
  FOR SELECT USING (public.is_admin(auth.uid()));