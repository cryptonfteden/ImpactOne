# Personalization Privacy Review

**Phase:** PERSONALIZATION-PRIVACY-REVIEW-002
**Commit reviewed:** `ed3680b` — "fix(backend): close cross-user data leak in Investor Memory (PERSONALIZATION-PRIVACY-001)" — confirmed at `HEAD` of `sprint-16-live-data` via `git checkout` + `git log --oneline -3` before any other step, per the mission's required sequence. Reviewed via the actual diff (`git show ed3680b`), not commit `4fdc5bd` in isolation. No code was changed to produce this review.

**Headline verdict, stated up front:** the CRITICAL cross-user leakage vulnerability identified in [PERSONAL_INTELLIGENCE_GAPS.md](PERSONAL_INTELLIGENCE_GAPS.md) (C1) is **genuinely fixed, at the root, and independently verified** — not just claimed in the commit message. Every new isolation test was re-run fresh against the real Postgres database as part of this review, not trusted from the commit's own report. One real, concrete gap remains: the fix's safety net (honest-empty-on-missing-identity) is correctly universal, but the actual production call path from the Home screen's recommendation ranking never acquired a real `betaUserId` to pass through, meaning that specific personalization signal is now silently inert rather than leaking — a functional regression, not a privacy one, and it is not currently visible anywhere in this repository's documentation of the fix.

---

## `UserMemoryEvent` betaUserId migration

