/**
 * Diagnóstico do login único (Hub) do Academy, de fora, SEM segredo e sem tocar em nada:
 * só faz GETs/POSTs que qualquer navegador faria.
 *
 *   node scripts/hub-sso-doctor.ts                       (produção, endereços padrão)
 *   HUB_ISSUER=… APP_URL=… SUPABASE_URL=… node scripts/hub-sso-doctor.ts
 *
 * Confere: (1) o Hub publica o OIDC esperado; (2) a Edge Function hub-sso existe, está ligada e
 * libera o CORS da SPA; (3) o Hub aceita o client_id + redirect_uri que a função usa (o pedido de
 * autorização do Hub não dá erro 400); (4) o site publicado traz o código do login pelo Hub.
 * Cada item diz o que fazer quando falha. Saída 1 se algo falhar.
 */

export type Check = { name: string; ok: boolean; detail: string };
type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

const B64 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";
const rand = (n: number) => Array.from({ length: n }, () => B64[Math.floor(Math.random() * B64.length)]).join("");

export async function diagnose(opts: {
  fetch: FetchFn;
  issuer: string;
  appUrl: string;
  functionUrl: string;
  /** Verifica também se o site publicado já traz o código do SSO. */
  checkSite?: boolean;
}): Promise<Check[]> {
  const out: Check[] = [];
  const add = (name: string, ok: boolean, detail: string) => out.push({ name, ok, detail });
  const f = opts.fetch;
  const origin = new URL(opts.appUrl).origin;

  // 1. Hub
  let meta: Record<string, unknown> | null = null;
  try {
    const res = await f(`${opts.issuer}/.well-known/openid-configuration`);
    meta = res.ok ? ((await res.json()) as Record<string, unknown>) : null;
    add("Hub: descoberta OIDC", !!meta, meta ? opts.issuer : `HTTP ${res.status} em ${opts.issuer}/.well-known/openid-configuration`);
  } catch (e) {
    add("Hub: descoberta OIDC", false, `sem resposta (${String(e)})`);
  }
  if (meta) {
    add("Hub: issuer igual ao configurado", meta.issuer === opts.issuer, `Hub diz ${String(meta.issuer)}; HUB_ISSUER/VITE_HUB_ISSUER = ${opts.issuer}`);
    const claims = (meta.claims_supported as string[] | undefined) ?? [];
    add("Hub: envia sid, email e e-mail verificado", ["sid", "email", "email_verified"].every((c) => claims.includes(c)), claims.join(", "));
    add("Hub: PKCE S256 e back-channel logout", (meta.code_challenge_methods_supported as string[] | undefined)?.includes("S256") === true && meta.backchannel_logout_supported === true, "");
  }

  // 2. Função hub-sso
  let authorizationUrl = "";
  try {
    const res = await f(`${opts.functionUrl}/status`, { headers: { origin } });
    const body = res.ok ? ((await res.json()) as { enabled?: boolean; roles?: string[] }) : null;
    if (!body) {
      add("Função hub-sso: existe", false, `HTTP ${res.status}. Falta publicar a função (supabase functions deploy hub-sso) ou o endereço está errado: ${opts.functionUrl}`);
    } else {
      add("Função hub-sso: existe", true, "responde em /status");
      add("Função hub-sso: ligada e configurada", body.enabled === true, body.enabled ? `papéis: ${(body.roles ?? []).join(", ")}` : "HUB_SSO_ENABLED não é true, ou falta HUB_CLIENT_ID/HUB_CLIENT_SECRET/HUB_SSO_APP_URL nos segredos da função");
      add("Função hub-sso: CORS da SPA", res.headers.get("access-control-allow-origin") === origin, `access-control-allow-origin = ${res.headers.get("access-control-allow-origin") ?? "(vazio)"}; HUB_SSO_APP_URL precisa ser exatamente ${origin}`);
      if (body.enabled) {
        const start = await f(`${opts.functionUrl}/start`, {
          method: "POST",
          headers: { origin, "content-type": "application/json" },
          body: JSON.stringify({ code_challenge: rand(43), state: rand(32), nonce: rand(32) }),
        });
        const sb = (await start.json().catch(() => ({}))) as { authorization_url?: string; message?: string };
        authorizationUrl = sb.authorization_url ?? "";
        add("Função hub-sso: /start monta o pedido ao Hub", start.ok && !!authorizationUrl, start.ok ? "ok" : `HTTP ${start.status}: ${sb.message ?? ""}`);
      }
    }
  } catch (e) {
    add("Função hub-sso: existe", false, `sem resposta (${String(e)})`);
  }

  // 3. O Hub aceita esse client_id + redirect_uri?
  if (authorizationUrl) {
    try {
      const res = await f(authorizationUrl, { redirect: "manual" });
      const loc = res.headers.get("location") ?? "";
      const redirected = res.status >= 300 && res.status < 400;
      const u = new URL(authorizationUrl);
      add(
        "Hub: aceita o client_id e a URL de retorno",
        redirected && !loc.includes("error="),
        redirected
          ? "o Hub seguiu o pedido (login ou volta direta)"
          : `HTTP ${res.status}: o Hub recusou o pedido. Confira no Hub (sistema Academy › Login único): ligado, client_id = ${u.searchParams.get("client_id")}, URL de retorno = ${u.searchParams.get("redirect_uri")}`,
      );
    } catch (e) {
      add("Hub: aceita o client_id e a URL de retorno", false, `sem resposta (${String(e)})`);
    }
  }

  // 4. Site publicado
  if (opts.checkSite) {
    try {
      const html = await (await f(`${origin}/`)).text();
      const script = /src="(\/assets\/[^"]+\.js)"/.exec(html)?.[1];
      const js = script ? await (await f(`${origin}${script}`)).text() : "";
      add("Site: traz o código do login pelo Hub", js.includes("hub_sso_pending"), js.includes("hub_sso_pending") ? script! : "o site publicado é uma versão SEM o login pelo Hub (falta publicar a branch e VITE_HUB_SSO_ENABLED=true no build)");
      if (js.includes("hub_sso_pending")) {
        add("Site: login pelo Hub ligado no build", /VITE_HUB_SSO_ENABLED|hub-sso/.test(js) && js.includes(opts.issuer), "VITE_HUB_ISSUER do build precisa ser " + opts.issuer);
      }
    } catch (e) {
      add("Site: traz o código do login pelo Hub", false, `sem resposta (${String(e)})`);
    }
  }
  return out;
}

async function main() {
  const issuer = (process.env.HUB_ISSUER ?? "https://hub.ifatokun.com.br/oidc").replace(/\/+$/, "");
  const appUrl = process.env.APP_URL ?? "https://academy.ifatokun.com.br";
  const supabaseUrl = (process.env.SUPABASE_URL ?? "https://xkbruecvfumxqjrjhupv.supabase.co").replace(/\/+$/, "");
  const checks = await diagnose({ fetch: (i, init) => fetch(i, init), issuer, appUrl, functionUrl: `${supabaseUrl}/functions/v1/hub-sso`, checkSite: true });
  for (const c of checks) console.log(`${c.ok ? "OK    " : "FALHOU"}  ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  process.exit(checks.every((c) => c.ok) ? 0 : 1);
}

if (process.argv[1]?.endsWith("hub-sso-doctor.ts")) void main();
