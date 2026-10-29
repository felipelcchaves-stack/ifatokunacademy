# Login único (Hub) do Academy: por que não funcionava e o que falta

Branch `fix/hub-sso-funcionando` (sai de `feat/hub-sso`). Data: 25/10/2026.

## 1. Causa

**O login pelo Hub nunca foi publicado.** Não é um defeito de código.

Provas (só leituras públicas e locais, nada em produção foi alterado):

- O JavaScript que `https://academy.ifatokun.com.br` serve hoje (`assets/index-BiJUrevT.js`) tem **0** ocorrências de `hub_sso_pending` / `auth/hub`: é o app antigo, sem a tela de retorno `/auth/hub/callback`.
- `feat/hub-sso` está 14 commits à frente da `main` e **não foi mesclada** (a `main` é ancestral dela, não há nada a rebasear). O `deploy-frontend.yml` e o `deploy-supabase.yml` só rodam em push na `main`.
- Portanto também não existem em produção: a função `hub-sso`, as migrações `*_hub_sso*.sql`, os segredos `HUB_*` e os secrets `VITE_HUB_*` do build.
- O Hub, do lado dele, está no ar e correto (`/oidc/.well-known/openid-configuration` com `sid`, PKCE S256 e back-channel logout). O Hub local tem o Academy como sistema 11 e `scripts/seed-sso-clients.mts` do Hub registra exatamente as URLs que o código do Academy usa (retorno `/auth/hub/callback`, entrada `/auth/hub/iniciar`, logout `https://xkbruecvfumxqjrjhupv.supabase.co/functions/v1/hub-sso/backchannel-logout`, saída `/`).

O código em si foi testado agora **contra o mesmo `oidc-provider` do Hub** (não um fake): `src/test/hub-sso/realProvider.test.ts` faz /start, segue os redirecionamentos do Hub com cookies, volta no callback com `code`, `state` e `iss`, troca o código, confere que o ID token real traz `sid`, e derruba a sessão por back-channel real. Passou de primeira. Os 101 testes que já existiam também passam.

## 2. O que impediria o SSO mesmo depois de juntar (levantamento)

| # | Impedimento | Estado | Como fica |
|---|---|---|---|
| 1 | Código não está na `main`/produção | Real, causa principal | Seção 5, passos 6 a 8 |
| 2 | Admins globais não são `@ifatokun.com.br` (`ifatokun@offeorunmila.com`, `ifatokun@ileaseifatokun.com.br`). O Hub só emite `@ifatokun.com.br`, então o login cai em "Não há usuário com o e-mail…" | Real, só o Felipe resolve | passo 3 |
| 3 | Histórico de migrações do banco remoto: o Academy saiu do Lovable com o banco pronto; se o histórico estiver vazio, o `db push` do primeiro deploy tentaria rodar as 61 migrações antigas de novo e falharia no meio (já vi: elas têm `CREATE TABLE` simples e até `INSERT` de dados de um usuário) | **Não verificável sem acesso ao banco**; risco alto | **Corrigido no código:** trava `scripts/check-migration-history.mjs` no `deploy-supabase.yml` (barra antes do `db push`) + passo 0 em `deploy/HUB-SSO.md` §5 |
| 4 | Segredos da função (`HUB_CLIENT_ID`, `HUB_CLIENT_SECRET`, `HUB_SSO_APP_URL`...) ausentes: a função responde "não configurado" (503) | Só o Felipe | passos 2 e 4 |
| 5 | Cliente "Login único" do Academy no Hub desligado ou com URL de retorno diferente (qualquer divergência vira erro 400 no Hub) | Só o Felipe confere | passo 2; o **diagnóstico** agora acusa isso de fora |
| 6 | Secrets do GitHub `VITE_HUB_SSO_ENABLED`/`VITE_HUB_ISSUER` | Só o Felipe | passo 7 |
| 7 | Deploy da função e do site disparam juntos na `main`; só era possível reexecutar fazendo novo push | **Corrigido:** `workflow_dispatch` nos dois workflows (botão "Run workflow") | |
| 8 | Domínio/CORS/cookie | Sem problema: SPA estática, sessão vem no corpo de um POST (não depende de cookie); CORS libera só `HUB_SSO_APP_URL`, que precisa ser exatamente `https://academy.ifatokun.com.br` | |
| 9 | `main` local do Academy tem 25 arquivos sem commit | Atenção ao mesclar (seção 5, passo 6) | |

