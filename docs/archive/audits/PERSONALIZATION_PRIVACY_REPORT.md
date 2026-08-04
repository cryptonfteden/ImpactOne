# Personalization Privacy Report

**Phase:** PERSONALIZATION-PRIVACY-001
**Mission:** Fix the critical user-scoping flaw an external audit (`PERSONAL_INTELLIGENCE_REVIEW.md`) found in Investor Memory: `UserMemoryEvent` had no `betaUserId` field at all, and every read in `userMemoryRepository.js` queried it globally, meaning `investorMemoryService.js`'s "this investor's favorite sectors/reading depth" was actually every user's combined.

## Result

The flaw is fixed at its root — the database column, the repository, the service, and every controller in the call chain — and verified with real, database-backed multi-user isolation tests. **Backend: 1055/1056 tests passing** (the one failure is a pre-existing, unrelated, time-of-day-sensitive test in `intelligenceBusService.test.js` — see "Unrelated pre-existing failure" below). **Frontend production build still succeeds.**

## The fix, file by file

### 1. Database (new)
`backend/prisma/schema.prisma`'s `UserMemoryEvent` model gains `betaUserId String?` plus `@@index([betaUserId])` — the exact nullable, unconstrained, indexed pattern already established for `InvestorProfile`/`Portfolio`/`Recommendation` in the H2 Beta User Isolation migration. New migration `20260727172718_personalization_privacy_user_memory_scoping`, applied to both `impactone_dev` and `impactone_test` databases, Prisma Client regenerated.

