# DEPENDENCY_AUDIT.md — Phase RC2-STABILIZATION-001

## Method

Every relative `require()`/`import`/dynamic `import()` in `backend/**/*.js` (602 files) and `frontend/src/**/*.{js,jsx}` (across 1323 total files scanned with backend) was resolved against the real filesystem via a throwaway Node script (not committed). Every bare-package specifier was cross-referenced against `package.json`'s declared `dependencies`/`devDependencies` for both the root and `frontend/` manifests. `npm ci` was run against a from-scratch clone for both manifests to strictly validate lockfile consistency. A comment-aware circular-require detector was run across all of `backend/`.

## 1. Orphan / missing / renamed relative imports

**Result: zero found.** All 1323 scanned files' relative `require()`/`import` specifiers resolve to a real file on disk. No renamed-but-not-updated reference, no deleted-but-still-imported file, no typo'd path was found anywhere in `backend/` or `frontend/src/`.

## 2. Circular imports

A full circular-require graph was built and searched (comment-stripped, to avoid false positives from example code inside `//`/`/* */` comments — an early raw-text pass incorrectly flagged an `app.js → schedulerService.js → app.js` cycle that was purely a code example quoted inside a comment, not a real `require()`).

**4 real circular-require chains found**, all in the same family:

```
providerRegistry.js → reutersBloombergWireProvider.js → providerAbstraction.js → {providerHealthService.js | providerMetricsService.js | providerDiagnosticsService.js | providerIngestionService.js} → providerRegistry.js
```

**Assessed as currently benign, not fixed.** Verified directly: all four of `providerHealthService.js`/`providerMetricsService.js`/`providerDiagnosticsService.js`/`providerIngestionService.js` only touch `providerRegistry`'s exports (`getProvider()`/`listProviders()`) **inside function bodies**, never at module-load/top-level scope — meaning by the time any of those calls actually executes, the full require cache has long since settled and every module has finished initializing. Node's CommonJS cycle-handling (returning the in-progress `module.exports` object at the point of re-entry) is safe here because nothing reads that object before it's complete. Confirmed no failure from this: the live backend boot and the full `node --test` suite (602 backend files, see `RC2_STABILIZATION_REPORT.md`) both exercise this exact require graph without incident. Per this mission's "no architecture changes" / "fix only confirmed issues" instructions, this is disclosed as a structural fragility worth avoiding in future new provider-registry integrations, not refactored this phase — there is no confirmed bug to fix, and untangling a registry/plugin-style circular reference is itself a real architectural change out of scope here.

## 3. Dead/orphan files

Every file under `backend/services/**/*.js` (excluding `.test.js`) was checked for zero referrers anywhere in `backend/` or `frontend/src/`. 3 candidates surfaced, all verified NOT to be dead code:

| File | Verdict | Reason |
|---|---|---|
| `backend/services/agentScheduler/index.js` | Not dead | A deliberate barrel-export file (own header comment: "barrel export for the scheduling layer"). Every real consumer currently reaches into `agentScheduler/agentScheduler.js` directly rather than through this barrel, so it has zero current referrers, but it re-exports only real, valid symbols and is a reasonable, harmless public-API convenience. Not removed. |
| `backend/services/agentObservability/index.js` | Not dead | Same pattern as above — an unused-but-valid barrel export, not broken code. |
| `backend/services/agentOrchestrator/agents/stubAgentFactory.js` | Not dead — intentionally retained | The codebase's own `registry.test.js` comment explicitly documents that all 14 named agent domains are now real (the last, `news`, was upgraded at `NEWS-AGENT-001`) and that `createStubAgent` "has zero remaining call sites" today, then explicitly states it "remains available... for any future new agent domain this codebase adds." This is disclosed, deliberate, forward-looking retained infrastructure, not an oversight — removing it would contradict the codebase's own stated intent and is out of scope for a stabilization-only pass. |

