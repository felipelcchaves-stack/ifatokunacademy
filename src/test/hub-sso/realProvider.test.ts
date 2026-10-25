// @vitest-environment node
/**
 * Fluxo completo contra o MESMO provedor OIDC do Hub (a biblioteca oidc-provider, configurada como em
 * hub/lib/sso/provider.ts: PKCE obrigatório, cliente confidencial, back-channel logout, claims no ID
 * token), sem fake de token: o navegador (SPA, src/lib/hubSso.ts) chama a Edge Function de verdade
 * (handler), segue os redirecionamentos do Hub com um jar de cookies, volta no callback, troca o
 * código e, no fim, o Hub derruba a sessão por back-channel. O Supabase é uma memória.
 *
 * Se este teste falha, o problema está em como o Academy fala com o Hub (e não em configuração).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import Provider, { type Configuration } from "oidc-provider";
import { discoveryCache, loadConfig, type HubSsoStore } from "../../../supabase/functions/_shared/hub-sso/core.ts";
import { createHubSsoHandler } from "../../../supabase/functions/_shared/hub-sso/handler.ts";
import { createJwtVerifier } from "../../../supabase/functions/_shared/hub-sso/verifier.ts";
import { diagnose } from "../../../scripts/hub-sso-doctor.ts";
import { beginHubLogin, finishHubLogin, readHubSsoConfig, validateInitiation } from "../../lib/hubSso";

const APP_URL = "https://academy.ifatokun.com.br";
const CLIENT_ID = "hub-11-realtest";
const CLIENT_SECRET = "segredo-de-teste-com-simbolos-&+=";
const FN = "https://xkbruecvfumxqjrjhupv.supabase.co/functions/v1/hub-sso";
const HUB_USER = { id: "7", email: "joana@ifatokun.com.br", name: "Joana Silva", role: "admin" };
const ADMIN_UUID = "0d000000-0000-4000-8000-000000000001";

let issuer = "";
let origin = "";
let hubServer: Server;
let bcServer: Server;
let provider: Provider;
let handlerRef: (req: Request) => Promise<Response>;

const sessions = { recorded: [] as { authSessionId: string; hubSid: string; hubSub: string }[], revoked: [] as { sid: string | null; sub: string | null }[] };
let nextSession = 1;
let hubLoginAs: typeof HUB_USER | null = HUB_USER;

function accessToken(sub: string, sessionId: string) {
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${enc({ alg: "HS256" })}.${enc({ sub, session_id: sessionId, role: "authenticated" })}.sig`;
}

function memoryStore(): HubSsoStore {
  return {
    async findUser(email, roles) {
      if (email !== HUB_USER.email) return { status: "no_user" };
      return roles.includes("admin") ? { status: "ok", userId: ADMIN_UUID } : { status: "no_role" };
    },
    async mintSession(_email, userId) {
      const id = `aaaaaaaa-0000-4000-8000-${String(nextSession++).padStart(12, "0")}`;
      return { access_token: accessToken(userId, id), refresh_token: `r-${id}`, expires_in: 3600, token_type: "bearer" };
    },
    async recordSession(row) {
      sessions.recorded.push(row);
    },
    async lockPassword() {},
    async endLocalSessions() {
      return 0;
    },
    async revoke(target) {
      sessions.revoked.push(target);
      return 1;
    },
  };
}

async function toWebRequest(req: IncomingMessage, base: string): Promise<Request> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const body = Buffer.concat(chunks);
  return new Request(new URL(req.url ?? "/", base), {
    method: req.method,
    headers: req.headers as Record<string, string>,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : body,
  });
}

beforeAll(async () => {
  // 1. O Hub: oidc-provider sob /oidc, login automático (como o Hub faz com a sessão dele válida).
  let provReady: (p: Provider) => void;
  const provPromise = new Promise<Provider>((r) => (provReady = r));
  hubServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    void provPromise.then(async (prov) => {
      const url = new URL(req.url ?? "/", origin);
      const m = /^\/oidc\/interaction\/([A-Za-z0-9_-]+)$/.exec(url.pathname);
      if (m && req.method === "GET") {
        if (!hubLoginAs) {
          res.statusCode = 303;
          res.setHeader("location", `${origin}/login`);
          return res.end();
        }
        await prov.interactionDetails(req, res);
        return prov.interactionFinished(req, res, { login: { accountId: hubLoginAs.id, amr: ["pwd", "otp"], remember: true } }, { mergeWithLastSubmission: false });
      }
      (req as IncomingMessage & { originalUrl?: string }).originalUrl = req.url;
      req.url = (req.url ?? "/").slice("/oidc".length) || "/";
      return prov.callback()(req, res);
    });
  });
  await new Promise<void>((r) => hubServer.listen(0, "127.0.0.1", r));
  origin = `http://127.0.0.1:${(hubServer.address() as AddressInfo).port}`;
  issuer = `${origin}/oidc`;

  // 2. Rota de back-channel do Academy (a URL cadastrada no Hub), ligada ao handler real.
  bcServer = createServer(async (req, res) => {
    const out = await handlerRef(await toWebRequest(req, FN + "/"));
    res.statusCode = out.status;
    res.end(await out.text());
  });
  await new Promise<void>((r) => bcServer.listen(0, "127.0.0.1", r));
  const bcUrl = `http://127.0.0.1:${(bcServer.address() as AddressInfo).port}/functions/v1/hub-sso/backchannel-logout`;

  const configuration: Configuration = {
    clients: [
      {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        client_name: "Academy",
        redirect_uris: [`${APP_URL}/auth/hub/callback`],
        post_logout_redirect_uris: [`${APP_URL}/`],
        initiate_login_uri: `${APP_URL}/auth/hub/iniciar`,
        backchannel_logout_uri: bcUrl,
        backchannel_logout_session_required: true,
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "client_secret_basic",
        application_type: "web",
      },
    ],
    findAccount: async (_ctx, sub) => ({
      accountId: sub,
      claims: async () => ({ sub, email: HUB_USER.email, email_verified: true, name: HUB_USER.name, hub_role: HUB_USER.role }),
    }),
    claims: { openid: ["sub"], email: ["email", "email_verified"], profile: ["name", "hub_role"] },
    scopes: ["openid", "email", "profile", "offline_access"],
    conformIdTokenClaims: false,
    pkce: { required: () => true },
    responseTypes: ["code"],
    clientDefaults: { grant_types: ["authorization_code", "refresh_token"], response_types: ["code"], token_endpoint_auth_method: "client_secret_basic", id_token_signed_response_alg: "RS256" },
    clientAuthMethods: ["client_secret_basic", "client_secret_post"],
    features: {
      devInteractions: { enabled: false },
      backchannelLogout: { enabled: true },
      revocation: { enabled: true },
      userinfo: { enabled: true },
      rpInitiatedLogout: {
        enabled: true,
        logoutSource: async (ctx) => {
          ctx.type = "html";
          ctx.body = "<form>logout</form>";
        },
      },
    },
    loadExistingGrant: async (ctx) => {
      const { oidc } = ctx;
      const session = oidc.session;
      if (!oidc.client || !session?.accountId) return undefined;
      const grantId = oidc.result?.consent?.grantId || session.grantIdFor(oidc.client.clientId);
      let grant = grantId ? await oidc.provider.Grant.find(grantId) : undefined;
      if (grant && grant.accountId !== session.accountId) grant = undefined;
      grant ??= new oidc.provider.Grant({ clientId: oidc.client.clientId, accountId: session.accountId });
      const scopes = [...(oidc.requestParamOIDCScopes ?? [])].join(" ");
      if (scopes) grant.addOIDCScope(scopes);
      await grant.save();
      return grant;
    },
    interactions: { url: async (_ctx, interaction) => `/oidc/interaction/${interaction.uid}` },
    cookies: { keys: ["chave-de-teste"], long: { httpOnly: true, sameSite: "lax", secure: false, signed: true }, short: { httpOnly: true, sameSite: "lax", secure: false, signed: true } },
    issueRefreshToken: async () => false,
    // Como no Hub em desenvolvimento: o oidc-provider barra IPs locais (SSRF); aqui o back-channel é local.
    fetch: (url, options) => {
      delete (options as { dispatcher?: unknown }).dispatcher;
      return globalThis.fetch(url, options);
    },
    ttl: { Interaction: 600, Grant: 3600, Session: 3600, AccessToken: 600, IdToken: 600, AuthorizationCode: 60 },
    jwks: undefined,
  };
  provider = new Provider(issuer, configuration);
  provReady!(provider);

  // 3. A Edge Function do Academy contra esse Hub.
  const env: Record<string, string> = {
    HUB_SSO_ENABLED: "true",
    HUB_ISSUER: issuer,
    HUB_CLIENT_ID: CLIENT_ID,
    HUB_CLIENT_SECRET: CLIENT_SECRET,
    HUB_SSO_APP_URL: APP_URL,
    HUB_SSO_ALLOWED_ROLES: "admin",
  };
  const config = loadConfig((k) => env[k]);
  const discovery = discoveryCache(fetch, config.issuer);
  handlerRef = createHubSsoHandler({ config, fetch, discovery, verify: createJwtVerifier(config.issuer, discovery), store: memoryStore() });
});

afterAll(async () => {
  await Promise.all([hubServer, bcServer].map((s) => new Promise((r) => s.close(r))));
});

const cfg = readHubSsoConfig(
  { VITE_HUB_SSO_ENABLED: "true", VITE_HUB_ISSUER: "", VITE_SUPABASE_URL: "https://xkbruecvfumxqjrjhupv.supabase.co" },
  { prefix: "/admin", home: "/admin" },
);

/** O navegador chamando a Edge Function (com Origin da SPA). */
const spaFetch = (input: string, init: RequestInit = {}) =>
  handlerRef(new Request(input, { ...init, headers: { ...(init.headers as Record<string, string>), origin: APP_URL } }));

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}

