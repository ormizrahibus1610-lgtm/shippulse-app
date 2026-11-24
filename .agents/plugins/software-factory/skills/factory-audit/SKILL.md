---
name: factory-audit
description: >-
  Audits Row Level Security policies, Supabase Security Advisors,
  secret hygiene, and GitHub Actions CI before release. Use after
  merging parallel factory lanes onto main.
---

# Factory Release Audit

1. Verify every public table enables RLS with strict `auth.uid()` checks.
2. Query read-only Supabase MCP `get_advisors` for zero security warnings.
3. Scan tracked files and git diff for `.env*`, keys, or hardcoded tokens.
4. Confirm `.github/workflows/ci.yml` gates PRs on lint, types, and tests.
5. Emit a concise PASS or BLOCK audit summary before `/factory-ship`.
