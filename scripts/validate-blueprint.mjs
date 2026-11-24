import { readFileSync } from "node:fs";
const p = process.argv[2] ?? "contracts/factory-contract.json";
const c = JSON.parse(readFileSync(p, "utf8")), db = c.supabaseProject;
const req = "/factory-spec,factory.sh,ralph-loops,/factory-audit,/factory-ship";
const errs = [], lanes = Object.entries(c.lanes ?? {});
if ((c.stages ?? []).join(",") !== req) errs.push("stages_order");
if (c.hooksPath !== "hooks.json") errs.push(`hooks_not_root:${c.hooksPath}`);
if (db !== "shippulse-dev") errs.push(`reuse_shippulse_dev:${db}`);
if (lanes.length !== 3) errs.push(`lanes_count:${lanes.length}`);
for (const [k, v] of lanes) if (!v.backlog?.startsWith(".ralph/")) errs.push(k);
for (let i = 0; i < lanes.length; i++) for (let j = i + 1; j < lanes.length; j++)
  for (const a of lanes[i][1].owns) for (const b of lanes[j][1].owns)
    if (a.startsWith(b) || b.startsWith(a))
      errs.push(`overlap:${lanes[i][0]}<->${lanes[j][0]}(${a}|${b})`);
const [vg, rg] = [c.verifyGates?.length ?? 0, c.releaseGates?.length ?? 0];
if (vg < 5 || rg < 5) errs.push("missing_gates");
if (errs.length) {
  console.error("BLUEPRINT_FAIL:\n  " + errs.join("\n  ")); process.exit(1);
}
console.log(`BLUEPRINT_OK stages=5 lanes=3 overlaps=0 gates=${vg}+${rg} db=${db}`);
