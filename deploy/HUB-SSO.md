# Login único pelo Hub — área administrativa do Academy

Só o **/admin** usa o Hub. Alunos e o login das organizações (`/login`, `/org/<slug>/login`)
continuam como estão (e-mail e senha no Supabase, com o MFA próprio do Academy). Para quem administra: senha e código do app autenticador só no Hub, uma vez.
Abrir o Academy pelo lançador do Hub cai direto no painel, já logado.

Sistema no Hub: **id 11** (`https://academy.ifatokun.com.br/`).

## 1. Decisão de arquitetura (registro)

**Contexto.** O Academy é uma SPA estática (Vite + React) servida pelo Nginx; os dados e o login
estão no Supabase (`xkbruecvfumxqjrjhupv`). Uma SPA não guarda segredo, e o Hub exige um cliente
OIDC confidencial (code + PKCE S256 + `client_secret`).

**Opções avaliadas (lendo o `@supabase/auth-js` 2.89.0 instalado, não a memória):**

- *Provedor OIDC do próprio Supabase Auth.* O tipo `Provider` do auth-js só aceita provedores
  fixos (google, azure, keycloak, workos…); não há emissor OIDC genérico no cliente. `signInWithSSO`
  é SAML (plano pago). Além disso o Supabase **criaria** usuários sozinho no primeiro login e não
  tem logout por back-channel. Descartado.
- *Third-party auth (JWT do Hub direto no PostgREST).* Só para provedores listados (Clerk,
  Firebase, Auth0, Cognito, WorkOS) e trocaria o modelo de sessão do app inteiro. Descartado.
- **Escolhida: uma Edge Function `hub-sso` como cliente OIDC confidencial.** Ela guarda o segredo,
  troca o código no Hub, valida o ID token com `jose` no JWKS do Hub e abre uma sessão Supabase
  **para um usuário que já existe e já é admin**, pelo caminho oficial do Admin API:
  `auth.admin.generateLink({ type: "magiclink" })` (não envia e-mail) e `auth.verifyOtp({ token_hash })`
  no próprio servidor. A sessão volta para a SPA **no corpo de um POST**, nunca na URL.
  `auth.admin.signOut(jwt)` exige o JWT da pessoa (não serve para o back-channel), então o logout
  apaga a linha em `auth.sessions` por uma função SQL `SECURITY DEFINER` (os refresh tokens caem
  junto, `ON DELETE CASCADE`).

**Mesmo desenho e mesmos arquivos** no Gba-Orun, no Isesemind e no Academy:
`supabase/functions/_shared/hub-sso/*` e `src/lib/hubSso.ts` são idênticos nos três; muda só a
migração (quem conta como admin) e a ligação com as telas (`src/lib/hubSsoProject.ts`).

## 2. Como funciona

```
Lançador do Hub ──> /auth/hub/iniciar?iss=<emissor>&target_link_uri=<url do sistema>
  SPA confere iss (= VITE_HUB_ISSUER) e o destino (mesma origem, dentro de /admin; senão /admin)
  SPA cria verifier PKCE + state + nonce (sessionStorage, 10 min, uso único)
  SPA ──POST hub-sso/start──> função devolve a URL de autorização do Hub (client_id, redirect_uri)
Hub (sessão + TOTP já feitos) ──> /auth/hub/callback?code=…&state=…
  SPA confere state, apaga o pendente, ──POST hub-sso/exchange {code, verifier, nonce}──>
  função: /token com segredo + verifier → valida ID token (JWKS, iss, aud, exp, nonce, azp,
          email_verified, sid) → hub_sso_find_user(e-mail, papéis) → só usuário EXISTENTE,
          e-mail confirmado, não bloqueado, com papel permitido → generateLink + verifyOtp →
          grava (sessão Supabase ↔ sid do Hub) → troca a senha Supabase por uma aleatória
          → encerra as sessões Supabase dessa pessoa abertas SEM o Hub (senha, link de redefinição)
  SPA: supabase.auth.setSession(...) → /admin
Sair no Academy ──> supabase.auth.signOut() → end_session do Hub ("Sair de todos os sistemas?")
Hub encerra a sessão ──POST logout_token──> hub-sso/backchannel-logout
  função valida o logout token (JWKS, iss, aud, iat ≤ 5 min, jti, evento, sem nonce)
  → hub_sso_revoke(sid, sub): marca o vínculo e apaga as sessões Supabase
  → is_admin()/is_org_or_global_admin()/is_organization_admin() passam a dizer "não" para o access token que ainda estiver no navegador
  → a tela do admin percebe em até 1 min (ou ao voltar para a aba) e volta para o Hub
```

