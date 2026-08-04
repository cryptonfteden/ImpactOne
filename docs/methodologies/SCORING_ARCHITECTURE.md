# Scoring Architecture — Phase X5

## Audit finding

Before writing this doc, every scoring concept in `backend/services/` was located and read (not guessed at). Result: **there is no duplicated scoring logic in this codebase today.** Every real score is computed exactly once, in one function, and every consumer reads that same computed value — including the one case that looks like duplication (`Recommendation.qualityScore` appearing inside both Decision Center's `confidence` field and Opportunity Score's `aiConfidence` factor is the *same number*, read twice, not recomputed twice).

What was missing was a map: nothing tied these scores together into one architecture a person could hold in their head. This document is that map. It changes no calculation.

## Family 1 — Recommendation Confidence Family (the canonical registry)

`backend/services/scoringVocabulary.js` already exists as the single documented contract for this family (Sprint 18A, "Canonical Decision Architecture" — referenced in `API_CONTRACTS.md` §Shared Scoring Vocabulary and enforced by `scoringVocabulary.test.js`). Nine scores, all 0–100:

| Score | Purpose | Calculation source | Dependencies |
|---|---|---|---|
| **confidence** | How strongly the signal supports the recommended action for this symbol | `autonomousMarketService.computeConvictionScore` (same as conviction — see note) | rankingItem |
| **conviction** | Raw opportunity/risk/momentum signal strength that decides BUY/REDUCE/EXIT | `autonomousMarketService.computeConvictionScore` | rankingItem |
| **quality** | How trustworthy this recommendation's evidence base is, overall | `autonomousRecommendationEngine.computeQualityScore` — weighted avg of the 6 rows below | the 6 quality components |
| **risk** | Downside/volatility risk for this specific recommendation | `autonomousRecommendationEngine.computeSymbolRiskScore` — baseRisk×0.7 + concentration/recession/inflation penalties | rankingItem.riskScore, sector weight, macro regime |
| **relevance** | How directly this evidence applies to the user's actual holdings vs. a generic scan | portfolioRelevance component (100 portfolio / 70 watchlist / 40 market-scan) | symbolSource |
| **sourceCredibility** | Reliability of an evidence source | `autonomousMarketService.sourceQualityScore` | source name |
| **evidenceFreshness** | How recent a piece of evidence is | `autonomousMarketService.recencyScore` | publishedAt |
| **evidenceAgreement** | Fraction of directional evidence supporting the action | supporting ÷ (supporting + opposing) | matched evidence |
| **uncertainty** | Genuine disagreement across evidence/committee — distinct from confidence | `scoringVocabulary.computeUncertainty` | evidenceAgreement, committee consensusLevel |

**Owner:** `autonomousRecommendationEngine.js` (computes quality/risk), `autonomousMarketService.js` (computes conviction/sourceCredibility/evidenceFreshness), `scoringVocabulary.js` (documents/normalizes all nine — does not reimplement).

