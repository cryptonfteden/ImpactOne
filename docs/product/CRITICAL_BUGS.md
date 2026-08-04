# Critical Bugs — Phase H1 Go-Live Audit

Only bugs that would prevent a beta user from successfully using the product. No cosmetic issues, no optimizations, no future ideas. Every item below was verified live against the actual running application (backend on :5000, frontend on :5173), not inferred from reading code alone.

## 1. Secrets committed to git history — CRITICAL, BLOCKING

**Verified:** `frontend/.env` is tracked by git (`git ls-files` confirms it), despite `.env` being listed in `.gitignore` — the gitignore rule was added after the file was already tracked, so it has no effect on this file. `git show HEAD:frontend/.env` returns the real, live `FINNHUB_API_KEY` and `OPENAI_API_KEY` in plaintext, committed since **Sprint 1/2** (`git log --oneline -- frontend/.env` shows commits `7676e23`, `5d855ea`).

**Why this blocks a beta:** these are real, currently-working credentials (confirmed live this session — the Finnhub key returns real quotes). Anyone with read access to this repository's history — including anyone the repo is ever shared with, a future open-sourcing, or a compromised collaborator account — has standing access to keys that can rack up API usage or be abused, independent of anything ImpactOne's own code does correctly. This is not a beta-severity issue; it's a standing security exposure that predates the beta and exists whether or not 5 users are invited.

**Not fixed in this audit** (fixing requires rotating the keys and rewriting git history or accepting the exposure — an architecture/operations decision explicitly out of this phase's scope, not a code change I should make unilaterally).

## 2. No user isolation — all 5 beta users would share one identity — CRITICAL, BLOCKING

**Verified:** `getOrCreateDefaultPortfolio()` and `getInvestorProfile()` are true singletons (confirmed via live inspection in Phase F2's research and re-confirmed here: `GET /api/v2/portfolio` returns the single existing portfolio with no scoping parameter accepted anywhere). Phase F2 produced a full isolation design (`BETA_USER_ISOLATION_PLAN.md`, `DATABASE_MIGRATION_PLAN.md`) — but it was **design only, never implemented**. No `BetaUser` table exists in the live schema; no `betaUserId` column exists on `Portfolio`, `InvestorProfile`, `Recommendation`, `AnalyticsEvent`, or `RecommendationFeedback`.

**Why this blocks a beta:** if 5 real users are invited today, all 5 share the exact same Portfolio (the one currently holding real AAPL/MSFT/NVDA/GOOGL/AVGO positions from this engagement's own D1.8 testing), the exact same InvestorProfile, and cannot be distinguished in feedback or analytics. User 2 placing an order would silently affect what User 1 sees. This is not a degraded experience — it's a data-integrity failure that Phase G1's own `SUCCESS_METRICS.md` explicitly names as an automatic, non-graded stop condition ("any evidence of one beta user seeing another user's portfolio... is treated as an automatic, immediate stop").

**Not fixed in this audit** — implementing it is explicitly the deferred, already-designed work from Phase F2; this phase's mission forbids new feature/architecture work.

## 3. No error visibility beyond a developer's own console — HIGH, not independently blocking

**Verified:** `errorHandling.js`'s `logError` only calls `console.error`; both error boundaries (`AppErrorBoundary`, `ScreenErrorBoundary`) call it and nothing else. Confirmed no error-reporting endpoint exists (`grep` for `/api/v2/errors` or similar returns nothing).

**Why this matters but doesn't independently block:** for exactly 5 known users supported over WhatsApp (per Phase G1's design), a user hitting an error can simply say so — the support channel substitutes for automated error reporting at this scale. Listed here for completeness per the mission's audit categories, not as a launch blocker on its own.

## Explicitly Verified Working (not bugs)

- Backend/frontend both start and serve traffic (`GET /health` → `{"status":"ok"}`).
- The recommendation engine is running and has real output: `GET /api/v2/recommendations/status` shows `enabled: true, running: true`, and 5 real recommendations exist and are viewable (`GET /api/v2/recommendations` → 5 items).
- Portfolio Engine returns real, live-priced data (`GET /api/v2/portfolio` → real positions, real current prices, real P/L).
- Live Finnhub connectivity confirmed (`GET /api/quote?symbol=AAPL` → real price).
- Basic error handling on a bad request returns a clean, safe JSON error (`{"error":"Recommendation not found."}`, HTTP 404) — no stack trace or internal detail leaked to the client.
- `backend/.env` (unlike `frontend/.env`) is correctly gitignored and not tracked — the exposure in item 1 is specific to the frontend file, not systemic to both.
