#!/usr/bin/env python3
import json, subprocess as sp, sys
from pathlib import Path
STATE, CAP = Path("/tmp/factory-stop-retries.json"), 2
p = json.load(sys.stdin) or {}; why = p.get("terminationReason") or ""
cid, cwd = p.get("conversationId") or "default", p.get("cwd") or "."
cont = bool(p.get("continuationActive") or p.get("executionNum"))
counts = json.loads(STATE.read_text().strip() or "{}") if STATE.exists() else {}
def done(retry, dec, msg=""):
    counts[cid] = retry; STATE.write_text(json.dumps(counts))
    out = {"decision": dec, "reason": msg} if msg else {"decision": dec}
    print(json.dumps(out)); sys.exit(0)
retries = int(counts.get(cid, 0)) if cont else 0
if (why and why != "NO_TOOL_CALL") or (cont and retries >= CAP): done(0, "allow")
pkg, val = Path(cwd) / "package.json", Path(cwd) / "scripts/validate-factory.mjs"
sc = json.loads(pkg.read_text()).get("scripts", {}) if pkg.exists() else {}
cmd = ["npm", "run", "-s", "verify"] if "verify" in sc else []
if not cmd and val.exists(): cmd = ["node", str(val)]
r = sp.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=12) if cmd else None
if not r or r.returncode == 0: done(0, "allow")
err = ((r.stderr or r.stdout).strip().splitlines() or ["verify failed"])[-1]
done(retries + 1, "continue", f"Stop ({retries+1}/{CAP}): {err}")
