import { execFileSync as run } from "node:child_process";
import { readFileSync as read, statSync as stat } from "node:fs";
export const RULES = [
  ["service_role", /service_role[\s"'`:=]{1,6}[A-Za-z0-9._-]{8,}/i],
  ["pat_token", /\b(?:sbp|ghp)_[A-Za-z0-9]{16,}\b/],
  ["jwt_token", /\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}/],
  ["postgres_uri", /postgres(?:ql)?:\/\/[^/\s]+:[^@\s]+@/i],
];
export const isBadEnv = (f) => /(^|\/)\.env(\.(?!example$).*|$)/.test(f);
export const scanText = (f, s) =>
  RULES.filter(([, r]) => r.test(s)).map(([k]) => `${f}:${k}`);
export const scanRepo = (cwd = process.cwd()) =>
  run("git", ["ls-files", "-co", "--exclude-standard"], { cwd, encoding: "utf8" })
    .split("\n").filter(Boolean).flatMap((f) => isBadEnv(f) ? [`${f}:env`] :
      stat(`${cwd}/${f}`, { throwIfNoEntry: false })?.isFile()
        ? scanText(f, read(`${cwd}/${f}`, "utf8")) : []);
if (process.argv[1]?.endsWith("secret-scan.mjs")) {
  const h = scanRepo(); process.exitCode = h.length ? 1 : 0;
  console.log(h.length ? `SECRET_SCAN_FAIL: ${h.join(", ")}` : "SECRET_SCAN_OK");
}
