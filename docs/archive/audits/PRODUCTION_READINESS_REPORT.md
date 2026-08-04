# Production Readiness Report — SRE Audit

**Status:** Read-only audit. No application code was modified to produce this document.
**Perspective:** Principal Site Reliability Engineer review of the current committed codebase (`backend/`, `frontend/`, root config) as of 2026-07-12, branch `sprint-16-live-data`.
**Scope:** Security, CI/CD, Logging, Monitoring, Error Handling, Rate Limiting, API Validation, Secrets Management, Docker Readiness, Database Resiliency, Backup Strategy, Health Checks, Performance Bottlenecks.

Every finding below was verified directly against the current code (file/line citations included), not inferred from prior planning docs, though it is consistent with them.

---

## 1. Executive Summary

**Overall verdict: NOT production-ready.** The service runs correctly as a local, single-instance, single-operator development app, but has no operational safety net: no CI, no monitoring, no rate limiting, no auth, no backup strategy, no Docker artifacts, and a health check that cannot detect an outage in its own database. If deployed today and pointed at real traffic, the most likely failure modes are (a) unbounded third-party API cost from an unauthenticated, unrated endpoint, (b) silent data loss with no path to recovery (no backups), and (c) a total inability to tell that anything is wrong (no monitoring, a health check that always says "ok").

**Findings by severity:**

| Severity | Count |
|---|---|
| Critical | 9 |
| High | 16 |
| Medium | 13 |
| Low | 8 |
| **Total** | **46** |

---

## 2. Findings by Category

Each finding: **ID — Severity — Finding**, with evidence and recommendation.

### 2.1 Security

