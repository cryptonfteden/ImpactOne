# Personalization Review — Phase X10
## Can User Preferences Evolve Naturally?

Scope: the personalization layer only — `feedPersonalizationService.js`, `personalIntelligenceService.js`, `investorMemoryService.js`. Evaluated independently of the Learning Engine finding in `AI_LEARNING_REVIEW.md`, since personalization and outcome-learning are architecturally separate systems in this codebase.

---

## 1. What Exists, and It Is Genuinely Real

This is the strongest-scoring area in the entire adaptive-intelligence audit. Three real, working, behavior-derived layers exist:

- **`feedPersonalizationService.js`** — re-weights the Daily Feed by real `InvestorProfile` fields (risk tolerance, age, investment horizon, goal). A stable re-sort only — it explicitly never touches an event's `impactType`/`riskLevel`/any fact.
- **`personalIntelligenceService.js`** — re-ranks Recommendations by real behavioral signals: favorite/ignored sectors (from `userMemoryRepository`'s real interest tracking), real per-symbol view counts, and reuses `feedPersonalizationService`'s profile weighting. Also a stable re-sort — reorders, never mutates the underlying `qualityScore` or `confidenceScore`.
- **`investorMemoryService.js`** — synthesizes a genuine "Investor Memory" profile from real, already-append-only data: **reading depth** (fraction of viewed recommendations that received feedback — a real engagement-depth signal, not a vanity metric), **holding behavior** (real FIFO-paired buy/sell trade durations, honestly requiring ≥3 closed round-trips before labeling a "trading style"), **sector/theme interest**, and **reaction patterns** (reused directly from `learningLoopService.aggregateFeedbackSignals`, not recomputed a second way).

None of this is a static onboarding questionnaire. `InvestorProfile` (age/risk-tolerance/goals, collected once at onboarding) is only one of several inputs — the rest genuinely accumulate from real, ongoing behavior (views, feedback, trades) with honest minimum-sample gates (`MIN_SAMPLE = 3`) before claiming a pattern exists.

## 2. The One Consistent, Deliberate Limit

Every one of these three services is built around the same explicitly-stated principle (quoted directly from `feedPersonalizationService.js`'s own header comment): *"Personalization only ever changes ordering — it never touches an event's impactType, riskLevel, or any other fact."* `personalIntelligenceService.js` restates the identical rule for recommendations.

This means personalization here is **presentation-layer, not substance-layer**: a user's evolving behavior can move a recommendation from position #8 to position #2 in their feed, or bias the Daily Feed toward opportunity-flavored events for a young/high-risk-tolerance user — but it can never change *what confidence score, quality score, or thesis* that recommendation carries. Two users with opposite behavioral histories would see the same underlying recommendation content for the same symbol, only in a different order.

## 3. Does This Connect to the Learning Engine? No — And That's a Separate Finding.

Personalization (this document) and outcome-based learning (`AI_LEARNING_REVIEW.md`) are architecturally independent systems that happen to share one function (`aggregateFeedbackSignals`). Investor Memory reads real feedback/trade/view history to build a *user* model; nothing in `AI_LEARNING_REVIEW.md`'s Learning Engine reads a *user's* history to adjust *anyone's* recommendation quality. They are both real, both honest, and both currently one-directional in different senses: personalization reorders based on the user's own history; outcome-learning measures but never feeds back into generation for anyone.

## 4. Direct Answer: Can User Preferences Evolve Naturally?

**Yes, genuinely, within its stated scope.** This is the one area of the six reviewed in this Phase where the honest answer is a clear yes, not a qualified no. A real investor's reading depth, sector interest, and holding behavior do measurably and automatically reshape what they see first and how it's framed, without requiring them to fill out a new form — that is real preference evolution. It should not be read past its actual boundary, though: it evolves *emphasis and order*, not the underlying analytical content, confidence, or quality of any given recommendation.

## 5. What Would Extend This, Named Only (Not Designed Here)

- Feeding `investorMemoryService`'s behavioral signals into anything beyond ordering — e.g. letting a user's demonstrated risk tolerance (via actual holding behavior, not just a stated onboarding answer) adjust the committee's own risk-weighting for that user specifically — would be a genuine next step, but does not exist today.
- No mechanism currently reconciles a user's *stated* onboarding risk tolerance against their *revealed* holding-behavior label (e.g. "stated LOW risk tolerance" vs. "revealed short-term trader") — an honest say-vs-do gap that exists in trust/retention metrics (per `BETA_SUCCESS_METRICS.md`) but has no personalization-layer analog yet.