Sem sessão, abrir `/admin` direto vai para o Hub e volta para a mesma página (não existe mais tela
de login do admin no uso normal). Admins de organização (papel `org_admin`, fora do padrão de `HUB_SSO_ALLOWED_ROLES`) continuam
entrando pelo `/login` como hoje. O MFA do Supabase (`/mfa-verify`) **não** é pedido para uma sessão
aberta pelo Hub: o segundo fator já foi o do Hub.

## 3. Rotas e funções

| O quê | Onde |
| --- | --- |
| Entrada pelo lançador (initiate_login_uri) | `https://academy.ifatokun.com.br/auth/hub/iniciar` (SPA, `src/pages/HubSsoStart.tsx`) |
| Retorno do Hub (redirect_uri) | `https://academy.ifatokun.com.br/auth/hub/callback` (SPA, `src/pages/HubSsoCallback.tsx`) |
| Depois de sair (post_logout_redirect_uri) | `https://academy.ifatokun.com.br/` |
| Logout por back-channel | `https://xkbruecvfumxqjrjhupv.supabase.co/functions/v1/hub-sso/backchannel-logout` |
| Edge Function | `supabase/functions/hub-sso` (`verify_jwt = false`): `GET status`, `POST start`, `POST exchange`, `POST backchannel-logout` |
| Guarda do /admin | `src/components/hub-sso/HubAdminGuard.tsx` (em volta de `ProtectedRoute requireAdmin` em `src/App.tsx`) |
| MFA | `src/components/ProtectedRoute.tsx` não manda para `/mfa-verify` quando a sessão é do Hub (`hub_sso_session_status() = active`) |
| "Sair" | `src/lib/hubSsoSession.ts` → `signOutWithHub()` (em `src/components/layout/AdminLayout.tsx` e `Header.tsx`; só vai ao Hub se a sessão veio do Hub) |
| Banco | `supabase/migrations/20261008230000_hub_sso.sql` (tabela `hub_sso_sessions` + funções), `20261009090000_hub_sso_end_local_sessions.sql` (encerra as sessões sem Hub de quem entrou pelo Hub) e `20261008230100_hub_sso_role_guard.sql` (`is_admin`, `is_org_or_global_admin` e `is_organization_admin` recusam sessão revogada); segurança: `20261009120000_security_profile_organization_guard.sql` (aluno não troca de organização sozinho; policies de membros com os argumentos certos) e `20261009120100_security_admin_confirmed_email.sql` (`is_admin` só com e-mail confirmado); hook: `20261009130000_hub_sso_access_token_hook.sql` (só cria as funções, ver §9) |

## 4. Configuração (nada fixo no código)

Segredos da Edge Function (`supabase secrets set`, nunca no git):

| Chave | Valor em produção | Observação |
| --- | --- | --- |
| `HUB_SSO_ENABLED` | `true` | Interruptor do servidor. `false` = a SPA volta ao login antigo **sem novo build** (plano B de emergência). |
| `HUB_ISSUER` | `https://hub.ifatokun.com.br/oidc` | |
| `HUB_CLIENT_ID` | do bloco "Login único" do sistema 11 | |
| `HUB_CLIENT_SECRET` | idem (aparece uma vez) | |
| `HUB_SSO_APP_URL` | `https://academy.ifatokun.com.br` | origem da SPA: monta o redirect_uri e libera o CORS |
| `HUB_SSO_ALLOWED_ROLES` | `admin` | `admin` = admin global (e-mail em `admin_emails`); `org_admin` = admin/owner de organização. Só inclua `org_admin` se essas pessoas tiverem conta `@ifatokun.com.br` no Hub |
| `HUB_SSO_LOCK_PASSWORD` | `true` (padrão) | troca a senha Supabase do admin por uma aleatória a cada login pelo Hub e encerra as sessões dele abertas sem o Hub: ninguém entra no admin com e-mail+senha direto no Supabase Auth (anon key pública) pulando o Hub, nem fica com uma sessão antiga aberta com a senha |
| `HUB_SSO_TOKEN_AUTH_METHOD` | `client_secret_basic` (padrão) | ou `client_secret_post`, igual ao bloco do Hub |
| `HUB_SSO_CALLBACK_PATH`, `HUB_SSO_POST_LOGOUT_PATH` | padrão `/auth/hub/callback` e `/` | só se mudar as rotas |