Observação sobre a `main` local suja: o primeiro commit da branch (`fc00d92`) é um retrato desses arquivos; conferi arquivo a arquivo e o conteúdo é idêntico ao da pasta `Academy` (só o `.env` difere, de propósito: ele fica fora do git).

## 3. O que mudou nesta branch

- `src/test/hub-sso/realProvider.test.ts` (novo): fluxo completo contra o `oidc-provider` real, "código só vale uma vez", Hub sem sessão, e os dois testes do diagnóstico. Adicionado `oidc-provider@9.12.2` em `devDependencies` (mesma versão do Hub).
- `scripts/hub-sso-doctor.ts` (novo): `node scripts/hub-sso-doctor.ts`. Sem segredo. Confere Hub, função `hub-sso`, CORS, se o **Hub aceita o client_id e a URL de retorno** (pede a autorização e vê se o Hub redireciona ou responde 400) e se o site publicado traz o código do SSO. Cada falha diz o que fazer. Rodei agora (sem a parte Supabase): Hub 4/4 ok; site publicado "sem o login pelo Hub".
- `scripts/check-migration-history.mjs` (novo) + `src/test/hub-sso/migrationHistory.test.ts` + passo no `.github/workflows/deploy-supabase.yml`: falha o deploy, antes do `db push`, se migrações antigas não constam como aplicadas no remoto ou se o remoto tem versões desconhecidas.
- `workflow_dispatch` em `deploy-supabase.yml` e `deploy-frontend.yml`.
- `deploy/HUB-SSO.md`: §5 passo 0 (histórico de migrações), seção de testes e diagnóstico atualizadas.
- Não alterei Edge Function, SPA nem migrações SQL: não achei defeito nelas.

## 4. Verificação (rodada na worktree)

- `npx vitest run`: 6 arquivos, **112 testes passando** (101 antigos + 11 novos).
- `npx tsc -p tsconfig.app.json --noEmit`: sem erros.
- `npx eslint` nos arquivos do SSO, `src/test` e `scripts`: limpo. O `eslint .` do projeto inteiro acusa 230 erros que já existiam (código do Lovable, `no-explicit-any`, `require` no tailwind); não mexi.
- `npx vite build`: ok.
- `deno check` da função `hub-sso` e de `scripts/hub-sso-dev.ts`: ok.
- `bash supabase/tests/hub_sso/run.sh` (PostgreSQL local descartável): SSO, hook e segurança, ok.
- Migrações antigas num Postgres vazio com `auth` falso: 6 falham (falta `auth.role()`, `storage.buckets` no esqueleto, e um `INSERT` de dados de usuário real). É o motivo de a trava do item 3 existir: **elas não podem ser reaplicadas**.

## 5. O que só o Felipe pode fazer (nesta ordem)

Antes de tudo: `node scripts/hub-sso-doctor.ts` (na worktree `Academy-wt-sso`, com `npm ci`). Ele mostra o que falta. Rode de novo depois de cada passo.

1. **Histórico de migrações (decide se o deploy roda).** No Mac, na worktree:
   ```bash
   supabase link --project-ref xkbruecvfumxqjrjhupv
   supabase migration list > /tmp/m.txt && node scripts/check-migration-history.mjs /tmp/m.txt
   ```
   Se reclamar de migrações antigas sem "Remote" e o schema já está no banco, uma vez só:
   `supabase migration repair --status applied $(ls supabase/migrations | grep -v '^20261008\|^20261009' | cut -d_ -f1)`
