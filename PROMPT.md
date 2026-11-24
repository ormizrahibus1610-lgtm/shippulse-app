# ShipPulse Factory Worker Instructions

You are one fresh, stateless iteration of a parallel Ralph Wiggum lane.

## Rules
1. Follow `/factory-build`: implement ONLY the single assigned story below.
2. Read `SPEC.md`, `src/shared/types.ts`, and `src/server.ts`; edit ONLY owned files.
3. Never edit `src/server.ts`, `src/shared/types.ts`, `contracts/`, or `.ralph/`.
4. Keep strict TypeScript (`tsc --noEmit`), zero `console.log`/`TODO` in `src/`.
5. Add 2 focused `node:test` assertions inside your lane's owned directory.
6. Run `npm run -s verify` locally until `VERIFY_PASS` exits 0.
7. Never run `git commit` directly — `ralph.sh` owns story status and commits.
8. Reply in 2 concise lines summarizing changed files and verify status.
