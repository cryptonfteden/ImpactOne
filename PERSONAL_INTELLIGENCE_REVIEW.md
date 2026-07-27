# Personal Intelligence Review

**Phase:** PERSONAL-INTELLIGENCE-REVIEW-001
**Scope:** the Personal Intelligence architecture as it exists today, reviewed *before* any expansion into the six new Workspace screens. No code was changed to produce this review. Evidence below comes from direct reads of `personalizationService.js`, `personalIntelligenceService.js`, `feedPersonalizationService.js`, `investorMemoryService.js`, `personalProgressService.js`, `userMemoryRepository.js`, `investorProfileService.js`, the Prisma schema, and the frontend's `useInvestorProfile.js`/`investorProfileApi.js`/`personalProgressApi.js`/`calibrationReportApi.js`.

---

## The headline finding, before anything else

**The foundational data table behind almost all of Personal Intelligence — `UserMemoryEvent` — has no user-scoping field at all.** Confirmed directly in the Prisma schema: `model UserMemoryEvent { id, eventType, subject, sector, detail, createdAt }` — no `betaUserId`, nullable or otherwise. Every read this whole layer performs against that table (`userMemoryRepository.listEvents`, `getSectorInterestSummary`, `getThemeInterestSummary`, `getRecommendationViewCounts`) queries it globally, across every user who has ever used the app. The same is true of `personalProgressService.js`'s reads of `RecommendationFeedback` and `UserMemoryEvent` — no `betaUserId` filter appears anywhere in either query.

This means, concretely: in any deployment with more than one real user, `personalIntelligenceService.rankByUserRelevance()`'s "favorite sectors" are not *this user's* favorite sectors — they are the favorite sectors of every user combined. The same is true of `investorMemoryService`'s reading depth, holding-behavior, and sector/theme interest computations, and of `personalProgressService`'s "how has your understanding evolved" trend. A feature named, throughout its own code comments, as being about *this specific investor* is currently built on a data foundation that cannot actually distinguish one investor from another. This is the single most important thing to fix before any expansion, and it governs every other finding below.

---

## Personalization model

The governing document, `PERSONALIZATION_PRINCIPLES.md`, is genuinely excellent — one of the clearest, most precisely-reasoned governance documents in this whole codebase. Its one-sentence test ("does this change what is true, or does it change what is shown, in what order, and in what words?") is a real, checkable rule, not a vague aspiration, and its explicit table of what may/must never be personalized correctly separates ordering/emphasis (allowed) from facts/confidence/verdicts/invalidation conditions (never allowed). The prior `PERSONALIZATION_REVIEW.md` (Phase X10) independently verified this rule is actually followed in code — every personalization function reviewed is a stable re-sort that never mutates the underlying data it reorders. This part of the architecture is sound and does not need to change before expansion.

## Data ownership

Mixed, and the weakest area found in this review. `InvestorProfile` has a real, if deliberately limited, ownership model: a nullable, unconstrained `betaUserId` field (per its own code comment, "so the closed beta's known users each get their own profile without building real auth"), with a documented singleton-fallback behavior when no `betaUserId` resolves. This is an honestly-scoped, if pre-production, design. `UserMemoryEvent` — the record of what a specific person has actually looked at — has no such field at all, and neither `personalProgressService.js`'s feedback/event queries. Ownership here isn't merely weak; for this specific table, it does not exist.

## Privacy boundaries

Directly downstream of the data-ownership finding: there is currently no privacy boundary between users for behavioral data, because there is no user dimension in the data to draw a boundary around. This is not yet a live incident (the current deployment appears to be single/few-user beta), but it is a real, structural gap that must close before any feature — especially a "Personal Intelligence" one — is exposed to genuinely separate users at any scale, per this platform's own beta-isolation discipline established and verified in prior phases of this engagement for other subsystems (Portfolio, Claims).

## Scalability

