# Sprint 17 Master Plan — Platform Hardening & Production Readiness

**Status:** Planning document only. No application code, database schema, or migrations were modified to produce this document. Nothing in this document has been committed on the requester's behalf.
**Scope of assessment:** Committed code and documentation on the current branch (`sprint-16-live-data`) as of 2026-07-11.
**Audience:** Engineering leadership preparing ImpactOne for a production launch that must hold up under real user load, institutional-investor due diligence, and future AI-agent consumers of the API.

---

## 0. Method

This plan is based on a fresh read of the committed source (`backend/`, `frontend/`), the Prisma schema and migrations, the test suites, `package.json` files, and 15+ existing planning/review docs already in the repo (`ARCHITECTURE.md`, `CODE_REVIEW.md`, `IMPACTONE_CTO_REVIEW.md`, `PHASE_C_AUDIT.md`, `PHASE_C_REVIEW.md`, `PHASE_D_REVIEW.md`, `SCALABILITY_REPORT.md`, `PRODUCT_GAP_ANALYSIS.md`, `API_CONTRACTS.md`, `TEST_PLAN.md`, `UX_RECOMMENDATIONS.md`, `docs/architecture.md`, `docs/PROJECT_STATUS.md`). Where those docs already independently converge on a finding (e.g. "no auth exists"), that convergence is treated as strong evidence and cited. Where docs conflict or are stale, this plan states the more current, code-verified fact and flags the conflict for cleanup (see N2).

Two facts were independently verified against the live repo rather than taken only from prior docs:
- `git ls-files | grep .env` → **`frontend/.env` is tracked in git** despite `.gitignore` listing `.env` — confirming the previously-reported secret-leak finding is real, not stale. (Key values were not printed or inspected further.)
- Root `package.json` scripts confirm `test`, `test:backend`, `test:frontend` exist but there is no `lint`, `typecheck`, or CI script anywhere in the repo.

---

## 1. Executive Summary

ImpactOne is a **well-engineered single-tenant prototype** with a genuinely sophisticated intelligence/recommendation surface (event pipeline, committee debate, alt-data fusion, autonomous recommendation engine with decision traces), a real transactional portfolio engine on Postgres/Prisma, and a growing (135-test) automated test suite. It is **not yet a platform**: there is no authentication, no multi-tenancy, no CI/CD, no rate limiting, no containerization, and a real (already-committed) secret leak. These are not edge-case gaps — they are the exact items that block "millions of users, institutional investors, and AI agents" from being viable audiences.

| Dimension | Current state | Verdict |
|---|---|---|
| Backend architecture | Express + layered controllers/services, no auth boundary, in-process caching, mixed error-status handling | Functional, not production-hardened |
| Frontend architecture | React/Vite, no router, no global state store (localStorage + window events), one 712-line mega-screen | Functional, maintainability debt accumulating |
| Database schema | Postgres/Prisma, correct `Decimal` money types, good indexes on new tables, but **zero `userId`/tenant column anywhere**, single global `Portfolio` row | Solid schema design, wrong tenancy model for launch |
| API contracts | ~45 endpoints, `/api` (mock legacy) and `/api/v2` (real) coexist, no consistent envelope, **every endpoint documented as "Authentication requirements: None"** | Needs contract discipline before external consumers (incl. AI agents) rely on it |
| Performance | Sequential per-symbol loops, 5 duplicated in-process TTL caches, synchronous OpenAI calls on request path | Will not survive concurrent load |
| Security | No auth, no rate limiting, wildcard CORS, leaked keys tracked in git history, inconsistent error-status mapping | **Not production-safe today** |
| Scalability | Every cache/scheduler/JSON-file store is process-local — cannot run >1 instance correctly | Blocks horizontal scaling entirely |
| Maintainability | No TypeScript, no ESLint/Prettier anywhere, 5x duplicated cache pattern, dead legacy v1 portfolio mock | Debt is manageable now, compounding |
| Test coverage | 135 tests (89 backend / 46 frontend), but roughly half the backend service layer and the largest frontend screen have zero coverage, and there is no CI to enforce any of it | Good instinct, no safety net |
| Developer experience | No CI, no lint, deps pinned to `"latest"`, secrets loaded from 6 candidate `.env` paths with silent `""` fallback | Fragile onboarding, invisible failures |
| Production readiness | No Dockerfile, no docker-compose, no deployment target, no CI, no observability/logging strategy beyond `console.log` | **Not deployable as-is** |

**Bottom line:** the recommendation-engine sophistication is ahead of the operational foundation. Sprint 17 exists to close that gap — not to build new intelligence features — before Sprint 18+ resumes product work on a platform that can actually carry paying/institutional users and machine clients safely.

---

## 2. Architectural Assessment (by dimension)

### 2.1 Backend architecture
Express app (`backend/app.js`) → `routes/index.js` → controllers → services → Prisma. The layering itself is sound and consistently applied (15 controllers, all using try/catch → `next(error)`). Two structural problems undercut it:
- **Dual portfolio systems coexist live**: `GET /api/portfolio` (`portfolioController.js`) returns hardcoded mock data while `GET /api/v2/portfolio` (`portfolioEngineService.js`) is the real, Prisma-backed engine — acknowledged even in the v2 integration test's own comments as "legacy... untouched."
- **`backend/middleware/errorHandler.js` reads `err.status`, but every service throws `error.statusCode`** — meaning any controller that doesn't manually re-check `statusCode` first returns HTTP 500 for what should be 400/404/502. Roughly 7 of 15 controllers are affected.

### 2.2 Frontend architecture
React 18 + Vite, no `vite.config.js` (pure defaults), no router (hand-rolled `activeView` string switch in `MainLayout.jsx`), no global state library — shared state (watchlist, virtual portfolio) flows through `localStorage` + `window.dispatchEvent(CustomEvent)`, a workable but non-standard pub/sub. API access is mostly centralized through `apiClient.js` and 9 domain modules, with two components bypassing it via raw `fetch`. `AiAnalysisScreen.jsx` (712 lines) is the single largest maintainability risk in the codebase — it mixes an inline SVG chart, ~12 `useState` calls, and 4 different API modules in one file. Only one screen (`GlobalIntelligenceScreen`) is lazy-loaded; everything else ships in the initial bundle.