Variáveis de build da SPA (secrets do GitHub Actions, passadas no `npm run build`):

| Chave | Valor | Observação |
| --- | --- | --- |
| `VITE_HUB_SSO_ENABLED` | `true` | sem isto o app fica exatamente como antes |
| `VITE_HUB_ISSUER` | `https://hub.ifatokun.com.br/oidc` | único `iss` aceito na entrada |
| `VITE_HUB_SSO_LOCAL_LOGIN` | vazio / `false` | **plano B de emergência**: `true` volta a aceitar o login antigo do admin (e-mail e senha em `/login`); com `HUB_SSO_LOCK_PASSWORD` ligado é preciso usar "Esqueci a senha" |
| `VITE_HUB_SSO_FUNCTION_URL` | opcional | padrão `${VITE_SUPABASE_URL}/functions/v1/hub-sso` |

## 5. Passo a passo de produção (Felipe)

0. **Histórico de migrações do banco (antes de juntar na `main`).** O Academy saiu do Lovable com o
   banco já montado; o `deploy-supabase.yml` roda `supabase db push` e, agora, antes dele uma trava
   (`scripts/check-migration-history.mjs`) que **falha** se o histórico remoto não bate. Confira você
   mesmo, no terminal do Mac:
   ```bash
   supabase link --project-ref xkbruecvfumxqjrjhupv      # pede a senha do banco (cofre)
   supabase migration list > /tmp/m.txt && node scripts/check-migration-history.mjs /tmp/m.txt
   ```
   Só as migrações de `20261008230000` em diante podem aparecer sem a coluna Remote. Se as antigas
   aparecerem sem Remote (histórico vazio) e o schema já existe, marque-as como aplicadas, uma vez:
   ```bash
   supabase migration repair --status applied $(ls supabase/migrations | grep -v '^20261008\|^20261009' | cut -d_ -f1)
   ```
   (Desfazer: `supabase migration repair --status reverted <versão>`.) Só depois junte na `main`.

1. **E-mails (obrigatório antes de ligar).** O Hub só emite contas `@ifatokun.com.br`, e no Academy
   o admin global é decidido **pelo e-mail** (`admin_emails` ↔ `auth.users.email`). No export do
   Lovable de 19/09 os admins globais eram `ifatokun@offeorunmila.com` e
   `ifatokun@ileaseifatokun.com.br`: **nenhum é @ifatokun.com.br**. Para cada admin que vai usar o
   Hub, trocar o e-mail nos DOIS lugares (senão ele perde o admin ou não é achado):
   ```sql
   -- conferir a lista atual
   SELECT ae.email, u.id IS NOT NULL AS tem_conta, u.email_confirmed_at IS NOT NULL AS confirmado
   FROM public.admin_emails ae LEFT JOIN auth.users u ON u.email = ae.email;
   ```
   Trocar o e-mail do usuário em Authentication › Users (ou `auth.admin.updateUserById(id,
   { email, email_confirm: true })`) e, na mesma hora,
   `UPDATE public.admin_emails SET email = 'nome@ifatokun.com.br' WHERE email = '<antigo>';`.
   Ninguém é criado nem promovido automaticamente pelo login do Hub.
2. **Hub › Sistemas › Academy (id 11) › Login único › Configurar**: copiar o `client_secret`, e
   preencher:
   - URL de retorno: `https://academy.ifatokun.com.br/auth/hub/callback`
   - URL de logout por back-channel: `https://xkbruecvfumxqjrjhupv.supabase.co/functions/v1/hub-sso/backchannel-logout`
   - URL após sair: `https://academy.ifatokun.com.br/`
   - URL de entrada (initiate_login_uri): `https://academy.ifatokun.com.br/auth/hub/iniciar`
   - Endereço do sistema no Hub pode continuar `https://academy.ifatokun.com.br/` (a entrada leva
     para `/admin`). Ligar o interruptor e liberar o sistema para as pessoas certas.
