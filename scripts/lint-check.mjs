import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
const BAD = [
  /\bconsole\.log\b/, /\bdebugger\b/, /\b(TODO|FIXME)\b/,
  /sbp_[A-Za-z0-9]+|eyJhbGci/,
];
const hits = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|js|mjs)$/.test(name) && !name.endsWith(".test.mjs")) {
      readFileSync(p, "utf8").split("\n").forEach((s, i) => {
        if (BAD.some((r) => r.test(s))) hits.push(`${p}:${i + 1}`);
      });
    }
  }
}
walk("src");
if (hits.length) { console.error("LINT_FAIL: " + hits.join(", ")); process.exit(1); }
