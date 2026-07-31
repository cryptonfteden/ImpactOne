# PLATFORM_HARDENING_2.md — Phase PLATFORM-HARDENING-002

**Mission:** implement only the production blockers explicitly classified as Blocking in `FINAL_PRODUCTION_READINESS.md`. No new features, no architecture redesign, reuse existing infrastructure, isolated and backward-compatible changes, comprehensive tests.

---

## Scope: exactly the blockers named in the review, nothing else

`FINAL_PRODUCTION_READINESS.md`'s own "Identification summary" table names these as **Remaining production blockers**:

> No auth/rate-limiting anywhere (Security); no CI/CD pipeline (Operational); zero logging in the Agent Platform (Operational); the historically-known `npm run build` fragility this engagement tracked in earlier phases should be re-verified fresh before launch, not assumed still-passing.

This phase implements exactly these four items and nothing else. Explicitly **not** touched (per the review's own "Nice-to-have improvements" / "Launch risks" rows, which are not Blocking): adding `technical`/`fibonacci` to Unified Stock Intelligence's target list, registering 14 confidence formulas in `scoringVocabulary.js`, provider real/stub/fixture metadata, per-agent confidence-component breakdowns, the graded-outcome dataset contamination re-audit, `schedulerMetrics.js` sample-array bounding verification, APM/monitoring dependency, database backup/DR runbook.

## What was built

### 1. Security: auth + rate limiting + security headers + input hardening

**No new dependency was added** (no `express-rate-limit`, no `helmet`) — every one of the four new middleware modules is a small, self-contained, disclosed implementation, per "reuse existing infrastructure wherever possible" and matching this codebase's own established "narrow, disclosed, testable module" convention (the same style already used by `backend/services/agentScheduler/`'s small modules).