3. **Segredos da função** (antes do deploy da função):
   ```bash
   supabase secrets set --project-ref xkbruecvfumxqjrjhupv \
     HUB_SSO_ENABLED=true HUB_ISSUER=https://hub.ifatokun.com.br/oidc \
     HUB_CLIENT_ID=hub-11-xxxx HUB_CLIENT_SECRET='...' \
     HUB_SSO_APP_URL=https://academy.ifatokun.com.br HUB_SSO_ALLOWED_ROLES=admin
   ```
4. **Banco + função.** O merge em `main` dispara `deploy-supabase.yml`, que roda `supabase db push`
   (as três migrações `20261008230000_hub_sso.sql`, `20261008230100_hub_sso_role_guard.sql` e `20261009090000_hub_sso_end_local_sessions.sql`) e
   `supabase functions deploy` (inclui `hub-sso`). Manual, se preferir:
   ```bash
   supabase db push --project-ref xkbruecvfumxqjrjhupv
   supabase functions deploy hub-sso --project-ref xkbruecvfumxqjrjhupv
   ```
   A ordem completa das migrações deste branch está em §9.1. A `20261009130000` só cria as funções
   do hook: nada muda até você ligá-lo (§9.3).
   Para aplicar **só a correção independente agora**, sem o SSO: SQL Editor › colar o conteúdo de
   `supabase/migrations/20261009120000_security_profile_organization_guard.sql` › Run. A
   `20261009120100` espera as migrações do SSO. Quando o `db push` rodar depois, as duas rodam (de
   novo, no caso da primeira) sem problema: são idempotentes.
   O workflow já publica as funções; manual: `supabase functions deploy create-user` (idem
   `delete-user`, `update-user-permissions`, `generate-module-banner`) `--project-ref
   xkbruecvfumxqjrjhupv`. O guarda vale mesmo com o hook desligado: também barra o token de uma
   sessão encerrada no Hub.
5. **SPA.** Criar os secrets do GitHub `VITE_HUB_SSO_ENABLED=true` e
   `VITE_HUB_ISSUER=https://hub.ifatokun.com.br/oidc` e acrescentá-los ao `env:` do passo
   `npm run build` em `.github/workflows/deploy-frontend.yml` (o workflow já faz o deploy atômico).
6. **Teste**: Hub › lançador › Academy → cai em `/admin` logado. Sair no Hub → em até 1 minuto o
   admin volta para o login do Hub.
7. **Recomendado**: Authentication › Settings › JWT expiry em 600–900 s (hoje 3600 s). O
   `is_admin` já recusa o token revogado na hora; isto encurta o resto (ex.: telas que só leem a
   própria linha).

**Emergência (Hub fora do ar):** se o hook de §9.3 estiver ligado, **desligue-o primeiro** (senão "Esqueci a senha" é recusado para admin). Depois: `supabase secrets set HUB_SSO_ENABLED=false` → o `/admin` volta
ao fluxo antigo sem rebuild (com a senha aleatória, use "Esqueci a senha"). Ou rebuild com
`VITE_HUB_SSO_LOCAL_LOGIN=true`.

## 6. Testes

- `npm test` (novo: `vitest run`) — `src/test/hub-sso/*.test.ts` (112 testes no `npm test`, incluindo `realProvider.test.ts`: o fluxo inteiro contra o `oidc-provider` de verdade, o mesmo do Hub, e `migrationHistory.test.ts`; incluindo `guard.test.ts`: o guarda das Edge Functions, §9.4): validação de `iss`/`target_link_uri`,
  PKCE (vetor do RFC 7636), estado de uso único e expiração, ID token e logout token **assinados
  de verdade** (RS256, chave de teste) e validados pelo `jose` num JWKS servido por HTTP local
  (nonce, aud, azp, iss, exp, iat, jti, evento, assinatura forjada, outro algoritmo), código usado
  duas vezes, PKCE errado, mapeamento e recusas (sem usuário, sem papel, bloqueado, e-mail não
  confirmado), troca de senha, o cliente `supabase-js` real com `fetch` falso (confere que só
  chama `rpc/hub_sso_find_user`, `admin/generate_link` e `verify`, nunca cria usuário).
