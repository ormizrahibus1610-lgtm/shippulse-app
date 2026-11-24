#!/usr/bin/env bash
set -euo pipefail
BASE="${1:-$(cd "$(dirname "$0")/../.." && pwd)}"; T0=$(date +%s)
HR="--------------------------------------------"
while true; do
  el=$(($(date +%s) - T0)); ok=0; bad=0; sd=0; st=0; clear 2>/dev/null || true
  printf '=== SHIPPULSE FACTORY HUD (%02d:%02d) ===\n' $((el/60)) $((el%60))
  printf '%-14s %-5s %3s  %s\n' LANE DONE CMT STATUS
  for r in db-api ui-board auth-e2e; do
    d="$BASE/wt-$r"; p="$d/.ralph/PRD.json"; l="$d/logs/ralph-summary.jsonl"
    dn=$(jq '[.stories[]|select(.passes)]|length' "$p" 2>/dev/null || echo 0)
    tt=$(jq '.stories|length' "$p" 2>/dev/null || echo 0)
    cm=$(git -C "$d" rev-list --count main..HEAD 2>/dev/null || echo 0)
    stx=$([ -s "$l" ] && tail -n 1 "$l" | jq -r '.status' || echo RUNNING)
    case "$stx" in RALPH_COMPLETE) ok=$((ok+1));; RUNNING);; *) bad=$((bad+1));; esac
    sd=$((sd+dn)); st=$((st+tt))
    printf '%-14s %d/%-3d %3d  %.14s\n' "feat/$r" "$dn" "$tt" "$cm" "$stx"
  done
  case "$ok:$((ok+bad))" in 3:*) tag=READY;; *:3) tag=STOP;; *) tag=LIVE;; esac
  printf '%s\nFLEET: %d/3 done | %d/%d stories | %s\n' "$HR" "$ok" "$sd" "$st" "$tag"
  case "$tag" in READY) exit 0;; STOP) exit 1;; esac; sleep 2; done
