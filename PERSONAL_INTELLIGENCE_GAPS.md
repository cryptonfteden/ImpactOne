# Personal Intelligence Gaps

Every finding below was verified directly against the current backend and frontend source. Ranked CRITICAL / HIGH / MEDIUM / LOW.

---

## CRITICAL

### C1. `investorMemoryService.js` aggregates data across all beta users, not the requesting user
`getInvestorMemory()` takes zero parameters; every underlying query (`userMemoryRepository.getSectorInterestSummary()`, `getThemeInterestSummary()`, `getRecommendationViewCounts()`, `autonomousRecommendationRepository.listAllFeedback()`) runs with no `betaUserId` filter. Confirmed at the controller: `investorMemoryController.js` calls it with no arguments. A feature named "Investor Memory," whose stated purpose is to build a personal understanding of one investor, is currently architected to reflect the combined activity of every beta user. This is invisible in a single-account dev session and becomes a real, active privacy violation the moment a second concurrent real user exists. This must be fixed before any expansion of Personal Intelligence, and certainly before any of this data is allowed to influence real recommendations for any user.

---

## HIGH

### H1. Three independent, overlapping personalization services with no shared canonical model
`feedPersonalizationService.js` (Daily Feed article weighting), `personalIntelligenceService.js` (Recommendations re-ranking via behavioral signals), and `personalizationService.js` (portfolio-derived preferred sectors, consumed by the Personal Intelligence Workspace) each independently compute a related but distinct notion of "what this user prefers." No shared, canonical user-preference object exists between them. A future change to what counts as a user's preference has no single place to be made correctly.

### H2. Personalization is integrated with exactly one Workspace, not the platform
`personalizationApi` is imported by `PersonalIntelligenceWorkspaceScreen.jsx` only — Mission Control, Portfolio Workspace, News Intelligence, Watchlist Workspace, AI Analysis Workspace, and Market Intelligence Workspace do not factor in real preferred sectors or risk tolerance anywhere. The Intelligence Engine integration this phase built is solid; it simply hasn't been extended to the rest of the platform yet.

---

## MEDIUM

### M1. Learning signals exist but do not yet close the loop into recommendation generation
`learningLoopService.js` remains explicitly read-only and one-directional (confirmed unchanged, zero references either direction to/from `autonomousRecommendationEngine.js`/`personalIntelligenceService.js`). Real reaction-pattern, reading-depth, and holding-behavior signals are computed and available but never influence what gets recommended. This is a disclosed, deliberate boundary today, not a hidden defect — but it is the largest piece of architecture standing between the current Personal Intelligence layer and an actual adaptive recommendation engine, and worth planning for explicitly rather than indefinitely.

### M2. `personalization:profile` cache key is not scoped per user
Self-disclosed in `PERSONAL_INTELLIGENCE.md` and independently confirmed: this is the first `requestCache` key in the app that isn't naturally user-agnostic (every other Workspace's keys are by symbol/claimId). Low risk in a single-account beta today; a real risk in a genuinely multi-account browser session.

### M3. Watchlist-priority cache keys fragment per exact watchlist string, never pruned
Self-disclosed: `intelligence:watchlist-priority:${watchlist.join(",")}` creates a new cache entry for every distinct watchlist composition rather than invalidating the prior one on a single ticker add/remove. Harmless (stale entries expire via the existing 15-second TTL) but an accumulating, never-cleaned cache-key surface as usage grows.

---

## LOW

### L1. Personal relevance is a single sentence, not a graded score
Self-disclosed, deliberate scope decision (grading relevance would require new logic outside this phase's reuse-only constraint) rather than an oversight. Worth revisiting once/if a graded personal-relevance signal becomes valuable enough to justify new logic.

---

## What's explicitly not a gap (verified, not assumed)

- The personalization model itself is honest: it reorders and narrates, never fabricates or alters underlying facts, confidence, or evidence — confirmed against `feedPersonalizationService.js`'s own stated principle and the Workspace's own relevance predicate.
- `personalizationService.js` (distinct from `investorMemoryService.js`) is correctly user-scoped throughout — the privacy gap in C1 does not apply to the data this Workspace's hero/preferred-sectors/opportunities-and-risks sections actually use today.
- Integration with the frontend Intelligence Engine (`prioritizeClaims`, `rankByScore`, `buildClaimReasoningSections`) is genuine and correctly avoids reimplementing shared logic.
- The backend's more elaborate personalization scoring logic was correctly left server-side, not duplicated client-side — a real, deliberate avoidance of the narrower version of this same class of risk.