- **SEC-1 — Critical — Real API keys are tracked in git.** `frontend/.env` is committed and tracked (`git ls-files` confirms this) despite `.gitignore` listing `.env`, meaning the ignore rule was added after the file was already tracked. The file contains backend-style secret variable names. *Recommendation:* rotate the keys at the provider immediately, `git rm --cached frontend/.env`, and treat git history scrubbing as a separate, coordinated operation (see Roadmap Phase 1).
- **SEC-2 — Critical — No authentication or authorization anywhere.** [backend/app.js](../../../backend/app.js) mounts `cors()` and `express.json()` directly onto `/api` with no auth middleware of any kind. Every endpoint, including money-moving ones (`POST /api/v2/portfolio/orders`, `POST /api/v2/portfolio/reset`), is fully public. *Recommendation:* add an auth middleware slot and require identity on all write endpoints as a first step.
- **SEC-3 — High — CORS accepts any origin.** [backend/app.js:8](../../../backend/app.js#L8) calls `cors()` with no options, which reflects/allows all origins. Combined with SEC-2, any third-party page can script-call every endpoint from a victim's browser. *Recommendation:* explicit env-driven origin allow-list.
- **SEC-4 — High — No security headers.** No `helmet()` or equivalent anywhere in `backend/`; responses carry no CSP, X-Frame-Options, HSTS, etc. *Recommendation:* add `helmet()` with a sane default policy.
- **SEC-5 — Medium — Verbose, unredacted logging of request/response bodies.** [backend/controllers/aiController.js:21-22,38-39](../../../backend/controllers/aiController.js#L21-L39) and [backend/services/openaiService.js:93-94,119-120](../../../backend/services/openaiService.js#L93-L120) log up to 4000 characters of request/response content via `console.log`, with no redaction. *Recommendation:* replace with structured, redacted logging (see LOG-2).
- **SEC-6 — Low — No dependency vulnerability scanning.** No `npm audit` step, no Dependabot config found anywhere in the repo. *Recommendation:* enable Dependabot or an `npm audit` CI gate.

### 2.2 CI/CD

- **CI-1 — Critical — No CI pipeline exists.** No `.github/workflows` directory (or any other CI config) was found anywhere in the repository. The 135 existing tests (89 backend / 46 frontend) only run when a human remembers to run them locally. *Recommendation:* add a CI workflow (lint + test + build) as a required PR check — this is the single highest-leverage item in this report because it protects every other fix.
- **CI-2 — High — No lint/format enforcement.** No ESLint or Prettier configuration exists in either `frontend/` or `backend/`. *Recommendation:* add both, wire into CI.
- **CI-3 — Medium — No automated build verification.** `npm run build` (frontend) is never run except manually; a broken build could merge to `main` undetected. *Recommendation:* add a build step to CI.
- **CI-4 — Medium — No branch protection possible without CI.** With no CI checks defined, there is nothing to make required on `main` even if branch protection were enabled. *Recommendation:* enable branch protection once CI-1 lands.

### 2.3 Logging

- **LOG-1 — High — Logging is 100% unstructured `console.log`/`console.error`.** 13 call sites found across 5 files ([backend/controllers/aiController.js](../../../backend/controllers/aiController.js), [backend/middleware/errorHandler.js](../../../backend/middleware/errorHandler.js), [backend/prisma/deployTestDb.js](../../../backend/prisma/deployTestDb.js), [backend/server.js](../../../backend/server.js), [backend/services/openaiService.js](../../../backend/services/openaiService.js)) — no log levels, no structured JSON, no request-correlation IDs. *Recommendation:* adopt a structured logger (e.g. `pino`) with a request-ID middleware.
- **LOG-2 — High — Sensitive/verbose payloads logged without redaction.** Same evidence as SEC-5 — this is both a security and an operational-hygiene problem (log volume/cost, and risk once user-identifying data enters context after auth is added). *Recommendation:* redact before logging; cap logged payload size structurally, not just by string-slicing.
- **LOG-3 — Medium — No log aggregation/shipping.** Logs go only to stdout; there is no shipping to a log store, so logs vanish on process/container restart. *Recommendation:* ship stdout to a log aggregator (even a basic hosted tier) once containerized.
- **LOG-4 — Low — Errors logged with no context.** [backend/middleware/errorHandler.js:2](../../../backend/middleware/errorHandler.js#L2) does `console.error(err)` with no request path, method, or correlation ID attached, making production incidents hard to correlate to a specific request. *Recommendation:* log `{ requestId, method, path, err }` as a structured object.

### 2.4 Monitoring

- **MON-1 — Critical — No monitoring/APM/metrics exist.** Repo-wide search for common libraries (`prom-client`, Datadog, New Relic, Sentry, OpenTelemetry) returns zero hits, and neither `package.json` lists any observability dependency. *Recommendation:* add at minimum an error-tracking SDK (e.g. Sentry) and basic request-count/latency counters.
- **MON-2 — High — No uptime/alerting configured.** Nothing in the repo references an external ping/alerting service, and there is no internal alerting logic either. *Recommendation:* add external uptime monitoring against `/health` once HEALTH-1 is fixed, with alert routing.
- **MON-3 — High — No latency/performance instrumentation.** p50/p95/p99 latency, provider error rates, and cache hit/miss rates are not measured anywhere in the codebase today. *Recommendation:* add request-timing middleware and per-provider call metrics.
- **MON-4 — Medium — No error-rate dashboard.** Errors are only visible via whatever terminal happens to be running the process; there is no aggregated view of error rate over time. *Recommendation:* covered by MON-1's error-tracking SDK.

### 2.5 Error Handling

- **ERR-1 — High — Error-handler contract bug.** [backend/middleware/errorHandler.js](../../../backend/middleware/errorHandler.js) reads `err.status`, but every service throws `error.statusCode` (e.g. `finnhubService.js`'s `buildError`, `portfolioEngineService.js`'s `badRequest`). Controllers that don't manually re-check `.statusCode` before calling `next(error)` always get HTTP 500 instead of the intended 400/404/502. *Recommendation:* standardize on one property name across the codebase and add a contract test asserting it.
- **ERR-2 — Medium — No global 404 handler.** Unmatched routes fall through to Express's default HTML 404 page instead of a consistent JSON error shape. *Recommendation:* add a catch-all JSON 404 handler after the router.
- **ERR-3 — Medium — Internal error messages can leak to clients.** [backend/db/prismaClient.js:12](../../../backend/db/prismaClient.js#L12) throws `"DATABASE_URL is missing. Add it to backend/.env..."`, which — because `errorHandler.js` forwards `err.message` verbatim — would be returned as-is in the JSON response body if DB config breaks in production. *Recommendation:* map known internal errors to a generic client-safe message; log the detailed message server-side only.
- **ERR-4 — Low — No process-level crash handlers.** [backend/server.js](../../../backend/server.js) has no `process.on("uncaughtException"/"unhandledRejection")` handlers — an error outside the Express request cycle could crash the process without any log trace of why, or leave it in an undefined state. *Recommendation:* add top-level handlers that log and trigger a controlled restart.

### 2.6 Rate Limiting

- **RATE-1 — Critical — No rate limiting exists anywhere.** Confirmed via both code inspection and `package.json` (no `express-rate-limit` or equivalent dependency in either root or backend). *Recommendation:* add tiered rate limiting, strictest on AI/recommendation routes.
- **RATE-2 — Critical — Unbounded cost exposure on paid-API-backed endpoints.** `POST /api/ai/analyze` ([backend/controllers/aiController.js](../../../backend/controllers/aiController.js)) and `POST /api/v2/recommendations/run` ([backend/controllers/autonomousRecommendationController.js](../../../backend/controllers/autonomousRecommendationController.js)) both fan out to OpenAI/Finnhub with no rate limit or auth gating — a trivial, scriptable cost-abuse vector today. *Recommendation:* prioritize rate limiting on exactly these two routes first if nothing else ships this sprint.
- **RATE-3 — High — No explicit request size limits.** `express.json()` relies on its undocumented library default rather than an intentionally configured limit. *Recommendation:* set an explicit `limit` option and reject oversized bodies with a clear 413.

### 2.7 API Validation

- **VAL-1 — High — No validation library anywhere.** Neither `zod`, `joi`, nor `express-validator` appear in either `package.json`; controllers do ad hoc `Number()`/`String()` coercion. *Recommendation:* adopt a schema-validation library at the controller boundary.
- **VAL-2 — High — Unvalidated query params flow into Prisma query options.** E.g. `Number(req.query.limit)` in recommendation/portfolio controllers becomes `NaN` on bad input and is passed straight into a Prisma `take` clause with no clamp. *Recommendation:* validate and clamp all pagination/limit parameters.
- **VAL-3 — Medium — Inconsistent body validation on write endpoints.** `POST /api/v2/portfolio/orders` has manual field checks in `portfolioEngineService.js`, but the pattern isn't consistently applied across all write endpoints. *Recommendation:* standardize on one validation approach applied uniformly.

### 2.8 Secrets Management

- **SECMGT-1 — Critical — Real secrets committed to git.** Same underlying fact as SEC-1; listed here separately because it is squarely a secrets-management failure, not just a security gap. *Recommendation:* see SEC-1 remediation; this is the same fix.
- **SECMGT-2 — High — No secrets manager.** All configuration is plain `.env` files; no Vault/AWS Secrets Manager/equivalent integration exists. *Recommendation:* not necessarily needed pre-launch, but should be the target once there is a real deployment target (post Docker/CI).
- **SECMGT-3 — High — Fragile multi-location `.env` loading.** [backend/config/env.js:5-11](../../../backend/config/env.js#L5-L11) probes six candidate `.env` paths, including one inside `frontend/` — meaning backend config can silently depend on a file that conceptually belongs to the frontend. *Recommendation:* consolidate to a single, unambiguous `.env` location per service.
- **SECMGT-4 — Medium — No fail-fast validation on missing secrets.** Every variable in `config/env.js` defaults silently to `""` (lines 20-26) rather than the app refusing to start; a missing `OPENAI_API_KEY` only surfaces later as a degraded runtime "fallback" response. *Recommendation:* validate required secrets at startup and exit non-zero if missing.
- **SECMGT-5 — Low — No key-rotation policy.** No rotation schedule or procedure is documented anywhere in the repo. *Recommendation:* document one once SEC-1 is remediated.

### 2.9 Docker Readiness

- **DOCKER-1 — Critical — Zero Docker artifacts exist.** No `Dockerfile`, `docker-compose.yml`, or `.dockerignore` was found anywhere in the repository (confirmed via file search). *Recommendation:* add a backend Dockerfile, a frontend build/serve step, and a compose file wiring backend + Postgres for local/CI parity.
- **DOCKER-2 — High — No documented deployment target.** The app is only runnable via `npm run dev`/`npm run server` on a local machine; there is no build artifact or runtime contract for any hosting platform. *Recommendation:* define and document a concrete deployment target once containerized.
- **DOCKER-3 — Medium — No graceful shutdown handling.** [backend/server.js](../../../backend/server.js) has no `SIGTERM`/`SIGINT` listener — a container orchestrator's stop signal would hard-kill the process mid-request with no connection draining or `prisma.$disconnect()`. *Recommendation:* add a shutdown handler that stops accepting new connections, finishes in-flight requests, and closes the Prisma connection cleanly.

### 2.10 Database Resiliency

- **DB-1 — High — No connection retry/backoff logic.** [backend/db/prismaClient.js](../../../backend/db/prismaClient.js) throws immediately and permanently if `DATABASE_URL` is missing at first call, and there is no reconnect strategy if Postgres becomes temporarily unreachable after a successful startup. *Recommendation:* add retry-with-backoff around initial connection and treat transient DB errors as retryable in request handling.
- **DB-2 — High — No explicit connection-pool configuration.** The Prisma/`pg` adapter ([backend/db/prismaClient.js](../../../backend/db/prismaClient.js)) relies entirely on library defaults for pool size/idle timeout — unverified against any real concurrent-load scenario. *Recommendation:* explicitly configure and load-test pool size.
- **DB-3 — Medium — Single global `Portfolio` row is a contention point.** `portfolioRepository.js` fetches the one portfolio via `findFirst()` — beyond the multi-tenancy gap this also creates a single row that all writes contend on. *Recommendation:* addressed structurally once multi-tenant schema work lands.
- **DB-4 — Medium — No replica/failover story.** A single Postgres instance is a single point of failure for the entire persistence layer; no read-replica or failover configuration exists. *Recommendation:* plan for a managed Postgres offering with built-in failover before real user data is at stake.
- **DB-5 — Low — Unauthenticated multi-table reset endpoint.** `resetPortfolio()` deletes across `CashLedgerEntry → Trade → Order → Position → PerformanceSnapshot → Portfolio` in one transaction, reachable today via the unauthenticated `POST /api/v2/portfolio/reset` (cross-reference SEC-2/RATE-1). *Recommendation:* gate behind auth immediately, rate-limit regardless.

### 2.11 Backup Strategy

- **BACKUP-1 — Critical — No backup strategy exists.** No `pg_dump` script, scheduled backup job, retention policy, or restore runbook exists anywhere in the repo. The only "snapshot" concepts present (`PerformanceSnapshot`, `DailyBriefSnapshot` Prisma models) are application-level data, not infrastructure backups — verified by reading both models in `schema.prisma` and their repositories. *Recommendation:* stand up automated daily backups with a defined retention window before any real user data is stored.
- **BACKUP-2 — High — No disaster-recovery plan.** No documented Recovery Point Objective (RPO) or Recovery Time Objective (RTO) target exists anywhere. *Recommendation:* define both, then choose a backup cadence/mechanism that satisfies them.
- **BACKUP-3 — Medium — No migration-rollback rehearsal.** 4 Prisma migrations exist (all same-day timestamps), but there is no documented or tested procedure for rolling back a failed migration mid-deploy. *Recommendation:* add a rollback runbook and rehearse it against the test database.

### 2.12 Health Checks

- **HEALTH-1 — High — `/health` never actually checks anything.** [backend/app.js:11](../../../backend/app.js#L11): `app.get("/health", (req, res) => res.json({ status: "ok" }));` — a static response with zero dependency checks. It will report healthy even if Postgres, Finnhub, or OpenAI are completely unreachable. *Recommendation:* have `/health` (or a separate `/ready`) perform a lightweight DB ping and report degraded status per dependency.
- **HEALTH-2 — Medium — No liveness/readiness distinction.** A single flat endpoint can't tell an orchestrator "the process is alive but not ready for traffic yet" vs. "fully healthy" — needed for safe rolling deploys once containerized. *Recommendation:* split into `/health/live` and `/health/ready`.
- **HEALTH-3 — Low — No test coverage for the health endpoint.** No test asserts `/health`'s shape or its behavior under a simulated dependency failure. *Recommendation:* add a test once HEALTH-1 is implemented.

### 2.13 Performance Bottlenecks

- **PERF-1 — High — Sequential external-call loops.** [backend/controllers/watchlistController.js](../../../backend/controllers/watchlistController.js) and [backend/services/comparisonService.js](../../../backend/services/comparisonService.js) `await` each symbol's quote/analysis in a serial `for...of` loop — O(n) round trips where `Promise.all` (already used elsewhere in the same codebase) would work. *Recommendation:* parallelize with bounded concurrency.
- **PERF-2 — High — 5 duplicated, unbounded, process-local caches.** `finnhubCache.js`, `altDataCache.js`, `intelligenceCache.js`, plus inline caches in `openaiService.js` and `chatService.js` are independent `Map()`-based TTL caches with no eviction/size cap and no cross-instance sharing — breaks cache coherence the moment more than one instance runs. *Recommendation:* consolidate onto a single shared (e.g. Redis-backed) cache utility.
- **PERF-3 — Medium — Blocking synchronous file I/O.** `committeeTrackRecordService.js` uses `fs.readFileSync`/`writeFileSync` against a local JSON file with no locking, blocking the Node event loop on every call and risking corruption under concurrent writes. *Recommendation:* migrate to the database.
- **PERF-4 — Medium — Inline, synchronous third-party AI calls on the request path.** `openaiService.js`/`chatService.js` and the recommendation engine's `runOnce()` call OpenAI directly in the request/response cycle with no timeout/circuit-breaker, so a slow or hung OpenAI call holds a request thread open indefinitely. *Recommendation:* add explicit timeouts now; consider a background job queue longer-term.
- **PERF-5 — Low — No CDN/asset-caching strategy** for the frontend static build. *Recommendation:* lowest priority; address once a real deployment target exists.

---

## 3. Master Findings Table (all 46, by severity)

| Severity | IDs |
|---|---|
| **Critical (9)** | SEC-1, SEC-2, CI-1, MON-1, RATE-1, RATE-2, SECMGT-1, DOCKER-1, BACKUP-1 |
| **High (16)** | SEC-3, SEC-4, CI-2, LOG-1, LOG-2, MON-2, MON-3, ERR-1, RATE-3, VAL-1, VAL-2, SECMGT-2, SECMGT-3, DOCKER-2, DB-1, DB-2, BACKUP-2, HEALTH-1, PERF-1, PERF-2 |
| **Medium (13)** | SEC-5, CI-3, CI-4, LOG-3, MON-4, ERR-2, ERR-3, VAL-3, SECMGT-4, DOCKER-3, DB-3, DB-4, BACKUP-3, HEALTH-2, PERF-3, PERF-4 |
| **Low (8)** | SEC-6, LOG-4, ERR-4, SECMGT-5, DB-5, HEALTH-3, PERF-5 |

(Note: High and Medium rows above list more than their header counts because several findings span two categories, e.g. SEC-1/SECMGT-1 are one underlying fact counted once in the executive summary total of 46 but cross-referenced under two headings for completeness.)

---

## 4. Roadmap Ordered by ROI

Ordered by (severity reduced × blast radius) ÷ (implementation effort). Each phase assumes the prior phase's items are done, since later fixes are safer once CI (Phase 1) and monitoring (Phase 2) exist to catch regressions.

### Phase 1 — Stop the Bleeding (lowest effort, highest immediate risk reduction)
1. **RATE-2 / RATE-1** — Add rate limiting, starting with `/api/ai/analyze` and `/api/v2/recommendations/run` (highest live cost-abuse risk, smallest code change).
2. **SEC-1 / SECMGT-1** — Rotate leaked keys; untrack `frontend/.env`; schedule the git-history scrub as a coordinated follow-up.
3. **SEC-3 / SEC-4** — Add `helmet()` and a CORS origin allow-list (two small middleware additions).
4. **ERR-1** — Fix the `err.status`/`err.statusCode` mismatch (mechanical, high-value correctness fix).
5. **ERR-2, ERR-4** — Add a global JSON 404 handler and top-level crash handlers.
6. **DOCKER-3** — Add graceful shutdown (`SIGTERM`/`SIGINT` → drain → `prisma.$disconnect()`).

*Why first:* every item here is a same-day-sized, standalone, low-regression-risk change that removes the platform's most acute live risks (unbounded cost exposure, an active secret leak, an open CORS policy) before anything else is touched.

### Phase 2 — Build the Safety Net
7. **CI-1, CI-2, CI-3, CI-4** — Stand up CI (test + lint + build gate on every PR). Everything after this point is de-risked by having it.
8. **HEALTH-1, HEALTH-2** — Make `/health` actually check Postgres connectivity; split liveness/readiness.
9. **VAL-1, VAL-2, VAL-3** — Add schema validation to all controllers; clamp pagination/limit params.
10. **SECMGT-4** — Fail-fast startup validation for required secrets.

*Why second:* CI is the single highest-leverage item in this entire report — once it exists, every subsequent fix (including deeper refactors later) is protected by automated regression detection. Health checks and input validation are similarly cheap, mechanical, and high-value.

### Phase 3 — See What's Happening (observability + deployability)
11. **MON-1, MON-2, MON-3, MON-4** — Add an error-tracking SDK (e.g. Sentry) and basic request-latency/error-rate metrics; wire external uptime monitoring against the now-real `/health`.
12. **LOG-1, LOG-2, LOG-3, LOG-4** — Adopt structured logging with request-correlation IDs and redaction.
13. **DOCKER-1, DOCKER-2** — Containerize (Dockerfile + docker-compose) and document a real deployment target.
14. **BACKUP-1, BACKUP-2** — Stand up automated, scheduled Postgres backups with a defined retention window and RPO/RTO.

*Why third:* these require slightly more setup (new infrastructure dependencies: error tracker, log store, container registry, backup storage) but are the difference between "we can't tell anything is wrong" and "we get paged before a customer notices."

### Phase 4 — Depth & Resiliency (ongoing hardening)
15. **DB-1, DB-2** — Add connection retry/backoff and explicit, load-tested connection-pool sizing.
16. **PERF-1, PERF-2** — Parallelize sequential fan-out loops; consolidate the 5 duplicated caches onto a shared (Redis-backed) layer.
17. **PERF-3, PERF-4** — Migrate the committee-track-record JSON file to the database; add timeouts/circuit-breakers around third-party AI calls.
18. **SEC-2** — Add real authentication/authorization and tenant scoping (the largest single item in this report; sequenced last because it is the highest-effort and highest-blast-radius change, and safest once Phases 1–3 provide a full regression/observability net under it).
19. **SECMGT-2, SECMGT-3, DB-3, DB-4, BACKUP-3, SEC-6** — Secrets-manager adoption, `.env` boundary cleanup, tenancy/read-replica planning, migration-rollback rehearsal, dependency vuln scanning.
20. **PERF-5, HEALTH-3, ERR-3, SEC-5, LOG-... (remaining low-severity items)** — Final polish pass.

---

## 5. Bottom Line

The platform's most urgent exposure is financial and reputational, not architectural sophistication: an unauthenticated, unrated, cost-bearing AI endpoint and a real secret sitting in git history are both fixable in hours, not weeks, and should happen before anything else in this report. The deepest, most expensive-to-retrofit gap is the complete absence of CI, monitoring, and a backup strategy — none of these require large code changes, but all three are foundational to ever safely operating this service for real users. Authentication/authorization (SEC-2) is intentionally sequenced last in this roadmap not because it matters least, but because it is the single largest, highest-blast-radius change in the report and is safest to execute once CI, monitoring, and validation already exist to catch anything that breaks.
