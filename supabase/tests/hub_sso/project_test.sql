-- Academy-only assertions (run after test.sql, same database).
SET ROLE service_role;
SELECT tests.assert((SELECT status FROM public.hub_sso_find_user('aluno@example.com', ARRAY['admin', 'org_admin'])) = 'ok', 'org admin allowed when org_admin is listed');
RESET ROLE;
SELECT tests.assert(public.hub_sso_user_roles('00000000-0000-0000-0000-00000000000a') = ARRAY['admin'], 'global admin role from admin_emails');
SELECT tests.assert(public.hub_sso_user_roles('00000000-0000-0000-0000-00000000000b') = ARRAY['org_admin'], 'org admin role from organization_admins');
-- A revoked hub session also loses the organization-admin check.
SET ROLE authenticated;
SELECT tests.as_session('00000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001');
SELECT tests.assert(NOT public.is_organization_admin(auth.uid(), gen_random_uuid()), 'revoked session: no org admin');
RESET ROLE;
