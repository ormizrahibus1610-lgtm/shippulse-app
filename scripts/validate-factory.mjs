import { existsSync as has, readFileSync as rd } from "node:fs";
import { spawnSync } from "node:child_process";
const R = process.argv[2] ?? ".agents/plugins/software-factory", e = [];
const j = (p) => JSON.parse(rd(p, "utf8"));
if (has(".agents/hooks.json")) e.push("misplaced:.agents/hooks.json");
if (has(`${R}/hooks/hooks.json`)) e.push("nested:hooks/hooks.json");
if (j(`${R}/plugin.json`).name !== "software-factory") e.push("manifest");
if (!has(`${R}/rules/AGENTS.md`)) e.push("missing_rules");
for (const s of ["factory-spec","factory-build","factory-audit","factory-ship"]) {
  const md = rd(`${R}/skills/${s}/SKILL.md`, "utf8");
  if (!md.includes(`name: ${s}`) || !md.includes("description:")) e.push(s);
}
const h = has(`${R}/hooks.json`) ? j(`${R}/hooks.json`) : {};
if (!h["factory-safety"]?.PreToolUse?.[0]?.matcher) e.push("pretool_group");
if (!h["factory-quality"]?.PostToolUse?.[0]?.matcher) e.push("posttool_group");
if (!h["factory-loop"]?.SessionStart?.[0]?.command) e.push("session_flat");
if (!h["factory-loop"]?.Stop?.[0]?.command) e.push("stop_flat");
const m = rd(`${R}/mcp_config.json`, "utf8"), u = JSON.parse(m).mcpServers.supabase;
if (!u?.url?.includes("read_only=true") || /sbp_|eyJ|secret/i.test(m)) e.push("mcp");
if (spawnSync("bash", ["-n", "factory.sh"]).status !== 0) e.push("factory_sh");
if (e.length) { console.error("FACTORY_FAIL:\n  "+e.join("\n  ")); process.exit(1); }
console.log("FACTORY_PLUGIN_OK skills=4 hooks=root mcp=read_only factory=valid");