The append-only design of `UserMemoryEvent` (no update/delete method anywhere in `userMemoryRepository.js`) and the "read and combine, never re-store" discipline in `investorMemoryService.js` (explicitly stated in its own header comment: *"Nothing here writes anything; it only reads and combines"*) are both genuinely good, scalable architectural choices *in isolation* — an ever-growing, append-only event log with derived-at-query-time summaries is a sound pattern. The problem is that this pattern currently scales the wrong thing: every additional user added to the platform adds more noise to one shared, unscoped stream rather than more signal to their own. Fixing the user-scoping issue would not require abandoning this architecture — it would require adding one column and one `where` clause at each read site, which is a small, well-contained change relative to the severity of what it fixes.

## Future recommendation engine

`personalIntelligenceService.rankByUserRelevance()` is explicitly, deliberately narrow today: it re-ranks already-generated recommendations, it never changes their content, and it is well-tested for exactly that boundary (confirmed via its own test file: "never mutates any field on the input recommendations, only reorders"). This is the right scope for what exists today. Before any future recommendation-engine expansion (e.g., using Investor Memory's holding-behavior signal to influence position-sizing suggestions, which `PERSONALIZATION_PRINCIPLES.md` explicitly allows as personal, distinct from the universal thesis), the user-scoping issue above must be resolved first — expanding a recommendation engine's personalization surface on top of cross-contaminated behavioral data would make the contamination more consequential, not less.

## Integration with Intelligence Engine

**None today, and this is a real, notable gap.** `frontend/src/services/intelligenceEngine.js` (the shared ranking/prioritization/reasoning module now used by all six Workspace screens) has no awareness of personalization, `InvestorProfile`, or `UserMemoryEvent` at all — confirmed by its own export list (`rankByScore`, `rankBySymbolAttention`, `prioritizeClaims`, `selectTopClaimByDirection`, `selectTopClaim`, `prioritizeClaimsByPortfolioImpact`, `detectContradiction`, `recommendNextAction`, `buildClaimReasoningSections` — none reference a user profile or behavioral signal). The backend's `personalIntelligenceService.js` and `feedPersonalizationService.js` are real and tested, but they sit entirely on the backend side, consumed only by the older, pre-Workspace screens (Daily Feed, Recommendations) — not by anything in the new shared frontend architecture.

## Integration with all Workspaces

**None, confirmed directly.** None of the six Workspace screens (Mission Control, Portfolio Workspace, News Intelligence, Watchlist Workspace, AI Analysis Workspace, Market Intelligence Workspace) import `investorProfileApi`, `personalProgressApi`, `calibrationReportApi`, or any personalization-related module. `PlatformContext.jsx` (the shared cross-screen state) has no `investorProfile` slot. This means the "Personal Intelligence" pillar and the "Workspace" pillar of this platform have evolved as two completely separate systems that have never been connected — worth naming plainly before any decision to connect them is made, since right now there is no established pattern, precedent, or shared vocabulary for how a Workspace screen would consume a personalization signal the way it already consumes a Claim.

## Duplication risks

Low today, precisely because there is no integration yet — nothing has been duplicated because nothing has been shared. The risk is prospective: if a future phase adds personalization awareness to more than one Workspace screen independently (the same way `statusTone`/`attentionLevel` were each independently reinvented before `claimPresentation.js` consolidated them), the same pattern could recur here. The recommendation in [PERSONALIZATION_ARCHITECTURE.md](PERSONALIZATION_ARCHITECTURE.md) is written specifically to prevent that by establishing one shared frontend entry point before any Workspace screen needs one.

## Long-term maintainability

The backend services themselves are well-written, well-commented, and well-tested individually — `personalizationService.js`, `personalProgressService.js`, and `investorMemoryService.js` each cite their real data sources precisely and avoid inventing signals they can't support (e.g., `preferredNewsSources` is honestly reported as unavailable rather than guessed). The maintainability risk is structural, not code-quality: the user-scoping gap means every one of these services' outputs will need to be revisited once real per-user isolation is added, and the six-Workspace architecture's complete non-awareness of this pillar means a future integration effort starts from zero rather than extending an established pattern.

---

See [PERSONAL_INTELLIGENCE_GAPS.md](PERSONAL_INTELLIGENCE_GAPS.md) for every finding ranked, and [PERSONALIZATION_ARCHITECTURE.md](PERSONALIZATION_ARCHITECTURE.md) for how this pillar should connect to the rest of the platform once the data-ownership gap is closed.
