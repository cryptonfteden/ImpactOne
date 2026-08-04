# Personal Intelligence Review

**Phase:** PERSONAL-INTELLIGENCE-REVIEW-001
**Scope:** The Personal Intelligence architecture as it exists today, reviewed before any further expansion — `PersonalIntelligenceWorkspaceScreen.jsx` (frontend) and its backend foundations (`personalizationService.js`, `personalIntelligenceService.js`, `feedPersonalizationService.js`, `investorMemoryService.js`, `learningLoopService.js`, `personalProgressService.js`). No code was changed to produce this review.

**Context worth stating up front:** this is an unusually well-documented piece of work — its own `PERSONAL_INTELLIGENCE.md` already discloses several real limitations (unscoped cache keys, no graded relevance score) with a rigor this engagement doesn't often find pre-existing. This review verifies that self-disclosure independently, credits it where accurate, and adds what it does not yet cover — most importantly, a privacy/data-ownership gap in `investorMemoryService.js` that is real, more severe than anything already disclosed, and not mentioned anywhere in the existing documentation.

---

## Personalization model

Verified: `PersonalIntelligenceWorkspaceScreen.jsx` is built entirely on real, already-persisted data — the real `InvestorProfile` (risk tolerance, investment horizon, via the shared `useInvestorProfile()` hook), real preferred sectors (derived server-side from actual held positions' `Position.sector`, never a guessed symbol→sector mapping), and a real, disclosed, simple relevance predicate (`isPersonallyRelevant()`: a Claim counts as relevant when its sectors overlap the user's preferred sectors, or its symbols overlap the user's watchlist — confirmed in source, not just asserted in the doc). This is honest personalization: it changes what's surfaced and how it's narrated, never the underlying facts, confidence, or evidence — consistent with this platform's own stated Personalization Principles ("changes weighting, never truth"), confirmed independently in `feedPersonalizationService.js`'s own header comment citing the same principle.

The model is, however, **three separate models, not one**, discovered independently in this review (not mentioned in the existing `PERSONAL_INTELLIGENCE.md`):

1. **`feedPersonalizationService.js`** — Daily Feed article ranking: age/risk-tolerance/investment-horizon boosts applied to news items.
2. **`personalIntelligenceService.js`** — Recommendations re-ranking: behavioral signals (favorite/ignored sectors, per-symbol view counts) via `userMemoryRepository`.
3. **`personalizationService.js`** — the newest, consumed by the Personal Intelligence Workspace: portfolio-position-derived preferred sectors/asset types, plus a real recommendation-style preference (which actions the user actually opens).

All three compute a related but distinct notion of "what does this user prefer," from different real signals, with no shared canonical user-preference object between them. This is the same category of duplication risk the frontend's `claimPresentation.js`/`intelligenceEngine.js` consolidations already exist to prevent — it has simply not yet happened on the personalization side of the backend. See Duplication risks below.

## Data ownership

Mixed, and this is the most important finding of this review. `personalizationService.js` (the one this Workspace consumes) is properly scoped: every function requires a real `betaUserId` and throws if one isn't present (`requireBetaUser`), and its queries (e.g., `computeRecommendationStylePreference`) correctly filter by `betaUserId`.

**`investorMemoryService.js` does not follow the same discipline.** Its exported `getInvestorMemory()` function takes **no parameters at all** — confirmed directly in source, and confirmed at its controller (`investorMemoryController.js` calls `investorMemoryService.getInvestorMemory()` with zero arguments). Every data source it aggregates — `userMemoryRepository.getSectorInterestSummary()`, `getThemeInterestSummary()`, `getRecommendationViewCounts()`, and `autonomousRecommendationRepository.listAllFeedback()` — queries without a `betaUserId` filter. `autonomousRecommendationRepository.js`'s own code comment confirms this is a real, deliberate design choice, not an oversight: *"Phase H2 — betaUserId is optional. Recommendations remain globally [visible]."*

The practical consequence: a feature explicitly named "Investor Memory," whose own stated mission is to build a personal understanding of *the* investor (singular), is currently architected to aggregate data across **every** beta user, not just the one asking. In a single-user dev/beta session this is invisible. The moment this platform has more than one concurrent real beta user, every user's "Investor Memory" — favorite sectors, reading depth, holding behavior, reaction patterns — would reflect the whole beta population's combined activity, not their own.

## Privacy boundaries

Directly downstream of the finding above. This platform has, elsewhere in its history, done real, deliberate beta-user isolation work (confirmed by the existence of dedicated isolation-verification documents in this repository's own history). `investorMemoryService.js`'s lack of per-user scoping is a real regression against that established standard, in a feature area where the stakes are especially high — "what sectors do I favor," "how do I react to recommendations," and "how long do I hold positions" are precisely the kind of individually-revealing data a privacy boundary exists to protect.

## Scalability

The `personalizationService.js` model scales acceptably — its queries are properly user-scoped and bounded. `investorMemoryService.js`'s unscoped aggregation queries (`listAllFeedback({ limit: 500 })`, unscoped `UserMemoryEvent` reads) will only get *more* wrong, not more expensive, as more users join the beta — the bug compounds with adoption rather than being caught by it. This is a case where "it still runs fast" and "it is now more broken" are simultaneously true, which is precisely why this class of gap needs a review like this one rather than waiting for a performance signal to surface it.

## Future recommendation engine

This platform's own `learningLoopService.js` is explicit and self-documenting about its current scope: *"deliberately read-only and one-directional... never imported by `autonomousRecommendationEngine.js`... or by `personalIntelligenceService.js`... grep confirms zero references either direction."* Confirmed independently: this remains true today. The real signals a future recommendation engine would need — reaction patterns, reading depth, holding behavior, calibrated understanding progress — already exist and are already computed by `investorMemoryService.js`/`personalProgressService.js`. None of it currently feeds back into recommendation generation or scoring. This is a disclosed, deliberate boundary (preventing immediate feedback from biasing today's recommendations, per the same file's stated mission), not a hidden gap — but it is the single largest piece of unfinished architecture standing between today's Personal Intelligence layer and an actual adaptive recommendation engine, and the privacy gap above should be closed *before* any of this data starts influencing real recommendations, not after.

## Integration with Intelligence Engine

Genuinely good, and independently verified, not just claimed: `PersonalIntelligenceWorkspaceScreen.jsx` imports and uses `prioritizeClaims`, `rankByScore`, and `buildClaimReasoningSections` from the shared frontend `intelligenceEngine.js` — the same shared module every other Workspace uses, with no local reimplementation. This screen's own documentation is correct that no new `intelligenceEngine.js` logic was needed for this phase; that claim held up under review.

## Integration with all Workspaces

Currently narrow, the same pattern found for Market Intelligence before its own dedicated Workspace was built: `personalizationApi` is imported by exactly one screen (`PersonalIntelligenceWorkspaceScreen.jsx`) and nowhere else. Mission Control's Today's Brief, Portfolio Workspace's claim ranking, News Intelligence's coverage, and Watchlist Workspace's priorities do not currently factor in the user's real preferred sectors or risk tolerance at all — the personalization signal this phase built is real and well-integrated with the Intelligence Engine, but it is siloed to one screen rather than woven through the platform the way Claims and Attention Score now are.

## Duplication risks

The headline risk is the three-services finding under Personalization model above — `feedPersonalizationService.js`, `personalIntelligenceService.js`, and `personalizationService.js` independently compute overlapping notions of user preference. What this phase did get right, and deserves credit: it deliberately did **not** duplicate the backend's more elaborate scoring logic (`feedPersonalizationService.computeProfileWeight`, `personalIntelligenceService.rankByUserRelevance`) on the client — the frontend's relevance predicate is a simple, disclosed, different-purpose filter, not a reimplementation. That specific, narrower duplication risk was correctly avoided; the broader, backend-side three-services fragmentation was not addressed by this phase and wasn't in its stated scope.

## Long-term maintainability

Two concrete risks, one already self-disclosed and one newly found here:
- **Already disclosed** (credited): `personalization:profile`'s `requestCache` key is not scoped per user — the first cache key in this codebase that isn't naturally user-agnostic (every other Workspace's keys are by symbol/claimId). Low risk today (single-account beta sessions), but flagged correctly as worth a future fix rather than silently accepted.
- **Newly found**: the three-services personalization fragmentation (see above) is the real long-term maintainability risk — a future change to "what counts as a user's preference" would need to be made in up to three places, with nothing to guarantee they'd be updated consistently, the same drift risk the platform's `intelligenceEngine.js` consolidation was built specifically to prevent on the frontend.

---

See [PERSONAL_INTELLIGENCE_GAPS.md](../../planning/PERSONAL_INTELLIGENCE_GAPS.md) for every finding ranked, and [PERSONALIZATION_ARCHITECTURE.md](../../architecture/PERSONALIZATION_ARCHITECTURE.md) for the target architecture this platform should converge on before personalization expands further.