2. **Hub** (hub.ifatokun.com.br › Sistemas › Academy (id 11) › Login único › Configurar): copiar o `client_secret` (aparece uma vez) e preencher
   - URL de retorno `https://academy.ifatokun.com.br/auth/hub/callback`
   - Logout back-channel `https://xkbruecvfumxqjrjhupv.supabase.co/functions/v1/hub-sso/backchannel-logout`
   - URL após sair `https://academy.ifatokun.com.br/`
   - URL de entrada `https://academy.ifatokun.com.br/auth/hub/iniciar`
   - Método de autenticação: `client_secret_basic`. Ligar só depois do passo 8. Liberar o sistema para as pessoas certas em Usuários.
   (No Hub de produção: `pnpm seed:sso` cria o cliente com essas URLs e imprime o segredo uma vez.)
3. **E-mail do administrador** (Supabase › SQL Editor, projeto `xkbruecvfumxqjrjhupv`): rodar a consulta de `docs/USUARIOS-HUB-POR-SISTEMA.md` §5 do Hub e o bloco `do $$` dela para cada admin, trocando o e-mail em `auth.users`, `auth.identities`, `profiles` e `admin_emails` de uma vez, para `nome@ifatokun.com.br` (o mesmo e-mail da conta dele no Hub). Antes de aplicar a migração `20261009120100`, a consulta de conferência de `HUB-SSO.md` §9.2 tem que voltar vazia.
4. **Segredos da função** (Terminal, uma vez; o segredo vem do cofre/Hub, não digitar em histórico compartilhado):
   ```bash
   supabase secrets set --project-ref xkbruecvfumxqjrjhupv \
     HUB_SSO_ENABLED=true HUB_ISSUER=https://hub.ifatokun.com.br/oidc \
     HUB_CLIENT_ID=hub-11-xxxx HUB_CLIENT_SECRET='...' \
     HUB_SSO_APP_URL=https://academy.ifatokun.com.br HUB_SSO_ALLOWED_ROLES=admin
   ```
5. **Secrets do GitHub** (repo `felipelcchaves-stack/ifatokunacademy` › Settings › Secrets › Actions): conferir os 7 da lista de `deploy/README.md`. **Ainda não** criar os `VITE_HUB_*` (passo 7).
6. **Publicar o código.** Em `Academy` (a `main` local tem 25 arquivos sem commit, que são o retrato já incluído na branch): não mesclar por cima. Caminho seguro: `git push origin fix/hub-sso-funcionando`, abrir o Pull Request no GitHub e mesclar lá (Actions faz `db push` das migrações do SSO + função + site). Depois, na pasta `Academy`: `git stash push -u -m pre-sso && git pull` (o conteúdo do stash é o que a branch já traz).
7. **Ligar no site:** criar os secrets `VITE_HUB_SSO_ENABLED=true` e `VITE_HUB_ISSUER=https://hub.ifatokun.com.br/oidc` e rodar "Deploy Frontend" (botão Run workflow).
8. **Ligar no Hub** (interruptor do Login único) e testar: lançador do Hub › Academy cai em `/admin` já logado. Sair no Hub derruba o admin em até 1 minuto. Rodar `node scripts/hub-sso-doctor.ts`: tudo OK.
9. Recomendado: Authentication › Settings › JWT expiry 600–900 s. O hook "Esqueci a senha" (`HUB-SSO.md` §9.3) fica para depois, com o SSO já testado.

## 6. Rollback

- Rápido, sem rebuild: `supabase secrets set --project-ref xkbruecvfumxqjrjhupv HUB_SSO_ENABLED=false` (o `/admin` volta ao login antigo; como a senha foi trocada por uma aleatória no primeiro login pelo Hub, use "Esqueci a senha"). Se o hook estiver ligado, desligue-o antes.
- Site: secrets `VITE_HUB_SSO_ENABLED` vazio (ou `VITE_HUB_SSO_LOCAL_LOGIN=true`) e rodar "Deploy Frontend"; ou no servidor `ln -sfn /home/academy/releases/<anterior> /home/academy/current` (os 5 últimos releases ficam guardados).
- Hub: desligar o interruptor do Login único do Academy (volta a ser link simples).
- Banco: as migrações só criam tabela/funções e endurecem políticas; não há rollback destrutivo necessário. A trava de histórico impede o pior caso (replay de migrações antigas).
