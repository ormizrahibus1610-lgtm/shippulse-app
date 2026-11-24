#!/usr/bin/env python3
import json, subprocess as sp, sys
from pathlib import Path
def git(cwd, *args):
    r = sp.run(["git", *args], cwd=cwd, capture_output=True, text=True, timeout=3)
    return r.stdout.strip() if r.returncode == 0 else ""
cwd = (json.load(sys.stdin) or {}).get("cwd") or "."
branch = git(cwd, "branch", "--show-current") or "detached"
dirty = len(git(cwd, "status", "--short").splitlines())
contract = (Path(cwd) / "contracts/factory-contract.json").exists()
msg = (
    f"Software Factory context: branch={branch}, dirty={dirty}, "
    f"contract={'present' if contract else 'missing'}"
)
print(json.dumps({"injectSteps": [{"systemMessage": {"systemMessage": msg}}]}))