/** Segue os redirecionamentos do Hub com cookies até sair para o callback do Academy. */
async function followToCallback(startUrl: string): Promise<{ location: string; hops: string[] }> {
  const jar = new Map<string, string>();
  const hops: string[] = [];
  let url = startUrl;
  for (let i = 0; i < 12; i++) {
    const res = await fetch(url, { redirect: "manual", headers: { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") } });
    for (const sc of res.headers.getSetCookie()) {
      const [pair] = sc.split(";");
      const eq = pair.indexOf("=");
      const name = pair.slice(0, eq);
      const value = pair.slice(eq + 1);
      if (value === "" || /expires=Thu, 01 Jan 1970/i.test(sc)) jar.delete(name);
      else jar.set(name, value);
    }
    const loc = res.headers.get("location");
    hops.push(`${res.status} ${loc ?? ""}`);
    if (!loc) throw new Error(`Hub parou em ${res.status} sem redirecionar: ${await res.text()}`);
    const next = new URL(loc, url).href;
    if (next.startsWith(APP_URL)) return { location: next, hops };
    url = next;
  }
  throw new Error("redirecionamentos demais");
}

describe("Academy x provedor OIDC real do Hub", () => {
  it("entrada pelo lançador valida iss e target_link_uri", () => {
    const c = { ...cfg, issuer };
    const ok = validateInitiation(new URLSearchParams({ iss: issuer, target_link_uri: `${APP_URL}/admin/users` }), APP_URL, c);
    expect(ok).toEqual({ ok: true, next: "/admin/users" });
  });

  it("login completo: /start -> Hub -> callback -> /exchange -> sessão, e logout por back-channel", async () => {
    const c = { ...cfg, issuer, functionUrl: FN };
    const storage = memoryStorage();
    const authUrl = await beginHubLogin(c, "/admin/users", { fetch: spaFetch, storage, origin: APP_URL });
    const auth = new URL(authUrl);
    expect(auth.searchParams.get("client_id")).toBe(CLIENT_ID);
    expect(auth.searchParams.get("redirect_uri")).toBe(`${APP_URL}/auth/hub/callback`);

    const { location, hops } = await followToCallback(authUrl);
    const cb = new URL(location);
    expect(cb.origin + cb.pathname).toBe(`${APP_URL}/auth/hub/callback`);
    expect(cb.searchParams.get("code"), hops.join("\n")).toBeTruthy();
    // O Hub informa o emissor na resposta (RFC 9207); o cliente confere.
    expect(cb.searchParams.get("iss")).toBe(issuer);

    const result = await finishHubLogin(c, cb.search, { fetch: spaFetch, storage });
    expect(result.next).toBe("/admin/users");
    expect(result.userId).toBe(ADMIN_UUID);
    expect(result.session.access_token).toBeTruthy();
    expect(new URL(result.endSessionUrl!).searchParams.get("post_logout_redirect_uri")).toBe(`${APP_URL}/`);

    // O ID token real do Hub trouxe o sid: a sessão ficou vinculada para o logout.
    expect(sessions.recorded).toHaveLength(1);
    const { hubSid, hubSub } = sessions.recorded[0];
    expect(hubSid).toBeTruthy();
    expect(hubSub).toBe(HUB_USER.id);

    // "Sair" no Academy: a página de saída do Hub abre com client_id + post_logout_redirect_uri.
    const end = await fetch(result.endSessionUrl!, { redirect: "manual" });
    expect(end.status).toBe(200);

    // O Hub derruba a sessão: o provedor real manda o logout_token para a URL cadastrada.
    const client = await provider.Client.find(CLIENT_ID);
    await (client as unknown as { backchannelLogout(sub: string, sid: string): Promise<void> }).backchannelLogout(HUB_USER.id, hubSid);
    expect(sessions.revoked).toEqual([{ sid: hubSid, sub: HUB_USER.id }]);
  });

  it("o mesmo código não vale duas vezes", async () => {
    const c = { ...cfg, issuer, functionUrl: FN };
    const storage = memoryStorage();
    const authUrl = await beginHubLogin(c, "/admin", { fetch: spaFetch, storage, origin: APP_URL });
    const { location } = await followToCallback(authUrl);
    const search = new URL(location).search;
    const saved = storage.getItem("hub_sso_pending")!;
    await finishHubLogin(c, search, { fetch: spaFetch, storage });
    storage.setItem("hub_sso_pending", saved);
    await expect(finishHubLogin(c, search, { fetch: spaFetch, storage })).rejects.toThrow(/já foi usado|expirou/);
  });

  it("sem sessão no Hub o navegador vai para o login do Hub, e nada volta ao Academy", async () => {
    hubLoginAs = null;
    try {
      const c = { ...cfg, issuer, functionUrl: FN };
      const authUrl = await beginHubLogin(c, "/admin", { fetch: spaFetch, storage: memoryStorage(), origin: APP_URL });
      await expect(followToCallback(authUrl)).rejects.toThrow(/sem redirecionar|\/login/);
    } finally {
      hubLoginAs = HUB_USER;
    }
  });

  it("o diagnóstico (scripts/hub-sso-doctor.ts) passa contra um Hub e uma função configurados", async () => {
    const routed = (input: string, init?: RequestInit) =>
      input.startsWith(FN) ? handlerRef(new Request(input, init)) : fetch(input, init);
    const checks = await diagnose({ fetch: routed, issuer, appUrl: APP_URL, functionUrl: FN });
    expect(checks.filter((c) => !c.ok)).toEqual([]);
    expect(checks.map((c) => c.name)).toContain("Hub: aceita o client_id e a URL de retorno");
  });

  it("o diagnóstico acusa a função ausente e o Hub que não conhece o endereço de retorno", async () => {
    const noFunction = (input: string, init?: RequestInit) =>
      input.startsWith(FN) ? Promise.resolve(new Response("not found", { status: 404 })) : fetch(input, init);
    const missing = await diagnose({ fetch: noFunction, issuer, appUrl: APP_URL, functionUrl: FN });
    expect(missing.find((c) => c.name === "Função hub-sso: existe")).toMatchObject({ ok: false });

    // Função apontando para outro redirect_uri (o Hub tem só /auth/hub/callback cadastrado).
    const env = { HUB_SSO_ENABLED: "true", HUB_ISSUER: issuer, HUB_CLIENT_ID: CLIENT_ID, HUB_CLIENT_SECRET: CLIENT_SECRET, HUB_SSO_APP_URL: APP_URL, HUB_SSO_CALLBACK_PATH: "/auth/callback" };
    const config = loadConfig((k) => (env as Record<string, string>)[k]);
    const discovery = discoveryCache(fetch, config.issuer);
    const wrong = createHubSsoHandler({ config, fetch, discovery, verify: createJwtVerifier(config.issuer, discovery), store: memoryStore() });
    const routed = (input: string, init?: RequestInit) => (input.startsWith(FN) ? wrong(new Request(input, init)) : fetch(input, init));
    const checks = await diagnose({ fetch: routed, issuer, appUrl: APP_URL, functionUrl: FN });
    expect(checks.find((c) => c.name === "Hub: aceita o client_id e a URL de retorno")).toMatchObject({ ok: false });
  });
});