- `bash supabase/tests/hub_sso/run.sh` — além do abaixo, roda `hook_test.sql` (o hook como
  `supabase_auth_admin`: permissões, cada método de login, claims obrigatórias mantidas, a regra
  com e sem a claim) e os testes de segurança (`security_base/before/after.sql`): o aluno mudando de organização e o cadastro caindo em outra organização antes da correção e barrados depois (aplicada duas vezes), o admin de organização adicionando membro só na dele, `is_admin` recusando e-mail não confirmado, o seletor de organização, o service role e o admin global ainda funcionando.
  O mesmo script aplica as migrações num PostgreSQL local descartável
  (socket, sem porta) com um esqueleto do `auth` e confere permissões, status, revogação e o
  `has_role` recusando o token revogado.
- `node scripts/hub-sso-doctor.ts` — diagnóstico de fora, sem segredo: o Hub, a função `hub-sso`, se o Hub aceita o `client_id`/URL de retorno, e se o site publicado já traz o login pelo Hub. Rode antes e depois de cada passo do §5.
- `scripts/hub-sso-dev.ts` — a função real em Deno + um Supabase falso em memória, para testar no
  navegador contra o Hub local (instruções no topo do arquivo; `DEV_USER_MFA=true` simula um admin com TOTP do Supabase).

## 7. Achados durante o trabalho

- **ALTO, já existia:** `is_admin()` casa `auth.users.email` com `admin_emails` **sem exigir e-mail
  confirmado**. Se um e-mail estiver em `admin_emails` antes de a pessoa ter conta, e o cadastro
  por e-mail estiver aberto sem confirmação, qualquer um cria a conta com esse e-mail (anon key
  pública) e vira admin global. Conferir em Authentication › Providers › Email ("Confirm email"
  ligado / cadastro desligado).
- **ALTO, já existia:** "Users can update their own profile" deixa o aluno trocar o
  `organization_id` do próprio perfil para qualquer organização e ler dados dela.
- **CORRIGIDOS em 09/10/2026** (ver §9): migrações
  `20261009120000_security_profile_organization_guard.sql` (organização do perfil, cadastro com
  organização no metadata, policies de membros) e `20261009120100_security_admin_confirmed_email.sql`
  (`is_admin` com e-mail confirmado). A versão "proposta" tinha um defeito: o gatilho era
  `SECURITY DEFINER`, então o `current_user` dentro dele era sempre o dono e ele nunca barrava
  nada; a migração usa `SECURITY INVOKER` e um teste pega esse erro. Ao conferir, apareceu mais
  uma porta: o cadastro aceitava `organization_id` no metadata do usuário (corrigido também).
- **Mesmo bug de argumentos trocados, NÃO corrigido (registro):** a policy "Org admins can manage
  permissions for their org modules" de `user_module_permissions` (20260118224215) chama
  `is_organization_admin(get_module_organization_id(module_id), auth.uid())`. Ela só nega acesso
  (o admin de organização não gerencia permissões dos módulos dele). Corrigir dá esse poder a ele,
  então fica para você decidir: trocar a ordem para `(auth.uid(), get_module_organization_id(module_id))`.
- **Já existia, não corrigido:** `generate-module-banner` usa `supabase-js@2.7.1` e chama
  `auth.getClaims`, que essa versão não tem (o `deno check` acusa; a função provavelmente falha).
- **BAIXO (bug, nega acesso):** a policy "Org admins can add members" chama
  `is_organization_admin(organization_id, auth.uid())` com os argumentos trocados (a função é
  `(p_user_id, p_organization_id)`); hoje só o admin global consegue adicionar membros.
- O branch começa com um commit que só reproduz o que estava **sem commit** no `main` local (a
  migração do Lovable para o Supabase próprio: `project_id` novo, workflows, `deploy/`, remoção do
  `lovable-tagger`, `.env` fora do git). Os commits do SSO vêm depois dele.
- `package.json` ganhou `vitest` e `jose` (só desenvolvimento) e o script `test`; `bun.lock`/
  `bun.lockb` não foram atualizados (o deploy usa `npm ci`).

## 8. Revisão de segurança (09/10/2026)

