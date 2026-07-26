# Opportunity Score Spec — Phase X2

Implemented, tested, live. `backend/services/opportunityScoreService.js` + `backend/controllers/marketPositioningController.js`.

## What This Is Not

**Not an AI recommendation.** It never calls the committee, never produces a BUY/REDUCE/EXIT action, and is never consulted by `autonomousRecommendationEngine.js` (verified — no import in either direction). It is a market-positioning score: a single, explainable 0–100 number describing how notable a symbol's current real market signals are, independent of whether the system's own AI has an opinion about it.

## The Six Factors

| Factor | Weight | Real source |
|---|---|---|
| Momentum | 20 | Real % price move (magnitude, either direction) over the recent window — same computation as Market Positioning's momentum |
| Relative volume | 20 | Today's real volume ÷ real N-day average |
| Liquidity | 15 | Real average dollar volume (proxy, documented as such) |
| Market cap | 10 | Real Finnhub market cap — a mild stability signal, capped so mega-caps don't dominate |
| Recent news | 15 | Real count of recent Finnhub news items for the symbol |
| AI confidence | 20 | The real `qualityScore` of that symbol's active `Recommendation`, if one exists — the one place this score touches the AI system, read-only, never written back |

**Short interest and long interest are permanently listed as unavailable inputs** (`unavailableInputs`, always present in every response) — same honest disclosure as `MARKET_POSITIONING_SPEC.md`, not fabricated here either.

## Explainability — Not Optional, Not an Afterthought

Every response returns, per factor: whether it was actually available (`available`), its real underlying value (`realValue` — the actual momentum %, the actual relative volume, etc., not just a normalized score), and its real contribution to the final total (`normalizedContribution`, 0–100). A factor with no real data is marked `available: false`, `realValue: null`, `normalizedContribution: null` — **excluded from the weighted average, never zero-filled**. If literally zero real factors are available for a symbol, the score itself is `null`, never a fabricated default like 50.

## Example (illustrative shape, not real live output)

```json
{
  "symbol": "NVDA",
  "score": 74,
  "explanation": [
    { "factor": "momentum", "weight": 20, "available": true, "realValue": 8.2, "normalizedContribution": 55 },
    { "factor": "relativeVolume", "weight": 20, "available": true, "realValue": 2.1, "normalizedContribution": 64 },
    { "factor": "liquidity", "weight": 15, "available": true, "realValue": 480000000, "normalizedContribution": 88 },
    { "factor": "marketCap", "weight": 10, "available": true, "realValue": 1200000000000, "normalizedContribution": 78 },
    { "factor": "recentNews", "weight": 15, "available": true, "realValue": 4, "normalizedContribution": 80 },
    { "factor": "aiConfidence", "weight": 20, "available": false, "realValue": null, "normalizedContribution": null }
  ],
  "unavailableInputs": [
    { "factor": "shortInterest", "reason": "No real data source exists in this codebase." },
    { "factor": "longInterest", "reason": "Not a standard published metric; no raw input exists to derive it." }
  ]
}
```

## API

`GET /api/v2/market/opportunity-score/:symbol` → the shape above, computed fresh from real, currently-live data each call (no caching this phase).

## Tests

5 tests (`opportunityScoreService.test.js`): full-data scoring produces a valid 0–100 integer with all 6 factors explained; a missing factor is excluded (not zero-filled) while the score still computes from what's real; zero real factors → `null` score, never fabricated; the unavailable-inputs disclosure is always present; every factor's reported weight matches the exposed `CONFIG.WEIGHTS` constant exactly.
