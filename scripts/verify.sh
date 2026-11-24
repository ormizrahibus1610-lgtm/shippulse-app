#!/usr/bin/env bash
set -euo pipefail
now_ms() { awk '{print int($1*1000)}' /proc/uptime; }
T0=$(now_ms); OUT="/tmp/verify-$(basename "$PWD").out"
stage() {
  local n="$1" label="$2"; shift 2; local s0=$(now_ms)
  "$@" >"$OUT" 2>&1 || {
    printf 'GATE_STAGE %s %-10s ... FAIL\n' "$n" "$label" >&2
    tail -n 16 "$OUT" >&2; rm -f "$OUT"; exit 1
  }
  printf 'GATE_STAGE %s %-10s ... PASS (%dms)\n' "$n" "$label" $(($(now_ms) - s0))
}
stage "1/4" "typecheck" ./node_modules/.bin/tsc --noEmit
stage "2/4" "lint"      node scripts/lint-check.mjs
stage "3/4" "unit"      node scripts/run-unit-tests.mjs
if [ -f "scripts/e2e-shippulse.mjs" ]; then
  stage "4/4" "playwright" env TMPDIR=/tmp node scripts/e2e-shippulse.mjs
else
  stage "4/4" "contracts" node scripts/validate-blueprint.mjs
fi
rm -f "$OUT"; printf 'VERIFY_PASS total=%dms\n' $(($(now_ms) - T0))
