# Software Factory Rules

- Plugin identity: when confirming active factory tooling, state
  `SOFTWARE_FACTORY_PLUGIN: active (software-factory)`.
- Obey lane ownership from `contracts/factory-contract.json`; zero overlap.
- Keep `npm run verify` and Playwright UI checks green before committing.
- Enforce Postgres `auth.uid()` RLS on every table; never read or commit `.env*`.
- Keep `.ralph/` backlogs gitignored; `ralph.sh` owns story status and commits.