### 2.3 Database schema
Postgres via Prisma 7 (driver-adapter model). Schema quality is genuinely good where it exists: `Decimal(18,6)` for money (not `Float`), sensible composite indexes (`[portfolioId, symbol]`, `[portfolioId, createdAt]`), cascade deletes on the portfolio aggregate. The structural problem is tenancy, not schema hygiene: **no table has a `userId`/`tenantId` column**, `portfolioRepository.findDefaultPortfolio()` uses `findFirst()` against a single global row, and `DailyBriefSnapshot` is keyed uniquely by `date` alone (one snapshot for the entire system, for all users). All 4 Prisma migrations are timestamped the same day — the entire persistence layer is new and has not been through a schema-evolution cycle yet.

### 2.4 API contracts
~45 endpoints across `/api/*` (unversioned/legacy) and `/api/v2/*` (portfolio engine, recommendations). No consistent response envelope (`{ symbol, quote }` vs `{ watchlist: [] }` vs `{ portfolio: {} }` vs flat fields). `API_CONTRACTS.md` documents **every single endpoint as "Authentication requirements: None,"** and that statement is accurate against the code. This matters doubly for this platform's stated ambition: institutional investors and "future AI agents" consuming this API as a data/execution surface both require an auth and versioning contract they can trust not to break silently.

### 2.5 Performance bottlenecks
- Sequential (non-parallel) `for...of` + `await` loops over per-symbol external calls in `watchlistController.js` and `comparisonService.js` — O(n) round trips where `Promise.all` (already used elsewhere in the same codebase, e.g. `aiController.js`) would work.
- Five independent, near-identical in-process `Map()` TTL-cache implementations (`finnhubCache.js`, `altDataCache.js`, `intelligenceCache.js`, plus inline caches in `openaiService.js` and `chatService.js`) — no eviction/LRU/size cap, and **process-local**, meaning a second server instance simply re-pays every cache miss independently.
- `committeeTrackRecordService.js` persists to a local JSON file via synchronous `fs.readFileSync`/`writeFileSync` — blocks the event loop, has no file locking, and does not survive/replicate across container instances.
- Synchronous, inline OpenAI calls sit directly on user-facing request paths (`aiController.js`, `chatService.js`, recommendation `runOnce()`), with no timeout/circuit-breaker/queue between the request and the paid third-party call.

### 2.6 Security
This is the area furthest from production-ready:
- **No authentication or authorization anywhere** — confirmed unanimously by every prior review doc and by direct code inspection (`cors()` + `express.json()` with zero auth middleware in `app.js`).
- **`cors()` is called with no options**, which allows any origin — combined with no auth, any third-party page can script-call every endpoint, including `POST /api/v2/portfolio/reset` and `POST /api/v2/portfolio/orders`, from a victim's browser.
- **`frontend/.env` is tracked in git today** (verified directly, not just cited from prior docs) and contains backend-style secret variable names (`FINNHUB_API_KEY`, `OPENAI_API_KEY`) inside a frontend-scoped file — a live, committed secret-leak risk regardless of whether the current `.gitignore` would prevent a *new* copy.
- No rate limiting anywhere, and two endpoints in particular (`POST /api/ai/analyze`, `POST /api/v2/recommendations/run`) fan out to paid OpenAI/Finnhub calls with zero cost-abuse protection.
- No input-validation library; ad hoc `Number()`/`String()` coercion means a malformed `?limit=` query becomes `NaN` and is passed straight into a Prisma `take`.
- No security headers (Helmet), no dependency vulnerability scanning (no `npm audit`/Dependabot config found), no secrets manager — six candidate `.env` file paths are probed at startup with silent `""` fallback on anything missing.

### 2.7 Scalability
Every piece of server-held state that isn't in Postgres is **process-local**: the 5 TTL caches, the `node-cron` scheduler (`AUTONOMOUS_ENGINE_ENABLED`), and the committee-track-record JSON file. Running more than one backend instance today would silently produce duplicate scheduled runs, inconsistent cache state between instances, and file-write races. The single global `Portfolio` row (no tenancy) means the system cannot scale to more than one real user account by design, independent of infrastructure — this is the deepest blocker, deeper than infrastructure scaling.

### 2.8 Maintainability
No TypeScript, no ESLint/Prettier config anywhere in the repo (front or back). Real duplication exists (5x TTL-cache pattern, a duplicated `parseCsv()` helper across two controllers, `clamp()`/`unique()` reimplemented in 6 different service files despite a `backend/utils/` convention already existing). Largest files (`autonomousMarketService.js` at ~738 lines, `AiAnalysisScreen.jsx` at 712 lines) mix multiple responsibilities and are the natural next refactor targets once behavior is locked in by tests.

### 2.9 Test coverage
135 tests total (89 backend across 12 files, 46 frontend across 11 files) is a real, non-trivial base — but coverage is concentrated on the newest features (recommendation engine, portfolio engine, dashboard). Roughly half the backend service layer has **zero** test coverage, including `aiController`, `watchlistController`, `finnhubService`, `investmentCommitteeService`, and the entire alt-data/news pipeline. On the frontend, the single largest file (`AiAnalysisScreen.jsx`) and every API service module have zero tests. There is no coverage-percentage tool configured (no `c8`/`nyc`), and — most importantly — **no CI runs any of these tests automatically**; they only execute when a human remembers to run them locally.

### 2.10 Developer experience
Env-var handling is fragile (6 candidate `.env` locations, no schema validation, silent fallback to empty string). Frontend dependencies (`react`, `react-dom`, `vite`, `@vitejs/plugin-react`) are pinned to `"latest"` rather than fixed semver, which is a reproducibility risk. `.env.example` in `frontend/` is a good practice, undermined by the real `.env` also being tracked. No linting/formatting means style and correctness drift are currently unchecked.

### 2.11 Production readiness
No Dockerfile, no docker-compose, no CI/CD workflow of any kind, no observability (structured logs, request IDs, latency/error metrics), and no deployment target documented anywhere in the repo. This is the single biggest gap between the current repo and "production."

---

## 3. Top 20 Highest-ROI Improvements

Each item lists: Why it matters · Business impact · Technical impact · Risk level (of doing the work) · Estimated effort (relative sizing, not a calendar commitment) · Dependencies · Expected measurable benefit.

### CRITICAL — must do before production

