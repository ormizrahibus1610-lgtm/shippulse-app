#!/usr/bin/env bash
set -euo pipefail
PRD="${PRD_FILE:-PRD.json}"; PROG="${PROGRESS_FILE:-PROGRESS.md}"
PROMPT_FILE="PROMPT.md"; LOG_DIR="${LOG_DIR:-/tmp/ralph-$(basename "$PWD")}"
ERR_LOG="$LOG_DIR/last-error.log"; SUMMARY_LOG="logs/ralph-summary.jsonl"
AGY_BIN="${AGY_BIN:-agy}"; MAX_ITERS=5; SANDBOX=0; ALLOW_MAIN=0
while [ $# -gt 0 ]; do
  case "$1" in
    --max-iters)  MAX_ITERS="${2:-0}"; shift 2 ;;
    --sandbox)    SANDBOX=1; shift ;;
    --allow-main) ALLOW_MAIN=1; shift ;;
    *) echo "usage: $0 [--max-iters N] [--sandbox] [--allow-main]" >&2; exit 2 ;;
  esac
done
[[ "$MAX_ITERS" =~ ^[1-9][0-9]*$ ]] || { echo "invalid --max-iters" >&2; exit 2; }
mkdir -p "$LOG_DIR" "$(dirname "$SUMMARY_LOG")"
branch=$(git branch --show-current 2>/dev/null || echo detached)
commits=0; in_tok=0; out_tok=0; last_hash=""; streak=0
log_summary() {
  jq -nc --arg ts "$(date -u +%FT%TZ)" --arg br "$branch" --arg st "$1" \
    --arg rsn "$2" --argjson it "$3" --argjson cm "$commits" \
    --argjson sb "$SANDBOX" --argjson ti "$in_tok" --argjson to "$out_tok" \
    '{ts:$ts,branch:$br,status:$st,reason:$rsn,iters:$it,commits:$cm,
      sandbox:($sb==1),in_tok:$ti,out_tok:$to}' >> "$SUMMARY_LOG"
}
if [ "$ALLOW_MAIN" -eq 0 ] && [[ "$branch" =~ ^(main|master)$ ]]; then
  log_summary "CIRCUIT_BREAKER_TRIPPED" "protected_branch" 0
  printf 'CIRCUIT_BREAKER_TRIPPED reason=protected_branch branch=%s\n' "$branch" >&2
  exit 2
