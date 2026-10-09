# Deploy — Academy na VPS HostGator

SPA estática (Vite build), sem PM2/processo Node. Backend inteiro no
Supabase Cloud (projeto próprio `xkbruecvfumxqjrjhupv`, mesma organização
de Ìrántí/Sistema Oluwo/Isesemind).

## Bootstrap de acesso (feito uma vez, manualmente, não automatizável)

Usuário Linux `academy` já existe na VPS, sem chave SSH ainda. Logado como
`academy` via senha no terminal da VPS, rodar:

```
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILjeS7+2nUdNGXb4qf1YyCjBOe/FhK8HsJYfgd3RhcQk academy-deploy@vps-143.95.164.62" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod o+x /home/academy
```

O último `chmod o+x /home/academy` evita a Pegadinha #7 do skill de deploy
(home `750` por padrão bloqueia o Nginx de atravessar o diretório, mesmo
com tudo certo dentro de `current/`).

Chave privada correspondente: `~/.ssh/id_ed25519_academy_deploy` neste Mac
(vai para o secret `ACADEMY_DEPLOY_SSH_KEY` no GitHub).

## Estrutura de deploy atômico

```
/home/academy/releases/<timestamp>/   # cada build vai numa pasta nova
/home/academy/current -> releases/<timestamp mais recente>/
```

O Nginx sempre serve `/home/academy/current`. O GitHub Actions sobe o
build pra uma pasta nova e só troca o symlink depois do upload completo —
nunca serve build pela metade.

## Nginx + Certbot (rodar no terminal da VPS, com sudo — nunca via SSH direto daqui)

1. Copiar `nginx-academy.conf` deste diretório pra
   `/etc/nginx/sites-available/academy`, depois:
   ```
   ln -s /etc/nginx/sites-available/academy /etc/nginx/sites-enabled/academy
   nginx -t && systemctl reload nginx
   ```
2. Confirmar DNS: registro A de `academy.ifatokun.com.br` → `143.95.164.62`.
3. Só depois do HTTP simples validado (`curl -I http://academy.ifatokun.com.br`):
   ```
   certbot --nginx -d academy.ifatokun.com.br
   ```

## GitHub Actions — secrets necessários

No repo GitHub (`felipelcchaves-stack/ifatokunacademy`), em
Settings → Secrets and variables → Actions:

- `ACADEMY_DEPLOY_SSH_KEY` — conteúdo de `~/.ssh/id_ed25519_academy_deploy` (privada)
- `VITE_SUPABASE_PROJECT_ID` = `xkbruecvfumxqjrjhupv`
- `VITE_SUPABASE_PUBLISHABLE_KEY` — anon key do projeto novo (ver `.secrets/new_supabase_keys.txt` local)
- `VITE_SUPABASE_URL` = `https://xkbruecvfumxqjrjhupv.supabase.co`
- `SUPABASE_ACCESS_TOKEN` — personal access token do Supabase (supabase.com/dashboard/account/tokens)
- `SUPABASE_PROJECT_REF` = `xkbruecvfumxqjrjhupv`
- `SUPABASE_DB_PASSWORD` — ver `.secrets/new_supabase_db_password.txt` local

## Teste de ponta a ponta

```
curl -I https://academy.ifatokun.com.br
```
Deve retornar 200. Depois, disparar um push de teste na `main` e confirmar
que o Actions troca o symlink `current` sem downtime perceptível.

## Login único pelo Hub (área /admin)

Ver `deploy/HUB-SSO.md`: Edge Function `hub-sso`, migrações `*_hub_sso*.sql`, segredos
`HUB_*` da função e secrets `VITE_HUB_*` do GitHub. Sem esses secrets o app fica como antes.
