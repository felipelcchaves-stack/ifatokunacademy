-- After the fixes (applied twice): attacks blocked; switching between own organizations, org admins,
-- global admins, create-user (service role) and sign-up still work.
\set ON_ERROR_STOP 1
CREATE FUNCTION tests.try(_sql TEXT) RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN EXECUTE _sql; RETURN 'ok';
EXCEPTION WHEN insufficient_privilege THEN RETURN 'denied';
END $$;
GRANT EXECUTE ON FUNCTION tests.try(TEXT) TO anon, authenticated, service_role;

-- 1. Student: cannot move into org B; can edit other fields, clear, and re-select org A.
SET ROLE authenticated;
SELECT tests.as_claims('{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}');
SELECT tests.assert(tests.try('UPDATE public.profiles SET organization_id = ''60000000-0000-0000-0000-00000000000b'' WHERE id = auth.uid()') = 'denied', 'student blocked from org B');
SELECT tests.assert(tests.try('UPDATE public.profiles SET full_name = ''Novo nome'', bio = ''b'' WHERE id = auth.uid()') = 'ok', 'student edits own profile');
SELECT tests.assert(tests.try('UPDATE public.profiles SET organization_id = NULL WHERE id = auth.uid()') = 'ok', 'student clears organization');
SELECT tests.assert(tests.try('UPDATE public.profiles SET organization_id = ''60000000-0000-0000-0000-00000000000a'' WHERE id = auth.uid()') = 'ok', 'student picks own org (setPrimaryOrganization)');
SELECT tests.assert(tests.try('INSERT INTO public.organization_members (user_id, organization_id) VALUES (auth.uid(), ''60000000-0000-0000-0000-00000000000b'')') = 'denied', 'student cannot add themselves to org B');
SELECT tests.assert(public.current_user_belongs_to_organization('60000000-0000-0000-0000-00000000000a'), 'belongs to A');
SELECT tests.assert(NOT public.current_user_belongs_to_organization('60000000-0000-0000-0000-00000000000b'), 'not to B');
RESET ROLE;
SET ROLE anon;
SELECT tests.as_claims('{"role": "anon"}');
SELECT tests.assert(tests.try('SELECT public.current_user_belongs_to_organization(''60000000-0000-0000-0000-00000000000a'')') = 'denied', 'helper not open to anon');
RESET ROLE;
SELECT tests.assert((SELECT organization_id = '60000000-0000-0000-0000-00000000000a' AND full_name = 'Novo nome' FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000f1'), 'student state as expected');

-- 2. Org admin of A (policies fixed): adds X to A, sees, updates and removes A's members; not B.
SET ROLE authenticated;
SELECT tests.as_claims('{"sub": "00000000-0000-0000-0000-0000000000f3", "role": "authenticated"}');
SELECT tests.assert(tests.try('INSERT INTO public.organization_members (user_id, organization_id) VALUES (''00000000-0000-0000-0000-0000000000f2'', ''60000000-0000-0000-0000-00000000000a'')') = 'ok', 'org admin adds a member to own org');
SELECT tests.assert(tests.try('INSERT INTO public.organization_members (user_id, organization_id) VALUES (''00000000-0000-0000-0000-0000000000f2'', ''60000000-0000-0000-0000-00000000000b'')') = 'denied', 'org admin cannot add to another org');
SELECT tests.assert((SELECT count(*) FROM public.organization_members WHERE organization_id = '60000000-0000-0000-0000-00000000000a') = 2, 'org admin sees own org members');
SELECT tests.assert(tests.try('UPDATE public.organization_members SET role = ''admin'' WHERE user_id = ''00000000-0000-0000-0000-0000000000f2''') = 'ok', 'org admin updates a member');
RESET ROLE;
-- 3. The new member X can now pick org A; S cannot pick B until B adds them.
SET ROLE authenticated;
SELECT tests.as_claims('{"sub": "00000000-0000-0000-0000-0000000000f2", "role": "authenticated"}');
SELECT tests.assert(tests.try('UPDATE public.profiles SET organization_id = ''60000000-0000-0000-0000-00000000000a'' WHERE id = auth.uid()') = 'ok', 'added member picks the org');
SELECT tests.as_claims('{"sub": "00000000-0000-0000-0000-0000000000f3", "role": "authenticated"}');
SELECT tests.assert(tests.try('DELETE FROM public.organization_members WHERE user_id = ''00000000-0000-0000-0000-0000000000f2''') = 'ok', 'org admin removes a member');
RESET ROLE;
SELECT tests.assert(NOT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = '00000000-0000-0000-0000-0000000000f2'), 'member removed');

-- 4. Global admin and server code (create-user, service role) set any organization.
SET ROLE authenticated;
SELECT tests.as_claims('{"sub": "00000000-0000-0000-0000-0000000000a2", "role": "authenticated"}');
SELECT tests.assert(public.is_admin(auth.uid()), 'confirmed admin_emails entry is admin');
SELECT tests.assert(tests.try('UPDATE public.profiles SET organization_id = ''60000000-0000-0000-0000-00000000000b'' WHERE id = auth.uid()') = 'ok', 'global admin moves freely');
RESET ROLE;
SET ROLE service_role;
SELECT tests.as_claims('{"role": "service_role"}');
UPDATE public.profiles SET organization_id = '60000000-0000-0000-0000-00000000000b' WHERE id = '00000000-0000-0000-0000-0000000000f2';
INSERT INTO public.organization_members (user_id, organization_id, role, is_primary) VALUES ('00000000-0000-0000-0000-0000000000f2', '60000000-0000-0000-0000-00000000000b', 'member', true);
RESET ROLE;
SELECT tests.assert((SELECT organization_id = '60000000-0000-0000-0000-00000000000b' FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000f2'), 'create-user (service role) sets the org');

-- 5. Sign-up: user metadata no longer chooses the organization; app metadata (server only) does.
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ('00000000-0000-0000-0000-0000000000f5', 'intruso2@example.com', '{"organization_id": "60000000-0000-0000-0000-00000000000b", "full_name": "Intruso"}');
SELECT tests.assert((SELECT organization_id IS NULL AND full_name = 'Intruso' FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000f5'), 'sign-up metadata ignored for the org, name kept');
INSERT INTO auth.users (id, email, raw_user_meta_data, raw_app_meta_data) VALUES ('00000000-0000-0000-0000-0000000000f6', 'convidado@example.com', '{}', '{"organization_id": "60000000-0000-0000-0000-00000000000a"}');
SELECT tests.assert((SELECT organization_id = '60000000-0000-0000-0000-00000000000a' FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000f6'), 'app metadata (server) sets the org');
-- ... and a browser insert of a profile in someone else's org is refused.
SET ROLE authenticated;
SELECT tests.as_claims('{"sub": "00000000-0000-0000-0000-0000000000e2", "role": "authenticated"}');
SELECT tests.assert(tests.try('INSERT INTO public.profiles (id, organization_id) VALUES (auth.uid(), ''60000000-0000-0000-0000-00000000000b'')') = 'denied', 'browser insert into another org refused');

-- 6. is_admin() needs a confirmed e-mail; a signed-out hub session still loses it.
SELECT tests.assert(NOT public.is_admin(auth.uid()), 'unconfirmed e-mail is no longer admin');
RESET ROLE;
INSERT INTO auth.sessions (id, user_id) VALUES ('60000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a2');
SET ROLE service_role;
SELECT public.hub_sso_record_session('60000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a2', 'sid-g2', '82', 'global2@ifatokun.com.br');
SELECT public.hub_sso_revoke('sid-g2', '82');
RESET ROLE;
SET ROLE authenticated;
SELECT tests.as_claims('{"sub": "00000000-0000-0000-0000-0000000000a2", "role": "authenticated", "session_id": "60000000-0000-0000-0000-0000000000a2"}');
SELECT tests.assert(NOT public.is_admin(auth.uid()), 'signed-out hub session: not admin');
RESET ROLE;
SELECT tests.as_claims('{}');
