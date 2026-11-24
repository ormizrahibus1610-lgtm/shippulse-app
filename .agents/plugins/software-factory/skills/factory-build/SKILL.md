---
name: factory-build
description: >-
  Guides one fresh Ralph Wiggum worktree worker to implement a single
  assigned PRD.json story under strict lane boundaries. Use during
  parallel factory.sh worktree iterations.
---

# Factory Build Worker

1. Implement ONLY the single assigned story from `.ralph/PRD.json`.
2. Edit ONLY directories owned by this branch in `factory-contract.json`.
3. Run `npm run verify` (types, lint, unit, Playwright) until exit 0.
4. Never edit `.ralph/` state, `.env*`, or run `git commit` directly.
5. Report changed files and verify status in two concise lines.