Conferido: ID token (assinatura RS256 fixa, JWKS com rotação, iss, aud, azp, exp, iat, nonce,
`email_verified`, `sid`), state/PKCE de uso único, destino depois do login (só mesma origem e
dentro de `/admin`; `//evil`, `/\evil`, codificados, `javascript:` caem em `/admin`), logout token
(evento, sem nonce, iat ≤ 5 min, sid/sub), CORS só da origem da SPA, funções SQL `SECURITY DEFINER`
com `search_path` fixo e execução só para `service_role`, interruptores com padrão seguro.

Corrigido nesta revisão:
- **Sessões abertas sem o Hub continuavam valendo** depois que o admin passava a entrar pelo Hub
  (ex.: alguém que entrou com a senha antes da troca, ou por um link de "Esqueci a senha"). Agora
  cada login pelo Hub (com `HUB_SSO_LOCK_PASSWORD` ligado) encerra as sessões Supabase dessa pessoa
  que não vieram do Hub (`hub_sso_end_local_sessions`).
- O retorno do Hub com `iss` de outro emissor é recusado (RFC 9207); o código sai da barra de
  endereço antes da troca; a tela de erro não repete texto livre vindo do link (`?error=`).

Era a decisão pendente: o Supabase Auth aceitava **"Esqueci a senha" / link mágico** pela anon key
pública, e quem controlasse a caixa de e-mail de um admin abria uma sessão de admin sem o TOTP do
Hub. **Preparado em 09/10/2026, não ligado:** o *Custom Access Token Hook*
`hub_sso_access_token_hook` e o guarda das Edge Functions. Para ligar e desligar, ver §9.3.

## 9. Correções de segurança e fechamento do "Esqueci a senha" (09/10/2026)

### 9.1 Ordem das migrações deste branch

O `supabase db push` aplica nesta ordem (todas idempotentes, nenhuma migração antiga foi editada):

1. `20261008230000_hub_sso.sql` — SSO
2. `20261008230100_hub_sso_role_guard.sql` — SSO
3. `20261009090000_hub_sso_end_local_sessions.sql` — SSO
4. `20261009120000_security_profile_organization_guard.sql` — **correção de segurança, independe do SSO**
5. `20261009120100_security_admin_confirmed_email.sql` — correção de segurança, **precisa das migrações do SSO** (mantém a checagem do Hub no `is_admin`)
6. `20261009130000_hub_sso_access_token_hook.sql` — **só cria** as funções do hook (precisa das do SSO). Sem
   o hook ligado, nada muda.

### 9.2 O que pode ir para produção já, sem o SSO

- **`20261009120000_security_profile_organization_guard.sql` — pode aplicar já, sozinha.**
  (1) O aluno só põe no próprio perfil uma organização da qual é membro (`organization_members`
  ou `organization_admins`), ou deixa vazio. (2) No cadastro, a organização vem só do
  `raw_app_meta_data` (só o servidor grava). Antes vinha do `raw_user_meta_data`, que quem se
  cadastra escolhe: `signUp({ options: { data: { organization_id } } })` caía em qualquer
  organização. Nada no app usava isso. (3) As quatro policies de `organization_members` chamam
  `is_organization_admin(auth.uid(), organization_id)` na ordem certa: o admin de organização
  volta a ver, adicionar, alterar e remover membros **da própria** organização. Continua
  funcionando: o seletor de organização (`setPrimaryOrganization`), o `create-user` (service
  role), o admin global.
- **`20261009120100_security_admin_confirmed_email.sql` — só junto com (ou depois de) as
  migrações do SSO.** Ela recria `is_admin()` com a checagem do Hub e exige e-mail confirmado.
  Antes de aplicar, rodar no SQL Editor (precisa voltar vazio; se vier alguém, confirmar o e-mail
  dessa pessoa antes):
  ```sql
  SELECT ae.email FROM public.admin_emails ae JOIN auth.users u ON u.email = ae.email
  WHERE u.email_confirmed_at IS NULL;
  ```

Todas foram testadas no PostgreSQL local: o ataque funciona antes e é barrado depois, os caminhos
legítimos continuam gravando, e aplicar duas vezes não quebra nada.

### 9.3 Hook que fecha o "Esqueci a senha" para admins (preparado, NÃO ligado)