**C1. Rotate & purge leaked API keys from git history; add secret scanning to prevent recurrence**
- *Why it matters:* `frontend/.env` is currently tracked in git with backend-style secret keys. This is an active exposure, not a theoretical risk.
- *Business impact:* A leaked, unrotated key is a direct path to unexpected third-party billing (OpenAI/Finnhub) and a serious trust/compliance red flag for any institutional due-diligence review.
- *Technical impact:* Requires key rotation at the provider, `git rm --cached` + history rewrite (BFG or `git filter-repo`) if the repo is or will be shared, and a CI secret-scanning gate (e.g. gitleaks) to catch recurrence.
- *Risk level:* Low technical risk, but history rewriting requires coordinating with anyone with an existing clone (force-push implications) — needs explicit sign-off before rewriting shared history.
- *Estimated effort:* S (rotation + `.gitignore`/untracking) + M (history scrub, coordination) — treat as two sub-tasks.
- *Dependencies:* None — can start immediately, in parallel with everything else.
- *Expected measurable benefit:* Zero live secrets in git history (verified by secret-scan CI job passing); zero unrotated provider keys.

**C2. Introduce authentication & authorization foundation + tenant scoping**
- *Why it matters:* Every endpoint is currently public and every table is single-tenant (`findFirst()` on a global `Portfolio`). No institutional user, and no safe multi-user rollout, is possible without this.
- *Business impact:* This is the single largest unlock for going from "one shared demo" to "an actual product with accounts" — it's a precondition for billing, personalization, and institutional trust.
- *Technical impact:* Add a `User` model, session/JWT auth middleware, `userId` FK on `Portfolio`/`Recommendation`/watchlist persistence, and an auth-required middleware slot applied selectively (not globally, to avoid a big-bang break).
- *Risk level:* High — touches almost every table and every controller; must be sequenced carefully (additive columns first, enforcement second) to avoid breaking existing flows mid-migration.
- *Estimated effort:* XL — the largest single item in this plan; plan to phase it (schema + auth service first, enforcement second, migration of existing single-tenant data third).
- *Dependencies:* Should land after C5 (CI) exists, so the migration is protected by automated tests as it lands.
- *Expected measurable benefit:* 100% of write endpoints require a valid identity; `Portfolio` (and other core tables) are queried by `userId`, not `findFirst()`; zero regressions in existing single-tenant flows (covered by pre-existing + new tests).

**C3. Lock down the API surface: rate limiting, security headers, CORS allow-list**
- *Why it matters:* `cors()` currently allows any origin, and paid-API-backed endpoints (`/api/ai/analyze`, `/api/v2/recommendations/run`) have no cost-abuse protection.
- *Business impact:* Prevents a single script from a malicious page or a scraping bot from running up OpenAI/Finnhub bills or hammering the DB — directly protects the P&L of running this service.
- *Technical impact:* Add `helmet()`, an explicit CORS origin allow-list (env-driven per deployment), and `express-rate-limit` (or equivalent) tiered by endpoint cost (tighter limits on AI/recommendation routes).
- *Risk level:* Low — additive middleware, easy to test and roll back independently per middleware.
- *Estimated effort:* S–M.
- *Dependencies:* None.
- *Expected measurable benefit:* All responses carry standard security headers; CORS rejects unlisted origins (verified by an automated test); AI/recommendation endpoints return `429` above a defined request budget.