fi
protected_hits() {
  { git diff --name-only; git diff --cached --name-only;
    git ls-files --others --exclude-standard; } | sort -u \
    | grep -E '(^|/)(\.env(\..+)?|ralph\.sh|factory\.sh|scripts/verify\.sh|src/server\.ts|src/shared/types\.ts)$' || true
}
changed_work() {
  git status -s -- src/ supabase/ tests/ scripts/e2e-shippulse.mjs 2>/dev/null || true
}
fail_hash() {
  { changed_work; git diff -- src/ supabase/ tests/ scripts/e2e-shippulse.mjs;
    printf '\n---\n';
    tail -n 12 "$ERR_LOG" | sed -E 's/[0-9]+(\.[0-9]+)?ms/Nms/g' \
      | sed -E 's/duration_ms [0-9.]+/duration_ms N/g'; } \
    | sha256sum | cut -c1-12
}
agy_flags=(--mode accept-edits --output-format stream-json)
[ "$SANDBOX" -eq 1 ] && agy_flags=(--sandbox "${agy_flags[@]}")
add_usage() {
  local u di do_
  u=$(jq -sr 'map(select(.event=="result")|.result//.)|last|
    "\(.usage.input_tokens//.usage.prompt_tokens//0) \(.usage.output_tokens//0)"' \
    "$1" 2>/dev/null || echo "0 0")
  read -r di do_ <<< "$u"
  in_tok=$((in_tok + ${di:-0})); out_tok=$((out_tok + ${do_:-0}))
}
finish_complete() {
  log_summary "RALPH_COMPLETE" "all_stories_passed" "$1"
  printf 'RALPH_COMPLETE iters=%d commits=%d in_tok=%d out_tok=%d\n' \
    "$1" "$commits" "$in_tok" "$out_tok"
  exit 0
}
next_story_id() { jq -r '[.stories[]|select(.passes==false)][0].id//""' "$PRD"; }
mark_story_pass() {
  local tmp; tmp=$(mktemp)
  jq --arg id "$1" '(.stories[]|select(.id==$id)).passes=true' "$PRD" > "$tmp"
  mv "$tmp" "$PRD"
}
stream_fmt() {
  jq -r --unbuffered '
    if .event=="init" then (.init//.)|"  init: cid="+((.conversation_id//"new")[0:8])
    elif .event=="result" then (.result//.)|
      "  done: cid="+((.conversation_id//"?")[0:8])+
      " turns="+((.num_turns//0)|tostring)+" status="+(.status//"ok")
    else empty end'
}
for ((iter = 1; iter <= MAX_ITERS; iter++)); do
  sid=$(next_story_id)
  [ -z "$sid" ] && finish_complete "$((iter - 1))"
  title=$(jq -r --arg id "$sid" '.stories[]|select(.id==$id)|.title' "$PRD")
  acc=$(jq -r --arg id "$sid" '.stories[]|select(.id==$id)|.acceptance' "$PRD")
  printf '=== [iter %d/%d] %s: %s ===\n' "$iter" "$MAX_ITERS" "$sid" "$title"
  task=$(cat "$PROMPT_FILE")
  task+=$'\n\n## Assigned Story\n'"- $sid: $title"$'\n'"- Acceptance: $acc"
  task+=$'\n\n## Recent Progress\n'"$(tail -n 6 "$PROG" 2>/dev/null || true)"
  [ -s "$ERR_LOG" ] && task+=$'\n\n## Prior Verify Failure\n'"$(cat "$ERR_LOG")"
  "$AGY_BIN" -p "$task" "${agy_flags[@]}" \
    | tee "$LOG_DIR/iter-${iter}.ndjson" | stream_fmt || true
  add_usage "$LOG_DIR/iter-${iter}.ndjson"
  hits=$(protected_hits)
  if [ -n "$hits" ]; then
    while IFS= read -r p; do
      git ls-files --error-unmatch "$p" >/dev/null 2>&1 || rm -f "$p"
    done <<< "$hits"
    git reset -q HEAD -- . && git checkout -- .
    log_summary "CIRCUIT_BREAKER_TRIPPED" "protected_path" "$iter"
    printf 'CIRCUIT_BREAKER_TRIPPED reason=protected_path files=%s\n' \
      "$(printf '%s' "$hits" | tr '\n' ',')" >&2
    exit 4
  fi
  vout=""
  if [ -n "$(changed_work)" ] && vout=$(npm run -s verify 2>&1); then
    rm -f "$ERR_LOG"; last_hash=""; streak=0
    mark_story_pass "$sid"
    printf -- '- %s (%s): verified and committed by ralph.sh.\n' \
      "$sid" "$title" >> "$PROG"
    git add -A && git commit -q -m "feat(ralph): $sid $title"
    commits=$((commits + 1))
    printf '  verify: PASS (%s)\n' "$(printf '%s\n' "$vout" | tail -n 1)"
  else
    printf '%s\n' "${vout:-no edits detected in lane owned paths}" > "$ERR_LOG"
    h=$(fail_hash)
    if [ "$h" = "$last_hash" ]; then streak=$((streak + 1))
    else last_hash="$h"; streak=1; fi
    printf '  verify: FAIL hash=%s streak=%d/2\n' "$h" "$streak"
    if [ "$streak" -ge 2 ]; then
      git reset -q HEAD -- . && git checkout -- . && rm -f "$ERR_LOG"
      log_summary "CIRCUIT_BREAKER_TRIPPED" "identical_failure_hash" "$iter"
      printf 'CIRCUIT_BREAKER_TRIPPED reason=identical_failure_hash hash=%s\n' \
        "$h" >&2
      exit 3
    fi
  fi
done
[ -z "$(next_story_id)" ] && finish_complete "$MAX_ITERS"
log_summary "MAX_ITERS_REACHED" "budget_exhausted" "$MAX_ITERS"
printf 'MAX_ITERS_REACHED iters=%d commits=%d in_tok=%d\n' \
  "$MAX_ITERS" "$commits" "$in_tok" >&2
exit 1
