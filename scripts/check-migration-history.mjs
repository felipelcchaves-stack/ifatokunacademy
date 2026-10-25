/**
 * Trava de segurança do deploy do Supabase: confere o histórico de migrações do banco remoto ANTES
 * do `supabase db push`. O Academy saiu do Lovable com o banco já pronto; se o histórico remoto
 * estiver vazio, o `db push` tenta rodar as ~60 migrações antigas de novo (CREATE TABLE em tabela
 * que já existe...) e falha no meio, deixando o deploy do SSO pela metade.
 *
 *   supabase migration list --password "$SUPABASE_DB_PASSWORD" > lista.txt
 *   node scripts/check-migration-history.mjs lista.txt
 *
 * Falha (saída 1) quando: (a) uma migração anterior ao SSO existe aqui e não consta como aplicada no
 * remoto; (b) o remoto tem versões que este repositório não tem. Só as migrações do SSO em diante
 * (>= FIRST_NEW) podem estar pendentes. Conserto: ver deploy/HUB-SSO.md §5.0.
 */
import { readFileSync } from "node:fs";

export const FIRST_NEW = "20261008230000";

/** @param {string} text saída de `supabase migration list` */
export function analyzeMigrationList(text, firstNew = FIRST_NEW) {
  const rows = [];
  for (const line of text.split("\n")) {
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length < 2) continue;
    const [local, remote] = cells;
    if (!/^\d{14}$/.test(local) && !/^\d{14}$/.test(remote)) continue;
    rows.push({ local: /^\d{14}$/.test(local) ? local : "", remote: /^\d{14}$/.test(remote) ? remote : "" });
  }
  const problems = [];
  const replay = rows.filter((r) => r.local && !r.remote && r.local < firstNew).map((r) => r.local);
  const unknown = rows.filter((r) => r.remote && !r.local).map((r) => r.remote);
  if (replay.length) {
    problems.push(
      `${replay.length} migração(ões) antigas não constam como aplicadas no banco remoto (o db push as rodaria de novo): ${replay.slice(0, 3).join(", ")}${replay.length > 3 ? ", ..." : ""}. ` +
        `Se o schema já está lá, marque como aplicadas: supabase migration repair --status applied ${replay.slice(0, 2).join(" ")} ... (todas).`,
    );
  }
  if (unknown.length) {
    problems.push(`o banco remoto tem versões que não existem neste repositório: ${unknown.join(", ")}. Traga-as com supabase db pull ou marque como revertidas (migration repair --status reverted).`);
  }
  return { ok: problems.length === 0 && rows.length > 0, rows: rows.length, pending: rows.filter((r) => r.local && !r.remote).map((r) => r.local), problems: rows.length ? problems : ["lista de migrações vazia ou ilegível"] };
}

if (process.argv[1] && process.argv[1].endsWith("check-migration-history.mjs")) {
  const file = process.argv[2];
  const result = analyzeMigrationList(readFileSync(file, "utf8"));
  console.log(`migrações lidas: ${result.rows}; pendentes: ${result.pending.length ? result.pending.join(", ") : "nenhuma"}`);
  for (const p of result.problems) if (!result.ok) console.error(`ERRO: ${p}`);
  process.exit(result.ok ? 0 : 1);
}
