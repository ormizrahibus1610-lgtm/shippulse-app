#!/usr/bin/env bash
set -euo pipefail
DRY=0; SESSION="shippulse-factory"; MAX_ITERS=4; LANES=(db-api ui-board auth-e2e)
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run)   DRY=1; shift ;;
    --session)   SESSION="${2:-}"; shift 2 ;;
    --max-iters) MAX_ITERS="${2:-0}"; shift 2 ;;
    *) echo "usage: $0 [--dry-run] [--session S] [--max-iters N]" >&2; exit 2 ;;
  esac
done
REPO="$(cd "$(dirname "$0")" && pwd)"; BASE="$(dirname "$REPO")"
node "$REPO/scripts/validate-blueprint.mjs"
node "$REPO/scripts/validate-factory.mjs"
for b in git jq tmux node agy; do
  command -v "$b" >/dev/null || { echo "missing: $b" >&2; exit 1; }
done
if [ "$DRY" -eq 1 ]; then
  for l in "${LANES[@]}"; do
    printf '  lane %-8s -> %s/wt-%s (feat/%s)\n' "$l" "$BASE" "$l" "$l"
  done
  printf '  tmux %-8s -> 4 panes (3 Ralph lanes + hud)\n' "$SESSION"
  printf 'FACTORY_DRY_RUN_OK session=%s lanes=3 max_iters=%d\n' \
    "$SESSION" "$MAX_ITERS"; exit 0
fi
if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "Session '$SESSION' is already running."; exit 0
fi
BACKLOG="$REPO/backlogs/fleet.json"
[ -f "$BACKLOG" ] || BACKLOG="$REPO/backlogs/factory.json"
for l in "${LANES[@]}"; do
  dir="$BASE/wt-$l"; br="feat/$l"
  if [ ! -d "$dir" ]; then
    git -C "$REPO" show-ref -q "refs/heads/$br" \
      && git -C "$REPO" worktree add -q "$dir" "$br" \
      || git -C "$REPO" worktree add -q "$dir" -b "$br"
  fi
  [ -d "$REPO/node_modules" ] && [ ! -e "$dir/node_modules" ] && \
    ln -s "$REPO/node_modules" "$dir/node_modules" || true
  mkdir -p "$dir/.ralph" "$dir/logs"
  [ -f "$BACKLOG" ] && jq --arg l "$l" '.[$l]' "$BACKLOG" > "$dir/.ralph/PRD.json"
  printf '# %s progress\n' "$br" > "$dir/.ralph/PROGRESS.md"
  rm -f "$dir/logs/ralph-summary.jsonl"
done
F='#{pane_id}'; C="$BASE/wt"
send() { tmux send-keys -t "$1" -l -- "$2"; tmux send-keys -t "$1" C-m; }
P1=$(tmux new-session -d -x 98 -y 24 -s "$SESSION" -c "$C-db-api" -P -F "$F")
P3=$(tmux split-window -v -t "$P1" -c "$C-auth-e2e" -P -F "$F")
P2=$(tmux split-window -h -t "$P1" -c "$C-ui-board" -P -F "$F")
P4=$(tmux split-window -h -t "$P3" -c "$REPO" -P -F "$F")
for pair in "$P1:db-api" "$P2:ui-board" "$P3:auth-e2e" "$P4:hud"; do
  tmux select-pane -t "${pair%%:*}" -T "${pair#*:}"; done
prefix=""
[ -n "${AGY_BIN:-}" ] && prefix="AGY_BIN=$AGY_BIN "
run="${prefix}PRD_FILE=.ralph/PRD.json PROGRESS_FILE=.ralph/PROGRESS.md ./ralph.sh"
sleep 0.4
for p in "$P1" "$P2" "$P3"; do send "$p" "$run --max-iters $MAX_ITERS"; done
send "$P4" "./scripts/fleet-board.sh '$BASE'"
tmux select-pane -t "$P4"
printf 'FACTORY_LAUNCHED session=%s lanes=3 max_iters=%d\n' "$SESSION" "$MAX_ITERS"