**C4. Fix the error-handling contract bug + stop leaking internal error detail**
- *Why it matters:* `errorHandler.js` reads `err.status`, but services throw `error.statusCode` — so ~7 of 15 controllers silently return `500` for what should be `400`/`404`/`502`. Separately, at least one internal message (`prismaClient.js`'s "DATABASE_URL is missing..." string) would be echoed verbatim to any API caller if DB config breaks.
- *Business impact:* Correct status codes are a baseline expectation for any API consumer — especially the "future AI agents" this platform wants to serve, which will branch logic on status codes.
- *Technical impact:* Standardize on one property name (`statusCode`) across the codebase, sweep all 15 controllers to confirm consistent `next(error)` behavior, and ensure `errorHandler.js` never forwards a message containing internal config/path detail (map known internal errors to a generic "service unavailable" message).
- *Risk level:* Low — small, mechanical, fully covered by adding one contract test per controller status path.
- *Estimated effort:* S.
- *Dependencies:* None; ideally lands before C2/C6 so those changes inherit correct error semantics.
- *Expected measurable benefit:* 100% of controllers return the status code their service layer intended (asserted by a new contract test suite); zero internal strings observable in any error response body.

**C5. Stand up a CI pipeline (lint + test + build gate on every PR)**
- *Why it matters:* 135 tests currently only run when a human remembers to. There are zero CI workflows in the repo today.
- *Business impact:* CI is the cheapest insurance policy available against regressions reaching production, and it is a hard prerequisite for any credible claim of "production readiness" to an institutional buyer's technical diligence team.
- *Technical impact:* Add a GitHub Actions workflow: install → `npm run test:backend` (against an ephemeral Postgres service container) → `npm run test:frontend` → `npm run build` (frontend) → (once M4 lands) lint. Branch-protection rule requiring the workflow to pass before merge.
- *Risk level:* Low — purely additive, no application code touched.
- *Estimated effort:* M (mostly the ephemeral test-DB wiring for backend integration tests).
- *Dependencies:* None to start; every other item in this plan becomes safer once this exists, so it should land as early as practically possible.
- *Expected measurable benefit:* 100% of PRs run the full test suite automatically; merge blocked on red CI; time-to-detect a regression drops from "whenever someone notices" to "before merge."

**C6. Add request input validation & fail-fast environment/secret validation**
- *Why it matters:* Controllers currently do ad hoc `Number()`/`String()` coercion (a bad `?limit=` becomes `NaN` straight into Prisma); `config/env.js` silently defaults every missing secret to `""` rather than failing startup.
- *Business impact:* Prevents a whole class of malformed-input bugs and "why did this silently return empty data in production" incidents that are expensive to diagnose after the fact.
- *Technical impact:* Adopt a schema-validation library (e.g. `zod`) for (a) request query/body validation at the controller boundary and (b) a startup-time env schema that throws immediately if a required secret is missing, instead of deferring to a runtime "fallback" response.
- *Risk level:* Medium — touches many controllers, but mechanically similar in each, and safe to land incrementally endpoint-by-endpoint behind the new CI safety net.
- *Estimated effort:* M–L (broad but shallow — one controller at a time).
- *Dependencies:* Best done after C5 (CI) so each incremental controller change is verified automatically.
- *Expected measurable benefit:* Invalid input returns a `400` with a clear message instead of propagating `NaN`/`undefined`; missing required secrets fail app startup with a clear error instead of silently degrading in production.

**C7. Retire the legacy mock `/api/portfolio` v1 endpoint and formalize an API versioning/deprecation policy**
- *Why it matters:* A hardcoded mock portfolio endpoint and the real Prisma-backed v2 engine currently coexist with no deprecation plan — an integration test literally documents this as intentional, unresolved debt. Meanwhile most of the API (`/api/news`, `/api/watchlist`, `/api/ai`, `/api/intelligence/*`, etc.) has no version segment at all.
- *Business impact:* Institutional consumers and AI agents both need a stable, documented versioning contract to build against without fear of silent breakage — this is table stakes for being treated as infrastructure rather than a demo.
- *Technical impact:* Remove (or explicitly mark `deprecated`, returning a `Deprecation` header) the mock `/api/portfolio`; write down and apply one versioning convention (`/api/v1` for everything, with `/api/v2` reserved for genuine breaking changes) across all route files.
- *Risk level:* Low–Medium — small blast radius (the mock endpoint appears unused by the current frontend, which reads from `/api/v2/portfolio` via `usePortfolioEngine`), but confirm no remaining caller before removal.
- *Estimated effort:* S–M.
- *Dependencies:* Confirm via `grep`/CI test run that nothing still depends on the legacy endpoint before deleting it.
- *Expected measurable benefit:* One documented, applied versioning convention; zero endpoints returning hardcoded mock data; `API_CONTRACTS.md` accurately reflects the live route table (closing a documentation/code conflict flagged in prior reviews).

### HIGH ROI

**H1. Replace 5 duplicated in-process TTL caches with a shared Redis cache layer**
- *Why it matters:* `finnhubCache.js`, `altDataCache.js`, `intelligenceCache.js`, plus inline caches in `openaiService.js` and `chatService.js` are five independent reimplementations of the same pattern, and all are process-local — meaning a second backend instance re-pays every cache miss and caches drift out of sync between instances.
- *Business impact:* Directly unlocks horizontal scaling (more instances = more capacity, not more inconsistency) and reduces paid third-party API spend (Finnhub/OpenAI) via shared cache hits across instances.
- *Technical impact:* Introduce Redis (or a managed equivalent) and a single shared cache utility with TTL + optional LRU size cap; migrate the 5 call sites onto it one at a time behind the existing test suite.
- *Risk level:* Medium — new infrastructure dependency, but each call site can be migrated and verified independently.
- *Estimated effort:* L.
- *Dependencies:* Best done after C5 (CI) and H5 (containerization, so Redis has an obvious place to run in dev/CI too).
- *Expected measurable benefit:* Cache hit-rate becomes consistent across instances; measurable drop in duplicate provider calls once instance count > 1; foundation for future rate-limit/session storage reuse of the same Redis instance.

**H2. Parallelize/bound sequential external-call fan-out**
- *Why it matters:* `watchlistController.js` and `comparisonService.js` `await` each symbol's quote + analysis sequentially in a loop — for N symbols that's 2N sequential round trips, while `aiController.js` already demonstrates the `Promise.all` pattern elsewhere in the same codebase.
- *Business impact:* Directly reduces perceived latency for the watchlist and comparison features, which scale with how many tickers a user tracks — exactly the feature institutional/power users will stress hardest.
- *Technical impact:* Replace `for...of` + serial `await` with `Promise.all`/`Promise.allSettled` plus a small bounded-concurrency limiter (e.g. `p-limit`) to avoid overwhelming the upstream provider on very large watchlists.
- *Risk level:* Low — localized, mechanical change, easy to unit test before/after latency.
- *Estimated effort:* S–M.
- *Dependencies:* None.
- *Expected measurable benefit:* Watchlist/comparison response time scales with the slowest single call instead of the sum of all calls (e.g. an N=10 watchlist drops from ~10x single-call latency to ~1x).

**H3. Migrate committee track record off a synchronous local JSON file into the database**
- *Why it matters:* `committeeTrackRecordService.js` uses blocking `fs.readFileSync`/`writeFileSync` with no file locking against `backend/data/committeeTrackRecord.json` — this blocks the Node event loop, risks corruption under concurrent writes, and simply does not exist consistently across multiple container instances.
- *Business impact:* Investment-committee decision history is exactly the kind of auditable record an institutional user would expect to survive a deploy/restart and be consistent regardless of which instance served the request.
- *Technical impact:* Add a `CommitteeDecision`-style table (schema design only in this plan — implementation happens in Sprint 17 execution, not in this document) and port read/write calls to Prisma, matching the existing repository pattern already used for portfolio/recommendation data.
- *Risk level:* Medium — requires a data migration for existing JSON history if it must be preserved.
- *Estimated effort:* M.
- *Dependencies:* Should follow the same schema/migration discipline established by C2's tenancy work, ideally landing after it so the new table can be tenant-scoped from day one instead of needing a second migration later.
- *Expected measurable benefit:* Zero blocking file I/O on the request path; committee history durable and consistent across any number of instances; no possible file-corruption incident under concurrent access.

**H4. Close backend test-coverage gaps on core untested services + add coverage gating**
- *Why it matters:* Roughly half the backend service layer — including `aiController`, `watchlistController`, `finnhubService`, `investmentCommitteeService`, and the entire alt-data/news pipeline — has zero automated test coverage today.
- *Business impact:* These are exactly the services most exposed to third-party flakiness (Finnhub/NewsAPI/OpenAI) and most likely to break silently; untested code in the "AI investment platform" core is a direct trust risk if it misbehaves in front of a paying/institutional user.
- *Technical impact:* Add unit tests (with provider mocking) for the untested services listed above, and add a coverage tool (`c8`) with a minimum-threshold check wired into the C5 CI pipeline (fail the build below a floor, e.g. 70%, ratcheting upward over time).
- *Risk level:* Low — purely additive test code.
- *Estimated effort:* L (breadth across many files, but mechanically similar work).
- *Dependencies:* C5 (CI) should exist first so the new coverage gate has somewhere to run.
- *Expected measurable benefit:* Backend coverage floor enforced in CI (e.g. ≥70%, ratcheting up sprint over sprint); zero previously-silent regressions in the newly-covered services going forward.

**H5. Containerize the application (Dockerfile + docker-compose) for dev/prod parity**
- *Why it matters:* There is no Dockerfile, no docker-compose, and no documented deployment target anywhere in the repo today — this is the single largest gap between "runs on my machine" and "production."
- *Business impact:* Containerization is a near-universal prerequisite for any modern hosting target (and a checkbox item in almost every institutional technical-diligence questionnaire); it also fixes the "6 candidate `.env` file" fragility by making environment configuration explicit and reproducible.
- *Technical impact:* Add a backend Dockerfile, a frontend build/serve Dockerfile (or static-asset build step), and a `docker-compose.yml` wiring backend + Postgres (+ Redis once H1 lands) for local dev and CI parity.
- *Risk level:* Low–Medium — additive, but must be validated against the real app/test-suite behavior (especially DB connectivity) before being trusted.
- *Estimated effort:* M.
- *Dependencies:* Benefits from C6 (env validation) landing first, so a misconfigured container fails fast with a clear message rather than a silent `""` fallback.
- *Expected measurable benefit:* `docker compose up` reproduces the full stack (API + DB) from a clean machine with zero manual `.env` hunting; CI can run integration tests against the same container definition used in dev, closing a dev/prod parity gap.

**H6. Pin dependency versions and add automated vulnerability scanning**
- *Why it matters:* `react`, `react-dom`, `vite`, and `@vitejs/plugin-react` are pinned to `"latest"` in `frontend/package.json` — a fresh install today vs. six months from now can silently pull a different major version. There is also no `npm audit`/Dependabot configured anywhere.
- *Business impact:* Removes an invisible reproducibility/supply-chain risk and gives institutional security reviewers a clean, auditable dependency story instead of "whatever `latest` resolved to on install day."
- *Technical impact:* Replace `"latest"` with fixed semver ranges across `frontend/package.json` (and audit `backend/package.json` for the same pattern); enable Dependabot (or `npm audit` in CI) to flag known vulnerabilities on a schedule.
- *Risk level:* Low — mechanical version pinning; verify the app still builds/tests green against the pinned versions.
- *Estimated effort:* S.
- *Dependencies:* None; benefits from landing alongside C5 (CI) so any resulting build break is caught immediately.
- *Expected measurable benefit:* Zero `"latest"` version specifiers in any `package.json`; automated weekly/PR-triggered vulnerability report with zero unacknowledged high/critical findings.

### MEDIUM ROI

**M1. Introduce a background job queue for AI/recommendation workloads**
- *Why it matters:* OpenAI calls in `aiController.js`/`chatService.js` and the recommendation engine's `runOnce()` currently execute inline and synchronously on (or adjacent to) the request path, with no queue, retry, or backpressure mechanism.
- *Business impact:* Decoupling expensive AI work from the request/response cycle improves perceived responsiveness and gives the platform a place to add retry/backoff and cost controls as usage grows.
- *Technical impact:* Introduce a job queue (e.g. BullMQ on the Redis instance from H1) for the recommendation `run` workflow and any other multi-second AI calls; expose a status-polling or webhook pattern to the frontend instead of a blocking HTTP call.
- *Risk level:* Medium — changes the request/response contract for affected endpoints (sync → async), requires frontend updates to match.
- *Estimated effort:* L.
- *Dependencies:* H1 (Redis) should land first, since the queue needs a broker.
- *Expected measurable benefit:* `/api/v2/recommendations/run` and equivalent long-running AI calls return immediately with a job handle instead of blocking; measurable reduction in request-thread time held open per AI call.

**M2. Add real client-side routing (React Router) + lazy-load all screens**
- *Why it matters:* Navigation today is a hand-rolled `activeView` string with no URL sync — no deep-linking, no shareable links, no back-button support — despite `react-router-dom` already being an installed, unused dependency. Only one screen is currently lazy-loaded.
- *Business impact:* URL-addressable screens are expected UX for any serious web product (shareable links to a specific ticker's analysis, browser back/forward, bookmarking) and matter directly for institutional users who often work across many open tabs/links.
- *Technical impact:* Wire up `react-router-dom` (already a dependency) to replace the `screenMap`/`activeView` pattern in `MainLayout.jsx`, and convert every screen import to `React.lazy()` (currently only one is).
- *Risk level:* Medium — touches the app shell and every screen's mount path; needs careful regression testing against existing screen-level tests.
- *Estimated effort:* M.
- *Dependencies:* Best done after M3 partially decomposes `AiAnalysisScreen.jsx`, so the router change isn't entangled with a simultaneous large refactor.
- *Expected measurable benefit:* Every screen is independently addressable by URL and code-split; initial bundle size drops measurably (currently ~298 KB single main chunk with one split) as each screen becomes its own lazy chunk.

**M3. Decompose the largest files into smaller, single-responsibility modules**
- *Why it matters:* `AiAnalysisScreen.jsx` (712 lines, 4 API modules, an inline SVG chart, ~12 `useState` calls) and `autonomousMarketService.js` (~738 lines mixing event classification, scoring, global-map building, alpha discovery, and news-query construction) are the two clearest maintainability hotspots in the repo.
- *Business impact:* Every future feature or bug fix touching these files currently pays a "understand 700+ lines of mixed concerns" tax — this compounds as the team and codebase grow.
- *Technical impact:* Extract the chart, the form, and each data-fetching section of `AiAnalysisScreen.jsx` into their own components/hooks; split `autonomousMarketService.js` along its existing internal concern boundaries (event pipeline, scoring, global map, alpha discovery) into separate service files.
- *Risk level:* Medium — pure refactor risk (behavior must not change), mitigated by the existing/expanded test suite (H4) acting as a regression net.
- *Estimated effort:* L.
- *Dependencies:* Should land after H4 (test coverage) so the refactor has a safety net; ideally before M2 (routing) touches the same screen.
- *Expected measurable benefit:* No single frontend screen or backend service file exceeds a defined line-count threshold (e.g. 300 lines) post-refactor; time-to-onboard a new contributor to either file drops materially (qualitative, but trackable via PR review time on subsequent changes).

**M4. Add ESLint + Prettier across frontend and backend, enforced in CI**
- *Why it matters:* There is no linting or formatting configuration anywhere in the repo today, despite multiple contributors and a growing codebase.
- *Business impact:* Consistent style and automated correctness checks (unused vars, obvious bugs) reduce review overhead and prevent a class of bugs from ever reaching review.
- *Technical impact:* Add `eslint.config.js` (flat config) + Prettier config to both `frontend/` and `backend/`; wire `npm run lint` into the C5 CI workflow; consider `eslint-plugin-jsx-a11y` for the frontend given the currently thin accessibility coverage.
- *Risk level:* Low — mostly config plus a one-time "fix existing lint errors" pass.
- *Estimated effort:* M (config is quick; cleaning up pre-existing violations across the whole codebase is the larger part).
- *Dependencies:* C5 (CI) should exist so lint is gated automatically once configured.
- *Expected measurable benefit:* Zero lint errors on `main`; lint runs on every PR; a11y-lint findings give a concrete backlog for N1.

**M5. Add structured logging & basic observability**
- *Why it matters:* Logging today is unstructured `console.log`, including verbose request/response bodies in `aiController.js` and `openaiService.js` (up to 4000 chars) with no redaction — a real concern once any user-identifying data enters context post-C2.
- *Business impact:* Structured logs with request IDs and latency/error metrics are the difference between "we can debug a production incident in minutes" and "we cannot tell what happened" — non-negotiable once real users depend on uptime.
- *Technical impact:* Adopt a structured logger (e.g. `pino`), attach a request-correlation ID middleware, redact sensitive fields, and emit basic latency/error-rate metrics per route (even simple counters to start, ahead of a full APM later).
- *Risk level:* Low — additive, replaces `console.log` call sites incrementally.
- *Estimated effort:* M.
- *Dependencies:* Should follow C2 (auth) so redaction rules account for user-identifying fields once they exist.
- *Expected measurable benefit:* Every request traceable by a correlation ID end-to-end in logs; zero raw request/response bodies logged unredacted; p50/p95 latency per route becomes an observable number for the first time (currently zero instrumentation exists anywhere per the Scalability Report).

### NICE TO HAVE

**N1. Per-screen error boundaries + accessibility pass**
- *Why it matters:* Only the AI Analysis screen has a dedicated error boundary today; every other screen falls back to the single app-level boundary, meaning any render error anywhere else takes down the entire UI. Accessibility coverage is thin (~12 `aria-*`/`role=` occurrences across the whole app).
- *Business impact:* Isolates failures to one screen instead of the whole app (better perceived reliability); broadens the usable audience and reduces legal/compliance risk associated with accessibility, which matters more, not less, for an institutional-facing product.
- *Technical impact:* Wrap each remaining screen in its own `ScreenErrorBoundary` (the component already exists and is proven on the AI Analysis screen); run the M4 a11y-lint output as a backlog and address the highest-traffic screens first.
- *Risk level:* Low.
- *Estimated effort:* S–M.
- *Dependencies:* M4 (for the a11y-lint backlog).
- *Expected measurable benefit:* A render error in any one screen no longer white-screens the entire app; measurable increase in `aria-*`/landmark-role coverage across primary screens.

**N2. Documentation consolidation**
- *Why it matters:* This assessment surfaced multiple stale/conflicting docs still live in the repo — `docs/architecture.md` and `README.md` describe a materially different, apparently vestigial product vision (Hebrew translation, Claude as the AI engine, a mobile app, a "Premium System," a "Learning Engine") that contradicts every other current doc (English-only, OpenAI-based, web-only, no billing yet); `docs/PROJECT_STATUS.md` is an early snapshot predating the DB/portfolio-engine work; `API_CONTRACTS.md` still lists `GET /api/intelligence/daily-brief/archive` as missing though it has existed (with integration tests) since Phase C; and "Sprint 16" is used with two different meanings across `MVP_IMPLEMENTATION_ROADMAP.md` and `IMPACTONE_CTO_REVIEW.md`.
- *Business impact:* Stale docs actively mislead anyone (including future AI coding agents) trying to establish ground truth about the system — exactly the audience this platform is being built to eventually serve as a first-class consumer.
- *Technical impact:* Archive or delete `docs/architecture.md`/`docs/PROJECT_STATUS.md` (or clearly mark them "historical, superseded by root `PROJECT_STATUS.md`"), correct the `API_CONTRACTS.md` entry, and resolve the "Sprint 16" naming collision by renumbering one of the two timelines in the affected docs.
- *Risk level:* Low — documentation-only change.
- *Estimated effort:* S.
- *Dependencies:* None; can happen at any point, sequenced last only because it's lowest-impact relative to the other 19 items.
- *Expected measurable benefit:* One unambiguous, current-state doc set; zero contradicting statements about the product's own architecture across the repo.

---

## 4. Priority Order (all 20, ranked)

| Rank | ID | Item | Tier |
|---|---|---|---|
| 1 | C1 | Rotate & purge leaked API keys + secret scanning | Critical |
| 2 | C3 | Rate limiting, security headers, CORS allow-list | Critical |
| 3 | C4 | Fix error-handling contract bug | Critical |
| 4 | C5 | Stand up CI pipeline | Critical |
| 5 | H6 | Pin dependency versions + vulnerability scanning | High |
| 6 | M4 | ESLint + Prettier enforced in CI | Medium |
| 7 | H4 | Close backend test-coverage gaps + coverage gating | High |
| 8 | C6 | Input validation + fail-fast env/secret validation | Critical |
| 9 | C2 | Auth & authorization foundation + tenant scoping | Critical |
| 10 | C7 | Retire legacy `/api/portfolio` v1 + versioning policy | Critical |
| 11 | H1 | Shared Redis cache layer | High |
| 12 | H2 | Parallelize sequential external-call fan-out | High |
| 13 | H3 | Migrate committee track record off local JSON file | High |
| 14 | M1 | Background job queue for AI/recommendation workloads | Medium |
| 15 | H5 | Containerize the application | High |
| 16 | M2 | React Router + lazy-load all screens | Medium |
| 17 | M3 | Decompose largest files | Medium |
| 18 | M5 | Structured logging & observability | Medium |
| 19 | N1 | Per-screen error boundaries + accessibility pass | Nice to have |
| 20 | N2 | Documentation consolidation | Nice to have |

Ordering logic: the fastest, highest-leverage, lowest-dependency security fixes go first (C1, C3, C4); CI (C5) is pulled forward because it de-risks every subsequent change; dependency hygiene and coverage gating (H6, M4, H4) follow immediately since they're cheap and make everything after safer; the deep, high-blast-radius foundation work (C6, C2, C7) comes next once there's a safety net under it; scalability/data-durability work (H1–H3, M1) follows; deployment and frontend architecture (H5, M2, M3) come after the backend foundation is stable; observability, polish, and docs close out the plan.

---

## 5. Sprint Breakdown

Six sub-sprints under the Sprint 17 initiative. Each sub-sprint has an explicit entry gate (what must already be true) and exit gate (what must be true to call it done) — treat these as merge/release gates, not calendar deadlines.

### Sprint 17.1 — Security Emergency Response
**Items:** C1, C3, C4
**Entry gate:** None — starts immediately.
**Exit gate:** No live secrets in git history (secret-scan passes); CORS allow-list and rate limits active on all routes; every controller returns the status code its service layer intended.
**Rationale:** These are standalone, low-dependency, high-urgency fixes that reduce active risk before any other structural work begins.

### Sprint 17.2 — Quality Gate Foundation
**Items:** C5 (CI pipeline), H6 (dependency pinning + audit), M4 (ESLint/Prettier)
**Entry gate:** Sprint 17.1 exit gate met (so CI's first green run reflects a repo already free of the emergency issues).
**Exit gate:** Every PR automatically runs lint + full test suite + build; zero `"latest"` version specifiers remain; zero lint errors on `main`; a scheduled vulnerability scan is active.
**Rationale:** Everything after this sprint is safer to land because it's protected by automated checks.

### Sprint 17.3 — Identity, Validation & API Contract
**Items:** C6 (input/env validation), C2 (auth + tenancy), C7 (retire legacy v1, versioning policy)
**Entry gate:** CI green (Sprint 17.2) so this sprint's larger schema/contract changes are continuously verified.
**Exit gate:** All controllers validate input via schema; app fails fast on missing required secrets; `User` model exists with `userId` scoping on `Portfolio` (and any other tenant-owned table touched); legacy `/api/portfolio` removed or explicitly deprecated; one versioning convention documented and applied.
**Rationale:** This is the largest, highest-blast-radius body of work in the plan — it only starts once there's a CI safety net to catch regressions across the whole surface it touches.

### Sprint 17.4 — Scalability & Data Integrity
**Items:** H1 (Redis cache layer), H2 (parallelize fan-out), H3 (committee track record → DB), H4 (test-coverage gap closure)
**Entry gate:** Sprint 17.3 exit gate met (tenancy model stable, so H3's new table can be tenant-scoped from the start).
**Exit gate:** Shared cache in place with measurable cross-instance hit consistency; watchlist/comparison latency scales with the slowest call, not the sum; committee history durable in Postgres; backend coverage floor enforced in CI.
**Rationale:** Groups everything that removes process-local state or closes coverage gaps — the core "can this survive more than one instance and more than the happy path" work.

### Sprint 17.5 — Deployment & Frontend Architecture
**Items:** H5 (containerization), M2 (routing + lazy-loading), M3 (decompose largest files)
**Entry gate:** H4 (test coverage) complete, so M3's refactors have a regression safety net; C6 (env validation) complete, so H5's containers fail fast on misconfiguration.
**Exit gate:** `docker compose up` reproduces the full stack from a clean machine; every screen is URL-addressable and independently code-split; no frontend screen or backend service file exceeds the agreed line-count threshold.
**Rationale:** Deployment readiness and the two frontend structural changes are grouped because M2/M3 naturally touch the same files and should land together rather than in overlapping, conflicting PRs.

### Sprint 17.6 — Observability & Polish
**Items:** M5 (structured logging), N1 (error boundaries + a11y), N2 (documentation consolidation)
**Entry gate:** C2 (auth) complete, so logging redaction rules account for real user-identifying fields.
**Exit gate:** Correlation-ID tracing works end-to-end in logs with no unredacted request/response bodies; every screen has its own error boundary; stale/conflicting docs archived or corrected.
**Rationale:** Closes out the plan with the lowest-risk, highest-clarity work, run once everything riskier has already landed and stabilized.

---

## 6. Logical Commit Boundaries

Guidance for keeping each sub-sprint's history reviewable and independently revertible. One commit (or tightly-scoped PR) per bullet, in order:

**17.1:** (1) rotate keys at provider + update deployment secrets — no code diff; (2) `git rm --cached frontend/.env`, confirm `.gitignore` coverage, add `.env.example` parity check; (3) history scrub (separate, explicitly-flagged, coordinated commit/operation — see Rollback Strategy); (4) add `helmet()` + CORS allow-list middleware; (5) add `express-rate-limit` config per route tier; (6) rename `error.status` → `error.statusCode` consistently (or vice versa) across `errorHandler.js` and all throw sites in one atomic commit with a contract test added in the same commit.

**17.2:** (1) add CI workflow file (lint/test/build stages, test stage initially allowed to be the only required check); (2) add ephemeral Postgres service to CI for backend integration tests; (3) pin `"latest"` deps to fixed semver, one `package.json` per commit; (4) add Dependabot/`npm audit` CI step; (5) add ESLint+Prettier config (frontend), fix violations in a dedicated "lint fixup" commit separate from config addition; (6) repeat for backend; (7) make lint a required CI check once clean.

**17.3:** (1) add input-validation schemas per controller, grouped by route file, smallest first; (2) add env-schema validation at startup (separate commit, since it changes app boot behavior); (3) add `User` model + migration (additive only — no destructive change to existing tables); (4) add auth middleware (issued but not yet enforced) + login/session endpoints; (5) add `userId` FK to `Portfolio` as nullable/additive, backfill existing row(s), then a follow-up commit to enforce NOT NULL once backfilled; (6) enforce auth middleware on write endpoints (separate, higher-risk commit, behind a feature flag if possible); (7) remove/deprecate legacy `/api/portfolio` in its own commit; (8) document and apply the versioning convention across route files.

**17.4:** (1) introduce shared Redis-backed cache utility (no call-site changes yet); (2) migrate `finnhubCache` call sites; (3) migrate `altDataCache`; (4) migrate `intelligenceCache`; (5) migrate `openaiService`/`chatService` inline caches — each cache migration is its own revertible commit; (6) parallelize `watchlistController.js` loop; (7) parallelize `comparisonService.js` loop — separate commits since they're independently revertible; (8) add `CommitteeDecision` table + migration; (9) port `committeeTrackRecordService.js` reads/writes to Prisma, keep the JSON file read-only as a fallback for one release before deleting it; (10) new tests per previously-untested service, grouped by service, one commit per service.

**17.5:** (1) add Dockerfile (backend); (2) add Dockerfile/build step (frontend); (3) add `docker-compose.yml` wiring both + Postgres + Redis; (4) wire `react-router-dom` into `MainLayout.jsx` (single large but mechanical commit, since routing is inherently all-or-nothing for the shell); (5) convert each screen to `React.lazy()`, one commit per screen or small batch; (6) extract `AiAnalysisScreen.jsx` sub-components one at a time (chart, form, each data section); (7) split `autonomousMarketService.js` along its internal concern boundaries, one extracted module per commit.

**17.6:** (1) add structured logger + correlation-ID middleware; (2) sweep `console.log` → structured logger call sites, grouped by file; (3) add redaction rules for user-identifying fields; (4) add `ScreenErrorBoundary` per remaining screen, one or a few per commit; (5) address top a11y-lint findings by screen; (6) archive/correct stale docs in one documentation-only commit, listing exactly which docs were archived and why in the commit message.

---

## 7. Testing Strategy

- **Unit tests** for every new/modified pure function or service method, colocated next to the source file (matching the existing `*.test.js`/`*.test.jsx` convention already used in the repo).
- **Integration tests** for anything touching Postgres, following the existing pattern (`DATABASE_URL_TEST`, `dbHelpers.js` truncation, `--test-concurrency=1` until the underlying isolation issue is separately investigated) — every new table (C2's `User`, H3's `CommitteeDecision`) gets integration coverage from its first commit, not retrofitted later.
- **Contract tests** introduced in 17.1 for the error-status fix, and extended in 17.3 to assert the documented response envelope/versioning convention — these should fail loudly if a future change silently reintroduces an inconsistent error shape.
- **Coverage gate** introduced in 17.2/17.4: start CI enforcement at a realistic floor based on the measured starting coverage, and ratchet the floor upward by a fixed amount each sprint rather than jumping to an arbitrary target.
- **Frontend component/hook tests** for every screen touched by M2 (routing) and M3 (decomposition) — decomposition (M3) should not proceed on a file until it has test coverage locking in current behavior (this is why M3 is sequenced after H4 in the sprint breakdown).
- **Security-specific tests:** an automated CORS-rejection test (unlisted origin → blocked), a rate-limit test (burst above threshold → `429`), and an auth-enforcement test suite (protected routes reject missing/invalid tokens) added alongside C2/C3/C6.
- **CI as the enforcement mechanism** for all of the above starting Sprint 17.2 — no test strategy item in this plan is considered "done" until it is a required, automated CI check, not a manual step.
- **No production data in tests** — continue the existing pattern of a dedicated `DATABASE_URL_TEST` database, never the dev/prod database.

---

## 8. Rollback Strategy

- **Every schema change is additive-first.** New columns/tables land as nullable/optional in one commit; enforcement (NOT NULL, foreign-key requirement, auth requirement) lands in a separate, later commit once backfill/verification is confirmed. This means any single commit can be reverted without an irreversible data-loss step.
- **Feature-flag high-risk behavioral changes.** Auth enforcement (C2), the async job-queue contract change (M1), and the cache-backend swap (H1) should each be gated behind an environment flag so they can be disabled in production without a code revert if an issue surfaces post-release — matching the existing precedent in this repo (`VITE_PORTFOLIO_ENGINE`, `AUTONOMOUS_ENGINE_ENABLED`).
- **Git history rewriting (part of C1) is the one non-trivially-reversible action in this entire plan** and must be treated differently from everything else: coordinate the exact timing with anyone holding a clone, take a full mirror backup of the repository immediately before rewriting, and perform the rewrite as its own isolated operation — not bundled with any other change — so it can be independently verified and is never silently mixed into an unrelated PR.
- **Legacy removal (C7) keeps a one-release deprecation window** (respond with a `Deprecation`/`Sunset` header before outright deletion) rather than deleting in the same commit that first flags it as legacy, giving any undiscovered caller a chance to surface before the removal is permanent.
- **Every sub-sprint's exit gate doubles as its rollback trigger:** if a sub-sprint's exit criteria aren't met after landing, the specific offending commit (not the whole sprint) is reverted, because the commit boundaries in Section 6 are deliberately scoped to be independently revertible.
- **Infrastructure changes (H1 Redis, H5 containers) ship with a documented fallback path**: the app must still run (degraded, e.g. cache-miss-only) if Redis is unreachable, rather than hard-failing — mirroring the existing "fallback over hard failure" pattern already used for provider outages elsewhere in the codebase.

---

## 9. Success Criteria Summary

Sprint 17 is complete when all of the following are simultaneously true:

1. Zero secrets present in git history (verified by CI secret-scan).
2. Every endpoint is behind rate limiting, CORS allow-listing, and Helmet security headers.
3. Every controller returns the HTTP status its service layer intended; no internal error strings are ever returned to a client.
4. CI runs lint + full test suite + build on every PR and is a required merge check.
5. Zero `"latest"` dependency specifiers remain; a scheduled vulnerability scan is active with no unacknowledged high/critical findings.
6. Zero lint errors on `main`.
7. Backend test coverage meets the agreed floor and is enforced in CI.
8. All request input is schema-validated; app startup fails fast on missing required configuration.
9. A `User` model with real authentication exists, and core tenant-owned tables are scoped by `userId`, not `findFirst()`.
10. The legacy mock `/api/portfolio` endpoint is removed or formally deprecated; one versioning convention is documented and applied across all routes.
11. All previously process-local caches are backed by a shared cache layer; cache behavior is consistent across more than one running instance.
12. Watchlist/comparison endpoints scale with the slowest single external call, not the sum of all calls.
13. Committee decision history is durable in Postgres, with no blocking file I/O on the request path.
14. `docker compose up` reproduces the full stack (API, frontend build, Postgres, Redis) from a clean checkout.
15. Every screen is URL-addressable and independently code-split.
16. No frontend screen or backend service file exceeds the agreed line-count threshold.
17. Structured, correlation-ID-tagged logging is in place with no unredacted request/response bodies.
18. Every screen has its own error boundary; measurable a11y-lint improvement across primary screens.
19. No contradicting architectural statements remain across the repo's documentation.

At that point, ImpactOne has a defensible answer to "is this production-ready" for real users, and a credible technical story for institutional and AI-agent consumers — at which point Sprint 18+ can resume product feature work on a foundation built to hold it.
