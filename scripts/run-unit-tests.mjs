import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const files = [];
function collect(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) collect(p);
    else if (name.endsWith(".test.mjs")) files.push(p);
  }
}
collect("src");
collect("tests");
const res = spawnSync("node", ["--test", ...files.sort()], { stdio: "inherit" });
process.exit(res.status ?? 1);