No genuinely dead file was found and none was removed. (The prior `RELEASE-CANDIDATE-001` phase already removed the 3 confirmed-dead frontend components — `KpiCard.jsx`/`WatchlistTable.jsx`/`AIInsightsSidebar.jsx` — independently re-verified in this codebase's history; nothing new of that kind was found this phase.)

## 4. Package-dependency audit

| Manifest | Declared | Genuinely unused | Genuinely used-but-undeclared |
|---|---|---|---|
| Root `package.json` | 15 (12 deps + 3 devDeps) | **0** | **0** |
| `frontend/package.json` | 14 (10 deps + 4 devDeps) | **0** | **0** |

Every dependency initially flagged as "unused" by static import-scanning was individually verified to be a legitimate non-source-imported dependency:
- `concurrently`, `prisma` (root) and `vite`, `@vitejs/plugin-react`, `typescript`, `jsdom`, `@testing-library/jest-dom`, `@types/react`, `@types/react-dom` (frontend) are all CLI/build/test-tooling packages invoked via `npm` scripts or config files, never expected to appear in application source `require()`/`import` statements.
- `pg` (root) is never directly `require()`d by this codebase's own code, but is a real, required dependency of `@prisma/adapter-pg` (confirmed via that package's own `package.json` — `pg` is declared there, requiring the consuming project to install a compatible version explicitly, the standard Prisma driver-adapter pattern). Genuinely required, not dead.

Every string flagged as "used but undeclared" by the same static scan was a false positive — natural-language text inside string/template literals that happened to contain the substring `from '...'` (e.g. narrative copy like "...changed from 'Fed rate hike' to...") matching the scanner's own import-detection regex, not a real import statement. Manually spot-checked; none were real.

## 5. Lockfile consistency

`npm ci` (which fails hard on any package.json/package-lock.json mismatch) was run against a genuinely clean clone for both manifests:
- Root: `npm ci` → succeeded, 267 packages installed, 0 errors.
- `frontend/`: `npm ci` → succeeded, 172 packages installed, 0 errors.

Both lockfiles are fully consistent with their manifests.

## 6. `npm audit` findings — assessed, not fixed

| Manifest | Findings | Assessment |
|---|---|---|
| Root | 7 vulnerabilities (4 moderate, 3 high): `fast-uri`, `shell-quote`, `valibot`, `@hono/node-server` | All are **transitive dependencies of dev-only tooling** — `fast-uri`/`valibot`/`@hono/node-server` are nested under `@prisma/dev` (Prisma's own local CLI dev-tooling, not code that runs inside the deployed backend process), and `shell-quote` is nested under `concurrently` (an `npm run dev`-only script orchestrator, never used in a real production start — `ENVIRONMENT_SETUP.md`'s own process-management guidance runs `node backend/server.js` directly). None are reachable from the production runtime. `npm audit fix` was dry-run tested and would bump `prisma` itself to `7.9.1`, a real dependency-version change this repo's own `allowScripts` install-script-approval gate would require manual review for — a genuine version bump of a critical dependency carries real compatibility risk disproportionate to a documentation/stabilization-only phase. **Not applied.** Recommended as a deliberate, reviewed decision in a future dependency-maintenance phase, not a stabilization-blocking issue. |
| `frontend/` | 1 high severity | Also a dev-tooling-only transitive vulnerability (same class), not reachable in the shipped production bundle. Not applied, same reasoning. |

## 7. `node_modules` tracked in git (pre-existing condition, disclosed not fixed)

`.gitignore` explicitly lists `node_modules/`, yet `git ls-files` shows 3745 files under root `node_modules/` and 936 under `frontend/node_modules/` are tracked in git (predating this engagement, likely force-added before or despite the ignore rule). This causes real, observed drift: after the immediately-preceding `RC1-BLOCKERS-001` commit removed `react-router-dom` from `package.json`, the tracked `node_modules` snapshot still had `react-router-dom`/`cookie`/`react-router`/`set-cookie-parser` present until a later local `npm install` reconciled them on disk (as uncommitted deletions, not yet part of any commit).

This is a genuine repository-hygiene defect worth flagging clearly, but **not corrected this phase**: untracking `node_modules` from git (`git rm -r --cached node_modules frontend/node_modules`) would touch ~4700 tracked file paths in one change — a large-blast-radius operation explicitly beyond this mission's "minimal changes"/"no architecture changes" scope, and not required for a clean clone to work correctly (confirmed directly: this phase's clean-clone test deleted `node_modules` entirely and reinstalled from scratch, which is what any real deployment should do regardless of what happens to be tracked). Recommended as a dedicated, deliberate future cleanup phase, explicitly not attempted here.
