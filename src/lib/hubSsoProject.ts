/**
 * Academy specifics of the hub login (the rest is shared: src/lib/hubSso.ts,
 * src/components/hub-sso/*, supabase/functions/_shared/hub-sso/*). Docs: deploy/HUB-SSO.md.
 */
import { supabase } from "@/integrations/supabase/client";
import { readHubSsoConfig, type MintedSession } from "./hubSso";

export const hubSso = readHubSsoConfig(import.meta.env, { prefix: "/admin", home: "/admin" });

/** Where the old e-mail + password login lives (only offered when VITE_HUB_SSO_LOCAL_LOGIN=true). */
export const LOCAL_LOGIN_PATH = "/login";

export { supabase };

/** Runs just before the hub session is stored in the Supabase client. */
export async function beforeHubSession(): Promise<void> {}

/** Runs right after the hub session is stored. */
export async function afterHubSession(_session: MintedSession): Promise<void> {}
