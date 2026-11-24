#!/usr/bin/env python3
import json, re, sys
DANGER = re.compile(
    r"\brm\s+-[a-z]*(rf|fr)|\bgit\s+push\b.*(\s-f|--force)\b|\bdrop\s+table\b",
    re.I,
)
ENV_RE = re.compile(r"(^|[\s/'\"=])\.env(\.[a-z0-9_-]+)?($|[\s/'\"&;|])", re.I)
def reply(dec, reason=""):
    out = {"decision": dec, "reason": reason} if reason else {"decision": dec}
    print(json.dumps(out)); sys.exit(0)
tc = (json.load(sys.stdin) or {}).get("toolCall") or {}
tool, args = tc.get("name", ""), tc.get("args") or {}
k = next((x for x in ("CommandLine", "commandLine", "command") if x in args), "")
cmd = str(args.get(k, ""))
if any(ENV_RE.search(str(v)) for v in args.values()):
    reply("deny", "Factory safety hook blocked .env secret access.")
if tool == "run_command" and DANGER.search(cmd):
    reply("deny", "Factory safety hook blocked destructive command.")
reply("allow")
