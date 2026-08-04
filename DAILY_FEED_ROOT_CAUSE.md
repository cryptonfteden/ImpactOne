# Daily Feed — Root Cause

**Phase:** AI-TRUST-001. Companion to [AI_TRUST_ANALYSIS.md](AI_TRUST_ANALYSIS.md). Exact code-level root cause, traced from the live-observed symptom down to the specific lines changed.

---

## The symptom (live-observed, `COMMERCIAL-READINESS-001`)

Two unrelated Daily Feed headlines, **"AAPL earnings"** and **"Earnings calendar concentration"**, rendered:
- Byte-identical explanation text: `...most comparable to "Covid" (42% historical similarity); propagating from Macro shock to Risk assets (mixed).`
- Identical Importance (54) and Confidence (54) scores.
- Identical affected-holdings lists.

A second pair, **"Fed rate hike"** and **"FOMC Rate Decision"**, showed the same pattern with a different shared cluster (`"Rate Hikes" (88%)`, `Fed funds → Bonds (down)`, Importance 70/Confidence 77).

## The exact call chain

```
Daily Feed item
  → autonomousMarketService.js (importanceScore = confidenceScore*0.7 + watchlist bonus)
    → impactIntelligenceService.js's analyzeIntelligence()
      → buildWhy({ event, affected, history, propagation })   ← builds the explanation sentence
        history    = historicalSimilarityService.getHistoricalMatches(event)   ← ROOT CAUSE #1
        propagation = propagationEngineService.propagateByTheme(event)          ← ROOT CAUSE #2
      → confidenceScore = round((fusion.unifiedConfidence + history[0].similarity) / 2)
```

## Root cause #1: `historicalSimilarityService.js`'s flat fallback score

**Before this session's fix**, `similarityScore(event, record)` returned a specific score (76-88) only when the event text contained one of a small set of hand-picked keywords per historical record (`covid`/`pandemic`, `nvidia`/`ai`, `oil`/`energy`, `fed`/`rate`, `israel`/`war`/`conflict`, `liquidity`, `trade`). **For every other event — the majority of realistic headlines, including both example pairs above — every one of the 8 historical records scored the identical flat value `42`.**

Since `getHistoricalMatches()` sorted descending by score and `Array.prototype.sort` is stable, an all-42 tie preserved `historyDb`'s original declaration order — meaning **"Covid" (the first record in the array) was always the #1 match for any event with no genuine keyword hit**, at the identical 42% "similarity," regardless of what the event actually was.

## Root cause #2: `propagationEngineService.js`'s generic fallback chain

**Before this session's fix**, `propagateByTheme(event)` returned a specific propagation chain only for 3 specific keyword groups (`oil`; `fed`/`rate`; `ai`/`nvidia`). **Every other event received the identical fallback**: `[{ from: "Macro shock", to: "Risk assets", effect: "mixed" }, { from: "Risk assets", to: "Sector dispersion", effect: "up" }]`.

## Why the scores were also identical, not just the text

`impactIntelligenceService.js`'s `confidenceScore` directly averages in `history[0].similarity` — so any two events that both fell through to the flat-42 fallback received the same contribution to their confidence score. `autonomousMarketService.js`'s `importanceScore` is in turn directly derived from `confidenceScore` (`clamp(round(confidenceScore * 0.7 + watchlistBonus))`) — so the identical confidence propagated into an identical (or near-identical, modulo the watchlist bonus) importance score too.

## The exact fix

**`historicalSimilarityService.js`**: the fallback return value changed from `42` to `0`; `getHistoricalMatches()` now filters out any entry with `similarity <= 0` before sorting/slicing, so an event with no genuine keyword match returns an **empty array** rather than a fabricated top-3.

**`propagationEngineService.js`**: the fallback return value changed from the 2-step generic chain to an **empty array** `[]`.

**No changes were needed in `impactIntelligenceService.js`** — `buildWhy()`'s existing `if (topAnalog?.event)` / `if (topPropagation)` checks and `confidenceScore`'s existing `history[0]?.similarity || 60` fallback **already handled a missing/falsy match gracefully and honestly**; they simply never had the opportunity to do so before, since the old fallback values were always truthy/non-zero.

## Files changed

- `backend/services/historicalSimilarityService.js` (fallback score + filter)
- `backend/services/propagationEngineService.js` (fallback chain)
- `backend/services/historicalSimilarityService.test.js` (new)
- `backend/services/propagationEngineService.test.js` (new)
- `backend/services/impactIntelligenceService.test.js` (2 new tests added, existing tests unmodified)

**Zero changes to `impactIntelligenceService.js`, `autonomousMarketService.js`, or any schema/route/architecture.**
