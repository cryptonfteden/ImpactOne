# Attention Engine Spec — Phase PRODUCT-001

File: `backend/services/attentionEngine/attentionEngine.js`

## Purpose

One canonical, deterministic prioritization function. Everything shown in
the app that needs a rank — Claims, feed/news items, symbols on the
Watchlist — gets its Attention Score from here, never from a screen-local
formula.

## Core function: `computeAttentionScore(factors)`

Takes an object with any subset of 8 possible factors (each a 0-100
number). Returns:

```js
{
  score: 0-100 (integer),
  explanation: "Ranked {score}/100, driven mainly by {top 3 factors}.",
  factors: [{ key, label, value, weight, contribution }, ...],
  missingFactors: [keys not supplied],
}
```

### Factors and fixed weights (sum to 1.00)

| Factor | Weight | Meaning |
|---|---|---|
| portfolioRelevance | 0.22 | Does this concern something the user actually holds? |
| confidence | 0.16 | The Claim/item's own real confidence score |
| urgency | 0.14 | How time-sensitive (derived from lifecycle status / impact type) |
| marketImpact | 0.14 | Real magnitude/importance (expectedMagnitude or reused importanceScore) |
| freshness | 0.12 | How recently it was updated (7-day linear decay) |
| probability | 0.10 | The Claim's own real probability |
| supportingEngines | 0.07 | Distinct source engines behind the evidence |
| riskLevel | 0.05 | Confidence specifically on a bearish/downside claim |

### Never-fabricate rule

A factor is only included if it's a real, finite number for that specific
item. Missing factors are **excluded**, not defaulted to 0 — the remaining
weights are renormalized to sum to 1 before scoring. This means an item
missing 5 of 8 factors is judged purely on the 3 it has, never penalized
for an absence disguised as a low score.

### Determinism

`computeAttentionScore` is a pure function — no randomness, no internal
clock reads. `computeFreshnessScore(timestamp, { now })` requires the
caller to pass `now` explicitly, so the same inputs always produce the
same score, and tests can assert exact values.

## Adapters

### `scoreClaimAttention(claim, { heldSymbols, now })`

Maps the real Claim contract onto the 8 factors:

- `portfolioRelevance`: 100 if any of the claim's real `symbols` is held,
  20 if it has symbols but none are held, **excluded** if the claim is
  market-wide (no symbols) — never fabricated.
- `confidence` / `probability`: the claim's own real fields, if finite.
- `urgency`: derived from real lifecycle `status` — `STRENGTHENING`/
  `WEAKENING` = 80, `CONTESTED` = 75, `ACTIVE` = 55, `DRAFT` = 35, terminal
  statuses (resolved/invalidated/expired) = 5-15.
- `freshness`: 7-day linear decay from the real `lastUpdatedAt`.
- `marketImpact`: the claim's real `expectedMagnitude`, if present.
- `supportingEngines`: count of distinct `sourceEngine` values across the
  claim's real evidence rows, × 25 (capped at 100).
- `riskLevel`: the claim's own confidence, only when `expectedDirection`
  is `BEARISH` (a bullish claim's confidence isn't a "risk").

Also returns `isHeld` (boolean) alongside the score, for screens that need
the raw fact (e.g., News's "affected holdings" line).

### `scoreFeedItemAttention(item, { heldSymbols, now })`

Same shape, mapped from a Daily Feed item:

- `portfolioRelevance`: same held/not-held/excluded logic over the item's
  real `affectedAssets`.
- `urgency`: 60 for a directional item (`impactType !== "neutral"`), 30
  for an FYI item.
- `freshness`: 7-day decay from the item's real `publishedAt`.
- `marketImpact`: **reuses** the item's own already-computed
  `importanceScore` (from `autonomousMarketService`) rather than
  recomputing a second, competing "how important is this" number — one
  canonical importance measure per item, per the mission's "no duplicated
  prioritization logic" requirement.
- `riskLevel`: the item's confidence, only when `impactType === "risk"`.

## Where scores get attached (controller-layer orchestration, not new logic)

- `claimsController.js` — `getActiveClaims`, `getClaimsBySymbol`,
  `getPortfolioRelevantClaims`, `getOvernightChanges` all attach
  `attentionScore`/`attentionExplanation` to every claim, using the
  request's real held-symbols set (`portfolioEngineService.getPortfolioSummary`).
- `autonomousMarketController.js` — `getLiveFeed` attaches
  `attentionScore`/`attentionExplanation`/`isHeld` to every feed item the
  same way.
- `morningBriefService.js` — uses `scoreClaimAttention` directly (not
  through a controller re-fetch) since it composes claims + portfolio
  changes into one ranked list itself.

## Tests

`backend/services/attentionEngine/attentionEngine.test.js` — 13 tests
covering: determinism, the never-fabricate/renormalization rule, monotonic
ordering, freshness decay boundaries, held-vs-unheld ranking, status-based
urgency ordering, and evidence-engine counting. All passing.
