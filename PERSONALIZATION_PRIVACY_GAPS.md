# Personalization Privacy Gaps

Every finding below was verified directly against `ed3680b`'s actual diff and by independently re-running the relevant tests fresh against the real Postgres database. Ranked CRITICAL / HIGH / MEDIUM / LOW.

---

## RESOLVED (verified, not assumed)

### R1. Cross-user data leakage in Investor Memory — the original CRITICAL finding
Confirmed fixed at the root: `UserMemoryEvent` gained a real, indexed `betaUserId` column; every read in `userMemoryRepository.js` now filters strictly by it and returns an honest empty result (never a global blend) when absent; `investorMemoryService.js` requires a real identity on every exported function. Independently re-verified by re-running all 5 new multi-user isolation tests plus the 19 updated existing tests fresh: **35/35 passing**, real Postgres-backed, not mocked.

---

## HIGH

### H1. The one real production caller of `personalIntelligenceService.rankByUserRelevance` never received the `betaUserId` the fix requires to actually personalize
`backend/services/homeSummaryService.js`'s `buildTopRecommendations()` calls `rankByUserRelevance(candidatePool, { investorProfile })` with no `betaUserId` — confirmed directly in current source, and confirmed this call site was not touched anywhere in `ed3680b`'s diff. The fix's safety design means this is not a leak (it now safely resolves to an honest no-boost result), but it is a real, unflagged functional regression: the Home screen's "Top Recommendations" personalization-by-viewing-history has been silently disabled, not intentionally descoped. This should be fixed (thread `betaUserId` from `buildHomeSummary` down through `buildTopRecommendations`) or explicitly documented as a deliberate, temporary scope cut — currently it is neither.

---

## MEDIUM

None identified this pass beyond the item above — the fix's core design (repository-level honest-empty-by-default, service-level hard-error-for-direct-callers, and an explicit, tested, dual-mode boundary at `autonomousRecommendationRepository.listAllFeedback`) is sound and consistently applied everywhere it was actually threaded through.

---

## LOW

### L1. `intelligenceBusService.test.js` has one pre-existing, unrelated, genuinely flaky test
`"lifecycle: events from a different engine/symbol series are never superseded by an unrelated publish"` fails intermittently because its `optionsSweepEvent()` fixture is evaluated against real wall-clock time against a real intraday expiry window, rather than a fixed, injected clock. Confirmed via full git history that `ed3680b` never touched this file or its dependencies. **Does not block this certification** — recorded here only so it isn't mistaken for a regression introduced by the privacy fix, and so it's tracked for its own eventual, unrelated fix (inject a fixed clock or an explicit non-expiring `publishedAt` into this specific fixture).

---

## Explicit verification of the mission's four required guarantees

- **User A activity cannot affect User B memory** — ✅ Verified via fresh re-run of the real, Postgres-backed multi-user isolation tests at the repository, service, and ranking layers (5 new tests, all passing).
- **Missing `betaUserId` never falls back to global aggregation** — ✅ Verified at every read path in `userMemoryRepository.js` and every exported function in `investorMemoryService.js`. The one function that *does* preserve a global-aggregate default when `betaUserId` is omitted (`autonomousRecommendationRepository.listAllFeedback`) does so by explicit, tested, documented design for its separate, legitimate internal-aggregate callers (`learningLoopService`/`qualityDashboardService`) — not as an accidental fallback, and this distinction is itself directly tested.
- **All relevant read paths are scoped** — 🟡 Mostly, with one exception: see H1. The repository and service layers are fully scoped; one specific production call path (Home screen recommendations personalization) never acquired the identity needed to actually use that scoping.
- **Intentional global learning paths contain no private user output** — ✅ Verified directly: `learningLoopService.aggregateFeedbackSignals()`'s output contains only symbol-level counts and rankings, no `betaUserId` and no per-user breakdown anywhere in its return shape.
