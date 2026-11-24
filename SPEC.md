# ShipPulse Spec
- Stack: Node/TS (`src/server.ts`, `src/shared/types.ts`), Supabase `shippulse-dev`.
- `public.features`: id, title, status, votes, author_id (nullable); public read.
- `public.votes`: id, feature_id, user_id, unique(feature_id, user_id); auth toggle.
- `public.changelogs`: id, title, body, feature_id, published_at; admin publish.
- RLS: enabled on all 3 tables with `(select auth.uid())` and admin policies.
- Types: `RoadmapStatus`, `FeatureItem`, `ChangelogEntry`, `SessionUser`,
  `VoteResult`, `ShipPulseStore`.
- API: `GET/POST /api/features`, `POST /api/votes`, `GET/POST /api/changelogs`,
  `GET /api/health`; UI: `/` board, `/changelog`.
- Auth: `x-demo-user: <id>:<email>:<role>`; POST `/api/*` gated (admin for logs).
- `db-api` owns `supabase/`, `src/lib/db/`, `src/app/api/`.
- `ui-board` owns `src/components/`, `src/app/board/`, `src/app/changelog/`.
- `auth-e2e` owns `src/app/auth/`, `src/middleware.ts`, `tests/e2e/`,
  `scripts/e2e-shippulse.mjs` (Playwright 42->43->42, create, changelog, 0 errs).
