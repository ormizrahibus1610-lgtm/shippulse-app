import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { isBadEnv, scanText } from "../scripts/secret-scan.mjs";
import { bearer, makeClient, supaEnv } from "../api/_supabase.mjs";

const urlFor = (p) => new URL(`../${p}`, import.meta.url);
const rd = (p) => readFileSync(urlFor(p), "utf8");

test("initPlan RLS migration protects all 3 tables with per-operation policies", () => {
  const sql = rd("supabase/migrations/20261123090400_shippulse_rls_prod.sql");
  for (const tbl of ["public.features", "public.votes", "public.changelogs"]) {
    assert.match(sql, new RegExp(`alter table ${tbl} enable row level security;`, "i"));
  }
  assert.match(sql, /\(select auth\.uid\(\)\)/);
  assert.match(sql, /\(select auth\.jwt\(\)\).*app_metadata.*role.*'admin'/);
  assert.doesNotMatch(sql, /\bfor all\b/i);
});

test("secret-scan blocks leaked tokens and .env files while allowing .env.example", () => {
  assert.equal(isBadEnv(".env"), true);
  assert.equal(isBadEnv(".env.local"), true);
  assert.equal(isBadEnv(".env.example"), false);
  const patProbe = ["sbp", "0123456789abcdef1234"].join("_");
  const jwtProbe = ["eyJ" + "hbGciOiJIUzI1NiJ9", "c3ViIjoxMjM0NTY3ODkw"].join(".");
  assert.deepEqual(scanText("probe.txt", patProbe), ["probe.txt:pat_token"]);
  assert.deepEqual(scanText("probe.txt", jwtProbe), ["probe.txt:jwt_token"]);
  assert.deepEqual(scanText("clean.txt", "PUBLIC_SUPABASE_URL=https://example.supabase.co"), []);
  const rlsSrc = rd("scripts/rls-smoke.mjs");
  assert.match(rlsSrc, /CROSS_USER_RLS_PASS/);
  assert.match(rlsSrc, /alice@example\.com/);
  assert.match(rlsSrc, /bob@example\.com/);
  assert.doesNotMatch(rlsSrc, /service_role/i);
});

test("Vercel API and GitHub Actions CI enforce zero service_role and release gates", () => {
  const vc = JSON.parse(rd("vercel.json"));
  assert.equal(vc.framework, null);
  assert.equal(vc.outputDirectory, "public");
  assert.equal(vc.functions["api/*.mjs"].maxDuration, 10);
  for (const f of ["api/_supabase.mjs", "api/health.mjs", "api/auth.mjs", "api/features.mjs", "api/vote.mjs"]) {
    assert.doesNotMatch(rd(f), /service_role/i, `${f} must never use service_role`);
  }
  if (existsSync(urlFor(".github/workflows/ci.yml"))) {
    const ci = rd(".github/workflows/ci.yml");
    assert.match(ci, /contents:\s*read/);
    assert.match(ci, /npm ci/);
    assert.match(ci, /npm run verify/);
    assert.match(ci, /node scripts\/secret-scan\.mjs/);
    assert.match(ci, /node scripts\/validate-factory\.mjs/);
  }
});

test("JWT client helper and 16-line PLAYBOOK.md release gate validate cleanly", () => {
  assert.deepEqual(supaEnv({}), { url: "", key: "" });
  assert.throws(() => makeClient("", {}), /Missing PUBLIC_SUPABASE_URL/);
  assert.equal(bearer(new Request("https://example.com", { headers: { authorization: "Bearer tok-1" } })), "tok-1");
  if (existsSync(urlFor("PLAYBOOK.md"))) {
    const lines = rd("PLAYBOOK.md").trimEnd().split("\n");
    assert.equal(lines.length, 16);
    for (let i = 1; i <= 9; i++) {
      assert.ok(lines.some((l) => l.includes(`(S${i})`)), `Missing section S${i}`);
    }
    assert.match(lines.join("\n"), /Production Release Gate/);
  }
});
