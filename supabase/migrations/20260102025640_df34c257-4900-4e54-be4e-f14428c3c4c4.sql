-- Permitir que admins insiram novos emails de admin
CREATE POLICY "Admins can insert admin emails" ON public.admin_emails
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

-- Permitir que admins removam emails de admin
CREATE POLICY "Admins can delete admin emails" ON public.admin_emails
  FOR DELETE USING (public.is_admin(auth.uid()));