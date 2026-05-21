
-- 1) Restrict generated_audio_cache INSERT to service role only (remove WITH CHECK true)
DROP POLICY IF EXISTS "Service role can insert audio cache" ON public.generated_audio_cache;
CREATE POLICY "Service role can insert audio cache"
  ON public.generated_audio_cache
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 2) Defense-in-depth: explicit restrictive policy denying non-admin access to admin_emails
CREATE POLICY "Deny non-admins from admin_emails"
  ON public.admin_emails
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