**O que faz.** O Supabase Auth chama `public.hub_sso_access_token_hook` antes de emitir qualquer
token (login e renovação). Para quem tem papel gerenciado pelo Hub (hoje só `admin`, o admin global de `admin_emails`; a
função `hub_sso_hook_roles()` precisa bater com o segredo `HUB_SSO_ALLOWED_ROLES`; admins de
organização, `org_admin`, ficam de fora, a não ser que você os acrescente nos dois):

- sessão aberta pelo Hub: o token sai normal;
- sessão que **não** veio do Hub, aberta por senha, link de "Esqueci a senha", cadastro, convite,
  troca de e-mail, ou a **renovação** dela: **recusada** ("Quem administra entra pelo Hub");
- sessão encerrada no Hub: recusada;
- link mágico: sai o token, marcado `hub_sso: "unlinked"`. O link do próprio Hub é igual a um link
  mandado por e-mail, então não dá para recusar na hora. Esse token **não tem poder de admin**
  (todas as checagens de papel no banco e o guarda das funções recusam) e não se renova. O Hub
  vincula a sessão dele antes de entregar ao navegador, então o login pelo Hub funciona.

Alunos, membros e quem não tem papel do Hub: nada muda. Com o hook desligado, nada muda para
ninguém. Se o hook tiver um erro interno, o login passa como "unlinked" (sem poder de admin), em
vez de travar todo mundo.

**Pré-requisitos:** SSO em produção e testado (§5), as migrações de §9.1 aplicadas e as funções
publicadas.

**Ligar:**
1. Dashboard do projeto `xkbruecvfumxqjrjhupv` › Authentication › Hooks (ou "Auth Hooks") ›
   **Customize Access Token (JWT) Claims hook** › Add/Enable.
2. Tipo **Postgres**, schema `public`, função `hub_sso_access_token_hook` › Save.
   (Não precisa mexer em permissões: a migração já deu `EXECUTE` só ao `supabase_auth_admin`.)
3. Teste logo em seguida, numa janela anônima:
   - Hub › lançador › Academy → cai no `/admin` logado. Deixe a aba aberta mais que o tempo do
     JWT (ou recarregue depois de alguns minutos): continua logado.
   - Em `/auth`, "Esqueci a senha" com o e-mail de um admin → o link do e-mail **não** abre sessão
     (mensagem do Hub).
   - Um aluno/membro entra com e-mail e senha normalmente.

**Desligar (rollback imediato):** mesma tela › desligar (ou remover) o hook. Vale na hora para os
próximos tokens; não precisa mexer no banco. Para remover as funções de vez (opcional, com o hook
desligado): `DROP FUNCTION public.hub_sso_access_token_hook(jsonb); DROP FUNCTION
public.hub_sso_hook_roles();`. A regra "unlinked" em `hub_sso_current_session_revoked()` pode
ficar: sem o hook, nenhum token tem essa marca.

**Emergência com o hook ligado:** desligue o hook **antes** de `HUB_SSO_ENABLED=false`; senão o
"Esqueci a senha" do admin continua recusado.

**Não pôr no `supabase/config.toml`** (`[auth.hook.custom_access_token]`): um `config push`
ligaria o hook sem o teste acima.

### 9.4 Edge Functions que conferem papel com o service role

O hook protege o que o banco confere com o JWT de quem chama. Funções que leem `user_roles` /
`is_admin` com a **service role** não veem esse JWT. Por isso o guarda
`supabase/functions/_shared/hub-sso/guard.ts` (igual nos três projetos) faz a mesma pergunta ao
banco **como quem chamou** (`rpc/hub_sso_current_session_revoked` com o JWT dela) e devolve 403
quando a sessão foi encerrada no Hub ou é uma sessão de admin sem o Hub. Se der erro, ele bloqueia
(por isso as funções vão para produção depois das migrações, como o workflow já faz).

Funções que ganharam o guarda (todas conferem `is_admin` com o service role): `create-user`,
`delete-user`, `update-user-permissions`, `generate-module-banner`.

### 9.5 O que continua de fora

- Um link mágico pedido por e-mail para o endereço de um admin ainda abre uma sessão **comum**
  (sem admin) até o JWT expirar, sem renovar. O próximo login dele pelo Hub encerra essa sessão.
- O hook só cobre os papéis de `hub_sso_hook_roles()`.