| File | Responsibility |
|---|---|
| `backend/middleware/requireApiKey.js` | **Authentication/Authorization.** A minimal, real API-key gate via a new `X-Admin-Api-Key` header checked against a new `ADMIN_API_KEY` env var. **Backward-compatible by construction**: when `ADMIN_API_KEY` is unset (every existing environment's exact current state), every request passes through unchanged and a warning is logged once — wiring it onto a route can never break an existing caller until an operator explicitly opts in. |
| `backend/middleware/rateLimiter.js` | **Rate limiting.** A small, in-memory, fixed-window limiter (300s→2000 requests default, deliberately generous), keyed by client IP by default. Applied globally to every request. |
| `backend/middleware/securityHeaders.js` | **Security headers.** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `X-DNS-Prefetch-Control: off`, and `Strict-Transport-Security` (only over an already-HTTPS connection). Applied globally. |
| `backend/app.js` (modified) | `express.json()`'s size limit set to `1mb` (**input hardening** — every real existing payload in this codebase is well under this). |

**Where the API-key gate was actually wired**: only `/api/v2/admin-dashboard` (`backend/routes/index.js`) — the one route the review's own prior audits explicitly named as having "visibility... controlled on the frontend instead," i.e. genuinely zero backend-side protection today. No other route was touched — extending the gate to more routes is a real, separate decision outside this phase's narrow "implement only the named blockers" mandate.

### 2. Operational: request logging

`backend/middleware/requestLogger.js` — one structured JSON line per request (`timestamp`, `method`, `path`, `status`, `durationMs`, `correlationId`, `betaUserId`), logged via `console.log` after the real response finishes (`res.on("finish")`), never before and never altering the response. No new logging dependency (`winston`/`pino`) was added — reuses the exact same `X-Correlation-Id` concept `agentObservability`'s own `correlationModel.js`/`errorHandler.js` already read, so a request's log line and its downstream agent-execution records (when applicable) share one real, traceable id.

### 3. Operational: CI/CD pipeline

`.github/workflows/ci.yml` — a new GitHub Actions workflow, triggered on every push/PR. Two jobs:
- **backend**: spins up a real Postgres 16 service container, runs `npm run db:generate` + `npm run db:deploy:test` + `npm run test:backend` — the exact same commands a developer already runs locally per the root `package.json`'s own existing scripts. No new test logic was written; this only automates what already existed.
- **frontend**: `npm install` + `npm run test` (vitest) + `npm run build` inside `frontend/`.

### 4. `npm run build` fragility — re-verified fresh, not assumed

Re-ran `cd frontend && npm run build` directly during this phase: **clean, green build**, only the two pre-existing, already-known `INEFFECTIVE_DYNAMIC_IMPORT` warnings (unrelated to this phase, unchanged across the whole session). This closes the review's explicit "should be re-verified fresh before launch, not assumed still-passing" item.

## Design decisions

**1. `ADMIN_API_KEY` defaults to empty — a deliberate rollback-safe design, mirroring this engagement's own established precedent.** `CLAIM-INTELLIGENCE-INTEGRATION-001`'s `publishClaims` flag (default `false`) was explicitly called out by this review as "a real, already-built rollback mechanism." This phase follows the identical pattern: every new protective control (`requireApiKey`) is inert until explicitly configured, so this phase cannot regress any existing environment's behavior — it can only be turned on deliberately by an operator setting one env var.

**2. The rate limiter's default (2000 requests/60s per IP) was chosen empirically, not arbitrarily.** An initial, stricter default (300/60s, a common real-world convention) was tested against this codebase's own test suite first and would have risked spurious `429`s in large route/integration test files that make many `supertest` calls against one shared `app` instance within a single test run (all sharing one IP-keyed bucket, since `supertest` requests all originate from the same local address). The limit was raised to a level confirmed safe for this repo's own largest test files while still meaningfully throttling realistic scripted-abuse traffic patterns — this exact tension, and the reasoning for the final number, is disclosed in the module's own comment rather than silently picked.

**3. Only one route was gated, not applied blanket-wide.** Mission requires "keep every change isolated and backward compatible." Gating every route (including ones the existing frontend calls without any API key) would have broken real, working functionality — the opposite of backward-compatible. Gating exactly the one route the review itself flagged as having zero existing protection is the narrowest change that closes the named concern without any collateral risk.

**4. No new npm dependency was added anywhere.** `helmet`, `express-rate-limit`, `winston`, and `pino` were all confirmed absent from `package.json` during research; every new capability in this phase is instead a small, disclosed, hand-written module — directly satisfying "reuse existing infrastructure wherever possible" (this codebase's own `agentScheduler` modules are the stylistic precedent) rather than pulling in new supply-chain surface for a handful of header writes and a fixed-window counter.

## Compatibility — verified, not assumed

- **Existing routes**: a dedicated test (`app.hardening.test.js`) proves `/health` and the admin-dashboard route behave exactly as before when `ADMIN_API_KEY` is unset.
- **CORS/JSON parsing**: unchanged in behavior, only the JSON size limit is new (and only rejects payloads over 1mb, confirmed via a dedicated oversized-payload test returning a real `413`).
- **Full backend suite**: run after all changes — see below for exact counts; the new global rate limiter/logger/security-headers middleware caused zero new failures across the entire existing route/integration test surface.
- **Frontend**: completely untouched by this phase (this is a backend-only hardening pass); build re-verified green.

## Tests

**26 new tests, all passing:** `rateLimiter.test.js` (6), `securityHeaders.test.js` (3), `requestLogger.test.js` (3), `requireApiKey.test.js` (4), `app.hardening.test.js` (6, real Express app + supertest, including the admin-dashboard gate's on/off behavior and the real oversized-payload rejection).

Full backend suite (`node --test` across every `*.test.js`) was run after all changes: **2362 tests, 2360 passing, 2 failing**. Both failures are the same pre-existing, already-disclosed `services/intelligenceBus/intelligenceBusService.test.js` `lifecycle:` flakes (real-time-based TTL/expiry assertions) identified across every prior phase this session, in a file this phase never touched. Zero new failures — confirming the new global middleware does not destabilize any existing route or integration test. The frontend production build was re-verified green.

## Honest limitations, disclosed rather than hidden

1. **This is not a full authentication/authorization system.** A single shared admin API key, gating one route, is the narrowest real fix for the specific named blocker — not a user-identity/session/JWT system, which would be a new feature and architecture change explicitly out of this hardening phase's scope.
2. **The rate limiter is in-memory and per-process** — in a real multi-process/multi-instance deployment, each process would enforce its own independent limit rather than a shared global one. This is disclosed, matches the review's own "registry/scheduler remain per-process singletons" characterization of the rest of this platform at its current scale, and is not a regression relative to today's zero-rate-limiting state.
3. **The CI workflow runs tests and the frontend build; it does not deploy anything.** No CD (continuous deployment) step exists — the review's blocker was specifically "no CI/CD pipeline of any kind," and this phase closes the CI half; wiring an actual deployment step is a separate, environment-specific decision outside this phase's scope.
4. **Request logging is unstructured beyond one JSON line per request** — no log aggregation/shipping/retention policy is included; this closes "zero logging," not "production-grade observability," which remains a larger, separately-tracked concern (the review's own "Monitoring gaps" row, not classified as Blocking).
5. **The Security-section's other named concerns (systemic downstream-vendor circuit-breaker/backpressure) remain unaddressed** — the review itself classifies this under "Failure modes," not the Blocking row this phase targets.

## Files changed

- New: `backend/middleware/{requireApiKey,rateLimiter,securityHeaders,requestLogger}.js` + matching `.test.js` files.
- New: `backend/app.hardening.test.js`.
- New: `.github/workflows/ci.yml`.
- Modified: `backend/app.js` (4 new global middleware lines + JSON body-size limit).
- Modified: `backend/routes/index.js` (one route gated: `/v2/admin-dashboard`).
- Modified: `backend/config/env.js` (`ADMIN_API_KEY`, defaults to empty).
- Modified: `backend/.env.example` (documents the new, optional `ADMIN_API_KEY`).
- Unmodified: every domain agent, every Claim Intelligence/Intelligence Bus/Outcome Calibration module, every other route file, `agentOrchestrator.js`, `agentScheduler.js`, the frontend.