**Why not a singleton fallback (InvestorProfile's convention)?** `InvestorProfile` is one row per context, so falling back to "the oldest row" when no identity is known is a sensible default. `UserMemoryEvent` is a growing event stream — there is no single meaningful row to fall back to, only every user's combined history. That "fall back to everything" behavior is exactly the bug. This table gets a different, stricter rule (below).

### 2. `backend/services/userMemoryRepository.js` — the repository is now safe by construction
Every read function (`listEvents`, `getSectorInterestSummary`, `getThemeInterestSummary`, `getRecommendationViewCounts`) now takes `betaUserId` and:
- **filters strictly by it** when present (never a global match), and
- **returns the same honest "no data yet" empty shape each function already used for a real user with zero activity** when `betaUserId` is missing or falsy — never throws, never queries without a `where` clause.

This makes the repository itself impossible to leak from, regardless of what any current or future caller does — a deliberate defense-in-depth choice, not just a service-layer gate (see below for why this mattered in practice).

`appendEvent` gains an optional `betaUserId` (defaults to `null`, written onto the new row) — every controller that calls it now passes the real one (see #4).

### 3. `backend/services/investorMemoryService.js` — now strictly requires identity
Added a local `requireBetaUser(betaUserId)` helper (same pattern as `personalizationService.js`'s established one: throws `{ statusCode: 400 }` if missing). `getInvestorMemory`, `computeReadingDepth`, and `computeHoldingBehavior` all call it first, then thread the real `betaUserId` into every downstream call: `userMemoryRepository`'s three read functions, `autonomousRecommendationRepository.listAllFeedback({ betaUserId })`, and `portfolioEngineService.getTradeHistory({ betaUserId })` (which already supported it).

### 4. Controllers now pass the real identity
- `backend/controllers/investorMemoryController.js` — `getInvestorMemory(req.betaUserId)`, with the same `handleKnownError` pattern (`error.statusCode` → HTTP status) every other identity-gated controller in this codebase already uses.
- `backend/controllers/autonomousRecommendationController.js` — `recordRecommendationView`'s `appendEvent` call now includes `betaUserId: req.betaUserId`.
- `backend/controllers/themeController.js` — `recordThemeView`'s `appendEvent` call now includes `betaUserId: req.betaUserId`.
- `backend/controllers/homeSummaryController.js` / `backend/services/homeSummaryService.js` — `buildHomeSummary` now accepts and threads `betaUserId` through to its one `investorMemoryService.computeReadingDepth()` call site, so a real beta-identified user's Home screen keeps showing their own real reading depth instead of silently degrading to "not enough data" now that the underlying call requires identity. An anonymous/unidentified request already had this call wrapped in `.catch(() => ({ hasEnoughData: false }))` — that fallback now fires honestly instead of the old behavior of returning (blended, cross-user) real-looking data.

## Also audited and fixed, per the mission

### `autonomousRecommendationRepository.js`
`listAllFeedback` was the one function in this file with **no** `betaUserId` support at all, unlike its siblings `listActive`/`listAll` (which already had the optional-scoping pattern). Fixed the same way: `betaUserId` is optional — omitted, it stays the legitimate platform-wide aggregate; passed, it filters strictly. This distinction matters here specifically because, unlike `UserMemoryEvent`, `RecommendationFeedback` genuinely has two legitimate consumers: a per-user one (`investorMemoryService`, now always passing `betaUserId`) and a platform-wide internal one (see next).

### `learningLoopService.js` — audited, no code change needed
Its own header comment states its purpose directly: *"exists purely to surface what the platform has learned, for internal (developer-console) visibility, exactly like qualityDashboardService."* Its `computeLearningSignals()` calls `autonomousRecommendationRepository.listAllFeedback()` with no `betaUserId` deliberately — this is a legitimate, intentional, platform-wide aggregate (consumed by `qualityDashboardController.js`, an internal quality-metrics surface), not a per-user personalization signal. Confirmed via its own tests (*"Learning Loop never appears as a dependency of the recommendation engine or the personal ranking engine"*) that it's architecturally isolated from anything user-facing. **No fix was needed or made here** — the repository's now-optional `betaUserId` parameter (see above) preserves this file's existing global behavior exactly, unchanged.

### `personalIntelligenceService.js` — necessary collateral fix, not scope creep
Not named in the mission, but a direct, unavoidable consequence of fixing `userMemoryRepository.js`: this file's `rankByUserRelevance()` was the one other caller of `getSectorInterestSummary`/`getRecommendationViewCounts` in the whole codebase, also with **no** `betaUserId` threaded through, and its existing tests seed real events and assert real sector/view-count boosts. Making the repository return empty-without-identity would have silently broken this file's promised behavior (and its tests) without a corresponding fix. Added an optional `betaUserId` parameter to `rankByUserRelevance`, threaded to both repository calls, and updated its test file to pass a real one (plus added a new multi-user isolation test there too — see Tests below). Its own upstream caller, `homeSummaryService.js`'s `buildTopRecommendations()`, still doesn't thread a real identity through (a separate, pre-existing, much larger gap — the whole Home summary chain isn't beta-scoped for portfolio/recommendation data either) — left untouched as genuinely out of this phase's scope; it now gets the same safe "no memory-based boost" behavior instead of a blended one, never a crash.

## What was deliberately left alone

- **`personalProgressService.computeUnderstandingProgress()`** — called by `investorMemoryService.getInvestorMemory()`, also unscoped, but not one of the four files this mission named. Flagged here for visibility, not fixed.
- **`homeSummaryService.js`'s broader identity gaps** (`portfolioEngineService.getPortfolioSummary()`, `buildTopRecommendations()`'s own `investorProfileRepository.findDefaultInvestorProfile()` call) — real, pre-existing, and much larger than this mission's scope. Only the one call site this phase's own change directly required (`computeReadingDepth`) was threaded.
- **No feature was added or expanded.** Every change either closes the scoping gap or threads an existing identity value one level deeper through an existing call chain — no new field, no new UI, no new capability.

## Tests

**19 tests updated, 5 new tests added**, all real (Postgres-backed, via `node:test` + `truncateAll()`, this codebase's established convention — no Prisma mocking anywhere in this test suite):

- `userMemoryRepository.test.js` — every existing test updated to create/use a real `BetaUser` and pass its id; two new tests: an honest-empty-without-identity test (every one of the four read functions), and a full multi-user isolation test (User B's reads never see User A's real events/sectors/themes/view-counts; User A's own reads remain correct and unaffected by User B's existence).
- `investorMemoryService.test.js` — every existing test updated to pass a real betaUserId; one new test asserting all three exported functions throw `{statusCode: 400}` without one; one new end-to-end multi-user isolation test through the full service (not just the repository) confirming User B's `getInvestorMemory()` is honestly empty while User A's remains fully correct, including `reactionPatterns.totalFeedback` (the feedback-derived signal) never leaking across users.
- `personalIntelligenceService.test.js` — existing sector/view-count boost tests updated to pass a real betaUserId; one new test confirming `rankByUserRelevance` never lets User A's real sector interest boost a ranking computed for User B.
- `autonomousRecommendationRepository.test.js` — one new test confirming `listAllFeedback()` (no `betaUserId`) still returns every user's feedback (preserving `learningLoopService`'s legitimate global use) while `listAllFeedback({ betaUserId })` returns strictly that one user's own.
- `learningLoopService.test.js` — unchanged; its existing tests still pass unmodified, confirming the audited-but-unfixed file's behavior is genuinely untouched.

Full backend suite: **1055/1056 passing** (1056 tests across the whole backend, all `node:test` files).

### Unrelated pre-existing failure (not caused by this phase)
`backend/services/intelligenceBus/intelligenceBusService.test.js`, test *"lifecycle: events from a different engine/symbol series are never superseded by an unrelated publish"* — fails both in the full suite run and in isolation, with `lifecycleStatus` `'EXPIRED'` where `'ACTIVE'` was expected. Root cause: this specific test (unlike its neighbors) publishes events with no explicit `publishedAt`/`now` override, so it depends on the real system clock against an intraday options-event expiry window — a pre-existing, environment-clock-sensitive test, unrelated to Investor Memory, User Memory, or any file this phase touched (confirmed: no shared file, no shared service, no shared test helper between the two areas).

## Verification: one user's behavior cannot affect another's memory

Directly demonstrated by the new tests above at three layers — repository (`userMemoryRepository.test.js`), service (`investorMemoryService.test.js`), and the adjacent ranking consumer (`personalIntelligenceService.test.js`) — each creating two real, distinct `BetaUser` rows via `betaUserRepository.createBetaUser()` (this codebase's own established multi-user-isolation test pattern, e.g. `decisionCenterV1.integration.test.js`), generating real activity for User A, and asserting User B's every read is honestly empty and User A's own data is unaffected and correct.

## Preserving existing single-user behavior

For the one real, beta-identified user this deployment actually serves today, behavior is preserved exactly: their own `betaUserId` (resolved by the existing `betaUserContext` middleware from their invite code) now scopes every read to their own real data — since no other user's events exist to have been wrongly blended in for them specifically, their numbers are identical to before the fix. What changes is only for requests with **no** identity (anonymous/unauthenticated calls, or a second real user once one exists): those now honestly get empty/degraded results instead of a cross-user blend — which is the entire point of this phase, not a regression.
