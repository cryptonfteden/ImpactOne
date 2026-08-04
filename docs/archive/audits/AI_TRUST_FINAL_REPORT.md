# AI Trust Final Report — RC1-BLOCKERS-001

## The Defect

`FOUNDER_WEEK_REVIEW.md`'s live review found that on Daily Feed and Alerts, two genuinely different events could carry byte-for-byte identical AI-generated text: same confidence score, same "Affected holdings" list, same reasoning sentence. The same pattern independently surfaced on Recommendations (3 of 4 active recommendations sharing identical "Would prove it wrong"/"What would change my mind"/"Watch next" text) and Home's "Today For You" (two items sharing one justification sentence).

## Root Cause (Traced, Not Guessed)

Traced via direct code reading, not inference. The bug is **not** in `historicalSimilarityService.js` — that file was already correctly fixed in an earlier commit (`70aee70`), and two genuinely Fed-policy headlines ("Fed rate hike" / "FOMC Rate Decision") sharing one real historical analog is defensible, documented behavior, confirmed still correct.

The real, still-broken mechanism is one layer up, in two files:

1. **`backend/services/impactIntelligenceService.js`** — `classifyForAssets(text)` classifies any headline into one of 19 fixed categories via plain `text.includes(keyword)` substring matching (no word boundary — "ai" matched inside "said"). `adjustAffected(event)` then looked up a **fixed, category-wide template** (`EVENT_TYPE_ASSETS`) for stocks/sectors and applied it verbatim, regardless of what the specific headline actually said. "AAPL earnings" and "Earnings calendar concentration" both contain the substring "earnings" → both landed in the same `earnings` bucket → both got the identical `["AAPL","NVDA","MSFT","AMZN"]` stock list and identical, untouched-default commodities/crypto lists — exactly the "Affected holdings" list the review captured.

2. **`backend/services/autonomousMarketService.js`** — `classifyEventType(headline)` duplicates the same substring-matching bug independently. `COUNTERARGUMENT_BY_TYPE`/`INVALIDATION_BY_TYPE` were keyed **only by category**, not by the specific matched event, so three different symbols (GOOGL/NVDA/MSFT) whose top-matched events all classified into the same `ai` category inherited the exact same "Would prove it wrong"/invalidation text verbatim.

This is confirmed **not** a cache-key collision (each `analyzeIntelligence` call is keyed by `JSON.stringify({event, symbol})` — different events do get separate cache entries) and **not** an object-reference bug. It is category-coarse templating: real headlines that are genuinely different in kind (a single-company event vs. a market-wide breadth statement) were being collapsed into the same bucket with no mechanism to express that difference.

## The Fix (Real Differentiation, No Artificial Variation)

Per this mission's explicit constraint — *never invent variation; identical explanations are allowed only when supported by genuinely identical evidence* — every fix below ties output to a real, already-known fact about the specific event, never a random or cosmetic tweak:

1. **Word-boundary matching** (`hasWord()`, mirroring the existing `70aee70` fix) applied to both `classifyForAssets` and `classifyEventType`, closing the same substring-false-positive class of bug in the two places it was still present.
2. **Literal-ticker extraction**: `adjustAffected` now scans the headline itself for any literally-named ticker (a real fact already in the text) and leads the affected-stocks list with it. A headline naming **no** company (a genuine market-wide/breadth event) leads with a real broad-market proxy (`SPY`) instead of silently reusing the single-company template — because that absence of a named company is itself real, differentiating evidence.
3. **Event-anchored counterarguments/invalidation signals**: `buildCounterarguments`/`buildInvalidation` now interpolate the actual, specific headline (already available at the call site) into their leading line, instead of emitting the category template verbatim. Two different headlines in the same category now produce visibly different leading reasoning; two calls for the *exact same* headline still correctly produce the exact same text — deterministic, not randomized.

## Proof This Isn't Artificial

Every fix is regression-tested for both halves of the mission's own rule:
- **Genuinely different events now differ**: `RC1-BLOCKERS-001` tests in `impactIntelligenceService.test.js` and `autonomousMarketService.test.js` assert "AAPL earnings" vs. "Earnings calendar concentration" (and "NVDA AI demand acceleration" vs. "AI capex supercycle") no longer produce identical affected-stocks/counterarguments/invalidation text.
- **Genuinely identical events still match**: a dedicated determinism test asserts the exact same headline, called twice, produces byte-identical output — proving the fix differentiates on real evidence, not randomness.
- **The original defensible case stays defensible**: the existing "Fed rate hike"/"FOMC Rate Decision" historical-similarity test (already passing, unchanged) still confirms two genuinely related Fed-policy headlines correctly share their real historical analog.

## Coverage Across the Four Named Surfaces

Home, Daily Feed, Alerts, and Recommendations all read from this same shared pipeline (`autonomousMarketService.processEvent` → `impactIntelligenceService.analyzeIntelligence`/`adjustAffected` → `autonomousRecommendationEngine.buildInvalidationConditions`) — fixing the two root-cause service files fixes the defect at its actual source for all four surfaces simultaneously, rather than patching each screen independently. Regression tests were added directly against the two shared services (the real, shared root cause) rather than duplicated four times at the screen level, since screen-level tests would only re-exercise the same shared, now-fixed function.

## What Was Deliberately Not Changed

- `historicalSimilarityService.js`/`propagationEngineService.js` — already correct from `70aee70`, untouched.
- The underlying confidence-fusion computation (`getUnifiedFusion`) — genuinely keyed by `symbol`, not event text; two calls for the same symbol sharing a fusion result is correct, not the defect being fixed here.
- `buildKeyRisks`'s sector-concentration text and the alt-data `predictionMarketSignal` — both confirmed genuinely derived from real, symbol-specific or market-wide data (not category templating), so identical values across symbols there are defensible and untouched.

## Verification

Backend full regression: see commit message for the exact pass count (includes 8 new tests directly proving this fix, all passing). No production behavior changed for events that were already correctly differentiated.
