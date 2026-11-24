---
name: factory-spec
description: >-
  Compiles a one-paragraph product prompt into SPEC.md, SQL plus
  auth.uid() RLS contracts, and disjoint lane PRD.json backlogs. Use
  when starting a Software Factory build from a product brief.
---

# Factory Spec Compiler

1. Read the product prompt and `contracts/factory-contract.json`.
2. Write `SPEC.md` with tables, routes, Auth flows, and Playwright checks.
3. Draft Postgres SQL with `ENABLE ROW LEVEL SECURITY` and `auth.uid()`.
4. Emit disjoint `.ralph/` lane backlogs for `db-api`, `ui-board`, `auth-e2e`.
5. Run `node scripts/validate-blueprint.mjs` and confirm zero overlaps.
