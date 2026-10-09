-- Before the fixes: the attacks WORK, and org admins cannot add members (swapped arguments).
\set ON_ERROR_STOP 1
SELECT tests.assert((SELECT organization_id = '60000000-0000-0000-0000-00000000000a' FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000f1'), 'setup: S in org A');
SET ROLE authenticated;
SELECT tests.as_claims('{"sub": "00000000-0000-0000-0000-0000000000f1", "role": "authenticated"}');
UPDATE public.profiles SET organization_id = '60000000-0000-0000-0000-00000000000b' WHERE id = auth.uid();
SELECT tests.as_claims('{"sub": "00000000-0000-0000-0000-0000000000f3", "role": "authenticated"}');
DO $$ BEGIN
  INSERT INTO public.organization_members (user_id, organization_id) VALUES ('00000000-0000-0000-0000-0000000000f2', '60000000-0000-0000-0000-00000000000a');
  RAISE EXCEPTION 'FAILED: expected the swapped policy to refuse the org admin';
EXCEPTION WHEN insufficient_privilege THEN NULL; END $$;
SELECT tests.as_claims('{"sub": "00000000-0000-0000-0000-0000000000e2", "role": "authenticated"}');
SELECT tests.assert(public.is_admin(auth.uid()), 'before: unconfirmed e-mail in admin_emails is a global admin');
RESET ROLE;
SELECT tests.assert((SELECT organization_id = '60000000-0000-0000-0000-00000000000b' FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000f1'), 'before: student moved into org B');
-- Sign-up with someone else's organization in the user metadata.
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ('00000000-0000-0000-0000-0000000000f4', 'intruso@example.com', '{"organization_id": "60000000-0000-0000-0000-00000000000b"}');
SELECT tests.assert((SELECT organization_id = '60000000-0000-0000-0000-00000000000b' FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000f4'), 'before: sign-up lands in org B');
-- Back to the starting state.
UPDATE public.profiles SET organization_id = '60000000-0000-0000-0000-00000000000a' WHERE id = '00000000-0000-0000-0000-0000000000f1';
DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-0000000000f4';
DELETE FROM public.profiles WHERE id = '00000000-0000-0000-0000-0000000000f4';