Confirmed in the diff: a new, real Prisma migration adds `betaUserId String?` (nullable, unconstrained) plus a `@@index([betaUserId])` to `UserMemoryEvent` / `user_memory_events`. This follows the same established, disclosed pattern this codebase already uses elsewhere (`InvestorProfile`, `Portfolio`, `Recommendation` — the "H2 rollout convention," per the migration's own comment) — a deliberate, consistent choice, not a one-off. Nullable is the correct choice here: it allows old, pre-migration rows to exist without a backfill, and — as verified below — the repository layer's own filtering logic ensures a null `betaUserId` on a query parameter, not on stored data, is what actually matters for safety.

## betaUserId propagation through controllers

Confirmed real propagation into `investorMemoryController.js` (`req.betaUserId` now passed to `getInvestorMemory`), `autonomousRecommendationController.js` (view-event logging), `themeController.js` (theme-view event logging), and `homeSummaryController.js` (passed into `buildHomeSummary`).

**One real, unflagged gap found in this review:** `homeSummaryService.js`'s `buildHomeSummary({ watchlist, betaUserId })` now receives a real `betaUserId` from the controller and correctly threads it into `investorMemoryService.computeReadingDepth(betaUserId)`. It does **not** thread it into `buildTopRecommendations()`, which is called with no arguments a few lines earlier in the same function and has no `betaUserId` parameter in its own signature. `buildTopRecommendations()` is the function that calls `personalIntelligenceService.rankByUserRelevance(candidatePool, { investorProfile })` — confirmed directly in source, this call site does not pass `betaUserId` at all. The practical effect: the Home screen's "Top Recommendations" personalized re-ranking now always runs with `betaUserId: undefined`, which (correctly, safely) resolves to an honest empty sector/view-count result rather than a leak — but this also means real personalization has been silently disabled on this specific call path as a side effect of the fix, not intentionally scoped out of it. Nothing in the commit message or the repository's existing documentation names this.

## `investorMemoryService` strict identity requirement

Confirmed: every exported function (`getInvestorMemory`, `computeReadingDepth`, `computeHoldingBehavior`) now calls a new `requireBetaUser(betaUserId)` guard that throws a real, typed error (`statusCode = 400`) when no identity is present — matching `personalizationService.js`'s pre-existing `requireBetaUser` convention exactly, not a new, parallel pattern. Independently re-run: a dedicated test (`"every exported function throws a clear, typed error without a betaUserId"`) passes.

## `userMemoryRepository` query filtering

Confirmed, function by function: `appendEvent`, `listEvents`, `getSectorInterestSummary`, `getThemeInterestSummary`, and `getRecommendationViewCounts` all now filter by `betaUserId` in their Prisma `where` clause, and each one **returns an honest empty result** (`[]`, `{ favoriteSectors: [], ignoredSectors: [] }`, `{ favoriteThemes: [] }`, or an empty `Map`) rather than throwing, when `betaUserId` is absent — a deliberate, correct design choice, distinct from the service layer's hard-error behavior, and confirmed by a dedicated re-run test. This means the repository is "safe by construction" regardless of what any current or future caller does — even a caller that forgets to pass an identity gets an honest empty result, never another user's data.

## `personalIntelligenceService` compatibility

Confirmed: `rankByUserRelevance` gained an optional `betaUserId = null` parameter, and its two repository calls now pass it through. When absent, it resolves through the repository's own honest-empty behavior — no error, no leak, a safe no-boost result. This is backward compatible in the narrow sense that no existing caller breaks. It is **not** functionally complete, per the propagation gap identified above — the one real production caller of this function was never updated to actually supply the identity the fix now supports.

## `autonomousRecommendationRepository` boundaries

Confirmed: `listAllFeedback({ limit, betaUserId })` gained an optional `betaUserId`. Omitted, it preserves its pre-existing, legitimate global-aggregate behavior (used by `learningLoopService.js` and `qualityDashboardService.js` for internal, non-personal aggregate reporting). Passed, it scopes strictly to that one user's feedback. A dedicated test verifies **both** behaviors explicitly in the same test case — re-run fresh, passes. This is the correct shape for this function: it has two legitimate callers with two legitimate, different needs, and the fix serves both without forcing one to imitate the other.

## `learningLoopService` global aggregation justification

Confirmed unchanged (zero diff to this file), and independently re-verified rather than just trusted: its own header comment still states it is deliberately read-only and one-directional, and `aggregateFeedbackSignals()`'s actual output (`byType` counts, `mostUsefulSymbols`/`leastUsefulSymbols`) contains only symbol-level and count-level aggregates — no `betaUserId`, no per-user breakdown, nothing individually identifying, confirmed by reading its return shape directly. This is a legitimate, correctly-scoped global aggregation path, and the commit's decision to leave it untouched is the right call, not an oversight.

## Missing-user behavior

Two distinct, both-correct behaviors, confirmed at each relevant layer:
- **Repository layer** (`userMemoryRepository.js`): missing `betaUserId` → honest empty result, never an error, never a global blend.
- **Service layer** (`investorMemoryService.js`, direct callers only): missing `betaUserId` → a real, typed 400 error.
- **`autonomousRecommendationRepository.listAllFeedback`**: missing `betaUserId` → intentionally preserved global aggregate (a third, deliberately different behavior for a deliberately different, already-legitimate use case).

No path was found, anywhere in this diff, where a missing identity silently falls back to a cross-user blend.

## Cross-user leakage

**Closed, and independently verified, not just trusted.** Every new multi-user isolation test was re-run fresh against the real Postgres test database as part of this review (not assumed from the commit's own report): `userMemoryRepository.test.js` (2 new tests: honest-empty-with-no-identity, and full multi-user isolation across `listEvents`/`getSectorInterestSummary`/`getThemeInterestSummary`/`getRecommendationViewCounts`), `investorMemoryService.test.js` (2 new tests: the 400-error guard, and end-to-end service-level isolation), `personalIntelligenceService.test.js` (1 new test: ranking isolation), and `autonomousRecommendationRepository.test.js` (1 new test: the global-vs-scoped `listAllFeedback` behavior). **Result: 35/35 passing**, run directly against the real database, not mocked.

## Postgres-backed multi-user isolation tests

Confirmed genuinely Postgres-backed, not mocked: every new test uses the real `betaUserRepository.createBetaUser()` (or looks up an existing one by a fixed invite code, idempotently), the real `truncateAll()` helper, and the real repository/service functions under test — no stubbed Prisma client anywhere in the new test code.

## Backward compatibility

Confirmed: 19 existing tests were updated (to pass a real `betaUserId` where the function now requires or accepts one) rather than replaced or deleted, and every one of them still asserts the same real behavior it always did — re-run fresh, all pass. `autonomousRecommendationRepository.listAllFeedback`'s omitted-`betaUserId` global-aggregate behavior — the one place backward compatibility actually mattered for a real, legitimate existing caller — is explicitly preserved and explicitly tested.

## Recommendation-learning data boundaries

No new coupling was introduced between `investorMemoryService`/`userMemoryRepository` and `autonomousRecommendationEngine.js`'s actual recommendation generation or scoring — confirmed by the diff's own file list, which touches neither file. The pre-existing boundary (`learningLoopService.js`'s learning signals do not feed recommendation generation) is unchanged and was not weakened or strengthened by this fix — it simply wasn't in scope, correctly.

---

## The one failing backend test

**`intelligenceBusService.test.js` → `"lifecycle: events from a different engine/symbol series are never superseded by an unrelated publish"`** — re-run fresh in isolation as part of this review: **fails**, expecting `'ACTIVE'` and getting `'EXPIRED'`.

- **Unrelated to `ed3680b`, confirmed, not assumed:** `git log --oneline --all` for both `intelligenceBusService.test.js` and `intelligenceBusLifecycle.js` shows only their single original creation commit (`c51048c`) — `ed3680b` has never touched either file.
- **Genuinely clock-sensitive, confirmed by reading the test:** the failing assertion checks that an `optionsSweepEvent()` fixture (published with no explicit override, i.e. at real "now") is still `ACTIVE` — but this same test file elsewhere tests, and this codebase's options events genuinely have, a real intraday expiry horizon. The fixture's default timestamp is evaluated against the real current wall-clock time rather than a fixed, injected clock, so whether this specific assertion passes depends on what time of day (relative to the intraday expiry window) the suite happens to run — a real, pre-existing test-design flakiness issue, not a logic defect in the lifecycle/supersession behavior itself (the adjacent, more targeted expiry tests in the same file pass correctly).
- **Does not block this privacy certification.** It shares no file, no function, and no code path with anything touched by `ed3680b`, and it is not a personalization, identity, or isolation concern in any sense the mission's audit list covers.

---

See [PERSONALIZATION_PRIVACY_GAPS.md](PERSONALIZATION_PRIVACY_GAPS.md) for every finding ranked.
