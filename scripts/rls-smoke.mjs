import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

export function evaluateRlsProof(m) {
  const ok = m.anonRead >= 1 && m.anonWrite === 0 && m.aliceOwn === 1
    && m.aliceVote === 1 && m.bobMutate === 0 && m.aliceAdmin === 0;
  return { ok, verdict: ok ? "CROSS_USER_RLS_PASS" : "CROSS_USER_RLS_FAIL" };
}

async function authClient(url, key, email, password) {
  const cli = createClient(url, key, { auth: { persistSession: false } });
  const up = await cli.auth.signUp({ email, password });
  if (!up.error && up.data.session) return { cli, uid: up.data.user.id };
  const si = await cli.auth.signInWithPassword({ email, password });
  if (si.error || !si.data.session) throw si.error || new Error("Auth fail");
  return { cli, uid: si.data.user.id };
}

export async function runRlsSmoke(env = process.env) {
  const url = env.PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pass = env.RLS_TEST_PASSWORD || env.DEMO_TEST_PASSWORD;
  if (!url || !key || !pass) throw new Error("Missing Supabase env/password");
  const anon = createClient(url, key, { auth: { persistSession: false } });
  const alice = await authClient(url, key, "alice@example.com", pass);
  const bob = await authClient(url, key, "bob@example.com", pass);
  const ins = await alice.cli.from("features")
    .insert({ title: "RLS Smoke", status: "planned", author_id: alice.uid })
    .select("id").single();
  if (ins.error) throw ins.error;
  const fid = ins.data.id;
  const aRead = await anon.from("features").select("id").eq("id", fid);
  const aWr = await anon.from("features")
    .insert({ title: "Spoof", status: "planned", author_id: alice.uid })
    .select("id");
  const aVote = await alice.cli.from("votes")
    .insert({ feature_id: fid, user_id: alice.uid }).select("feature_id");
  const bUpd = await bob.cli.from("features")
    .update({ title: "Hacked" }).eq("id", fid).select("id");
  const bDel = await bob.cli.from("features")
    .delete().eq("id", fid).select("id");
  const bVdel = await bob.cli.from("votes")
    .delete().eq("feature_id", fid).select("feature_id");
  const aAdm = await alice.cli.from("changelogs")
    .insert({ title: "Unauth", body: "Blocked", feature_id: fid }).select("id");
  const m = {
    anonRead: (aRead.data || []).length, anonWrite: (aWr.data || []).length,
    aliceOwn: 1, aliceVote: (aVote.data || []).length,
    bobMutate: (bUpd.data || []).length + (bDel.data || []).length
      + (bVdel.data || []).length,
    aliceAdmin: (aAdm.data || []).length,
  };
  await alice.cli.from("features").delete().eq("id", fid);
  return { ...m, ...evaluateRlsProof(m) };
}

if (process.argv[1]?.endsWith("rls-smoke.mjs")) {
  const r = await runRlsSmoke(process.env);
  const row = `rls_proof: anon_read=${r.anonRead} anon_write=${r.anonWrite} `
    + `alice_own=${r.aliceOwn} alice_vote=${r.aliceVote} `
    + `bob_mutate=${r.bobMutate} alice_admin=${r.aliceAdmin}`;
  const txt = `${row}\nverdict  : ${r.verdict}\n`;
  fs.writeFileSync("/tmp/rls-smoke-summary.txt", txt);
  console.log("rls_pair : alice@example.com vs bob@example.com (anon key)");
  console.log(row);
  console.log(`verdict  : ${r.verdict}`);
  process.exit(r.ok ? 0 : 1);
}
