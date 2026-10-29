// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import { analyzeMigrationList, FIRST_NEW } from "../../../scripts/check-migration-history.mjs";

const table = (rows: [string, string][]) =>
  ["   Local          | Remote         | Time (UTC)", "  ----------------|----------------|---------------------", ...rows.map(([l, r]) => `   ${l.padEnd(14)} | ${r.padEnd(14)} | 2026-01-01 00:00:00`)].join("\n");

describe("trava do histórico de migrações", () => {
  it("passa quando só as migrações do SSO estão pendentes", () => {
    const out = analyzeMigrationList(table([["20260521235349", "20260521235349"], [FIRST_NEW, ""], ["20261009120000", ""]]));
    expect(out).toMatchObject({ ok: true, pending: [FIRST_NEW, "20261009120000"] });
  });

  it("barra o histórico remoto vazio (o db push rodaria tudo de novo)", () => {
    const out = analyzeMigrationList(table([["20260101192540", ""], ["20260521235349", ""], [FIRST_NEW, ""]]));
    expect(out.ok).toBe(false);
    expect(out.problems[0]).toMatch(/migration repair --status applied/);
  });

  it("barra versão remota que o repositório não tem", () => {
    const out = analyzeMigrationList(table([["", "20260601000000"], ["20260521235349", "20260521235349"]]));
    expect(out.ok).toBe(false);
    expect(out.problems[0]).toMatch(/20260601000000/);
  });

  it("lista vazia ou ilegível não passa", () => {
    expect(analyzeMigrationList("erro de login").ok).toBe(false);
  });

  it("as migrações do SSO deste repositório são todas >= FIRST_NEW", () => {
    const sso = readdirSync("supabase/migrations").filter((f) => /hub_sso|security_/.test(f));
    expect(sso.length).toBeGreaterThan(0);
    for (const f of sso) expect(f.slice(0, 14) >= FIRST_NEW).toBe(true);
  });
});
