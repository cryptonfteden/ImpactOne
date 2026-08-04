# RELEASE_REPRODUCIBILITY.md — Phase RC2-STABILIZATION-001

Mission objective 8: "A developer with zero prior context should be able to clone the repository and start it successfully using only the repository documentation. If not, fix it."

## Before this phase

**Not reproducible.** Concretely verified, not assumed:

1. The root `README.md` contained only a title and a one-line description — zero setup instructions of any kind. A new developer's very first documentation touchpoint gave no actionable path forward. `backend/README.md` and `frontend/README.md` were equally empty stubs.
2. The one real setup document that did exist (`ENVIRONMENT_SETUP.md`) buried the single most load-bearing step — `npm run db:generate` — under a "Running Database Migrations" heading, phrased as if it were only relevant later, when in fact skipping it makes the backend crash immediately (`Cannot find module '.prisma/client/default'`) before a single request can be served.
3. Independent of documentation, the repository's own committed state (before this phase) could not boot at all regardless of what the docs said, due to the missing `backend/services/userRepository.js` commit (see `CLEAN_INSTALL_VERIFICATION.md`).

A new developer following only the repository's documentation, starting from a genuine `git clone`, would have failed at the very first step of finding *any* instructions, and would have then hit two separate hard crashes even if they somehow already knew the correct commands.

## Fixes made this phase

1. **`README.md`** — added a concrete, copy-pasteable "Quick start (clean clone)" section: prerequisites, install both dependency trees, generate the Prisma Client (explicitly flagged as required, not optional), copy `.env.example` files, apply the schema, run, and a one-line way to verify the backend actually booted (`/health/ready`). Added a "Running tests" section pointing at the real, already-existing `npm run test:backend`/`test:frontend`/`build` scripts.
2. **`ENVIRONMENT_SETUP.md`** — inserted the `prisma generate` prerequisite as step 0 of the "Startup Sequence" itself (previously absent from that section entirely), explicitly stating it is not the same as running migrations and explaining exactly what crashes if it's skipped. Added the newer, previously-undocumented `AGENT_SCHEDULER_*`/`AGENT_OBSERVABILITY_*`/`REDIS_CACHE_PRICE_HISTORY_TTL_MS`/`OPTIONS_FLOW_PROVIDER_API_KEY` environment knobs to the "Full Variable Reference" block — all real, all already read by committed code (`schedulerConfig.js`, `agentExecutionLog.js`, `requestFailureLog.js`, `providerCacheConfig.js`, `optionsFlowProvider.js`), previously undocumented anywhere.
3. **`backend/.env.example`** — added the same missing variables (plus `SEC_EDGAR_USER_AGENT`, which was already documented in `ENVIRONMENT_SETUP.md` but missing from the actual example file a developer would copy).
4. **`frontend/.env.example`** — added `VITE_DEV_CONSOLE`, a real, currently-read (`import.meta.env.VITE_DEV_CONSOLE`, 9 files) build-time flag that was documented in `ENVIRONMENT_SETUP.md` but absent from the file developers actually copy.
5. **`backend/services/userRepository.js`** committed — the actual boot-blocking defect (see `RC2_STABILIZATION_REPORT.md`/`CLEAN_INSTALL_VERIFICATION.md`).

## After this phase — re-verified

Re-ran the exact clean-clone procedure end to end against the fixed working tree (see `CLEAN_INSTALL_VERIFICATION.md` for the full step-by-step table): clone → `npm install` (root + frontend) → `npm ci` (both, strict lockfile check) → `npm run db:generate` → live backend boot → all 3 health endpoints respond correctly → live frontend boot, zero warnings → production build succeeds. Every step succeeded using only what's committed to git and what `README.md`/`ENVIRONMENT_SETUP.md` now state.

## Verdict

**Reproducible**, following only the repository's own documentation, as of this phase's commit. This was independently verified via an actual `git clone` into a scratch directory with `node_modules` deleted and reinstalled from scratch — not inferred from reading the docs alone.
