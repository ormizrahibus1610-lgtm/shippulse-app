#!/usr/bin/env python3
import json, os, re, sys
from pathlib import Path
LOG = Path("/tmp/factory-quality.jsonl")
KEYS = ("Path", "TargetFile", "AbsolutePath", "file_path", "path")
DBG = re.compile(r"\b(console\.log|debugger)\b")
p = json.load(sys.stdin) or {}
args, cwd = (p.get("toolCall") or {}).get("args") or {}, p.get("cwd") or "."
rel = next((args[k] for k in KEYS if isinstance(args.get(k), str)), "")
target = Path(os.path.normpath(os.path.join(cwd, rel))) if rel else None
if target and target.suffix in {".js", ".ts", ".jsx", ".tsx"} and target.exists():
    raw = target.read_text("utf-8")
    hits = [i for i, s in enumerate(raw.splitlines(), 1) if DBG.search(s)]
    if hits and "/src/" in target.as_posix():
        with LOG.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps({"file": target.name, "lines": hits}) + "\n")
print("{}")
