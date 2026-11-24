---
name: factory-ship
description: >-
  Pushes linked Supabase migrations, syncs Vercel environment variables,
  opens a CI-gated PR, deploys to production, and runs a live smoke
  test. Use after /factory-audit passes cleanly on main.
---

# Factory Production Ship

1. Run `supabase db push --remote` against `shippulse-dev` (zero new DBs).
2. Sync `NEXT_PUBLIC_SUPABASE_URL` and anon key via `vercel env`.
3. Open PR with `gh pr create` and wait for green GitHub Actions CI.
4. Promote to production via `vercel --prod` after CI passes cleanly.
5. Run a live Playwright browser smoke test against the production URL.