**Documented, intentional overlap:** `confidence`, `conviction`, and `quality.modelConfidence` are the same underlying number under three names today (`scoringVocabulary.js`'s own note), pending real outcome-calibration data per `FIVE_YEAR_ARCHITECTURE_ROADMAP.md`'s Alpha Attribution Engine milestone. This is not fragmentation to fix — it's an honestly-labeled placeholder for a future differentiation this platform doesn't have the data to make yet.

## Family 2 — Opportunity Score (screening family)

**Purpose:** ranks a symbol as a screening candidate, independent of whether a recommendation exists for it yet.
**Calculation source:** `opportunityScoreService.computeOpportunityScore` — weighted blend (momentum 20%, relativeVolume 20%, liquidity 15%, marketCap 10%, recentNews 15%, aiConfidence 20%). Missing factors are excluded and remaining weights renormalized — never zero-filled. `null` if nothing is available (see `MARKET_POSITIONING_SPEC`/opportunity docs for the disclosure contract).
**Owner:** `opportunityScoreService.js`.
**Dependencies:** real market data (momentum/volume/liquidity/cap/news) plus **Family 1's `quality` score** as its `aiConfidence` input (a real cross-family dependency, not a duplicate — Opportunity Score is the only place these two families combine).
**Confidence in the score itself:** each factor's presence/absence is disclosed via `unavailableFactors`; the score is honest about its own incompleteness rather than silently degrading.

## Family 3 — Market Positioning Pressure (directional family)

**Purpose:** classifies a symbol as under real LONG_PRESSURE / SHORT_PRESSURE / neutral, for the Market Positioning screen and Workspace Health.
**Calculation source:** `marketPositioningService.computePressureScore` — a **signed magnitude in [-1, 1]**, not a 0–100 score. Momentum alone sets direction/sign; relativeVolume and liquidity only scale magnitude (this separation was a real, documented bug fix in Phase X2 — non-directional factors used to be able to override genuine negative momentum and mis-rank a falling stock as LONG_PRESSURE).
**Owner:** `marketPositioningService.js`.
**Dependencies:** momentum, relativeVolume, liquidity. Consumed by `opportunityScoreService.js` (as the `momentum`/`relativeVolume`/`liquidity` factors, not the pressure classification itself) and by `workspaceService.js`'s Workspace Health composite (counts of long/short-pressure symbols, not the raw score).
**Why it's a separate family, not folded into Opportunity Score's 0–100 scale:** direction (long vs. short) is categorically different information from magnitude-of-opportunity — collapsing them would lose the sign.

## Family 4 — Impact Graph Confidence (evidentiary family)

**Purpose:** how confident the causal-link record is that one real-world event caused another.
**Calculation source:** persisted directly on `WorldMemoryCausalLink.confidence` at write time (methodology-versioned via `methodologyVersion`) — `impactGraphService.getImpactGraph` reads it, never recomputes it.
**Owner:** whatever process appended the causal link (see `WORLD_MEMORY_SPEC` / `worldMemoryRepository.js`).
**Dependencies:** none at read time — this is stored evidence, not a live computation, which is why it's its own family rather than a Family 1 sub-component.

## Family 5 — Workspace Health (composite, not a scalar score)

**Purpose:** at-a-glance directional/alert summary for a workspace's tracked symbols.
**Calculation source:** `workspaceService.getWorkspace` — `{ trackedSymbolCount, longPressureCount, shortPressureCount, undirectedCount, activeAlertCount, recentTriggerCount, dataAvailable }`. Deliberately **not** a single number: a workspace's health is a mix of directional counts (from Family 3) and real alert activity, and compressing that into one scalar would hide which real signal is driving it.
**Owner:** `workspaceService.js`.
**Dependencies:** Family 3 (Market Positioning) for the long/short counts, `priceAlertService`/notification data for alert counts. Honestly `null` with zero tracked symbols, never a fabricated "0% health."

## Family 6 — Decision Center Confidence (pass-through, not a new score)

`decisionCenterService.js` labels every item with a `confidence` field: `100` (hardcoded) for alert-derived items — a triggered alert is a hard fact, not a modeled estimate — and `recommendation.qualityScore` (Family 1, read directly, never recomputed) for recommendation-derived items. This is intentionally a pass-through/reuse layer, not a seventh scoring family.

## What this architecture rules out going forward

- No future feature may introduce a new "confidence"-shaped 0–100 score without first checking whether it belongs in Family 1's `scoringVocabulary.js` registry.
- Directional/signed scores (Family 3's pattern) must not be forced into a 0–100 shape just for UI consistency — the sign is real information.
- A composite (Family 5's pattern) should stay a composite when its components carry genuinely different meanings; collapsing to a single number to look tidier is a documented anti-pattern here, not a goal.

## Explicitly out of scope

`providerHealthService.js` / `providerMetricsService.js` / `providerDiagnosticsService.js`'s "health" concepts are data-provider infrastructure reliability, unrelated to investment scoring — not part of this taxonomy.
