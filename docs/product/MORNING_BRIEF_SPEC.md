# Morning Brief Spec — Phase PRODUCT-001

File: `backend/services/morningBrief/morningBriefService.js`
Route: `GET /api/v2/morning-brief/today`

## Purpose

One canonical service that generates the user's daily intelligence summary
— the answer to "what do I need to know today?" — as 5-8 items, ranked
purely by real Attention Score.

## Generation (`generateMorningBrief({ betaUserId, now })`)

1. Fetches, in parallel, all real inputs:
   - `claimConsumerService.getActiveClaims({ limit: 200 })`
   - `claimConsumerService.getRecentlyInvalidatedClaims({ limit: 100 })`
   - `portfolioEngineService.getPortfolioSummary(betaUserId)` (for held symbols)
   - `portfolioEngineService.getPerformanceDelta(betaUserId)` (real "since yesterday" comparison, reused as-is — no new diffing engine built)
2. Scores every claim via `attentionEngine.scoreClaimAttention`.
3. Turns every real portfolio change (`performanceDelta.changes`) into its
   own brief item, with `portfolioRelevance: 100` (it's the user's own
   portfolio) and `freshness: 100` (it's since yesterday); `urgency`/
   `marketImpact` scale with the real magnitude of the change
   (`min(100, |changePct| × 10)`), never a fabricated constant.
4. Merges claim items + portfolio-change items, sorts by `attentionScore`
   descending, and takes the top 8.

## Never pad, never fabricate

If fewer than 5 real, scoreable items exist, the brief is honestly
shorter — there is no filler item. An empty day returns `items: []` and
`summary: "No meaningful intelligence to surface yet today."`

## Item contract

Every item, regardless of source, has the same shape:

```js
{
  type: "claim" | "portfolio-change",
  claimId / dimension,       // identity, depending on type
  headline: string,          // one short line
  whyItMatters: string,      // one short paragraph, built from real fields
  affectedAssets: string[],  // real symbols, or [] for a portfolio-change item
  portfolioImpact: object | null,
  confidence: number | null, // real Claim confidence, or null for portfolio changes
  attentionScore: number,    // 0-100, from attentionEngine
  attentionExplanation: string,
  recommendedAttentionLevel: "High" | "Medium" | "Low",
}
```

`recommendedAttentionLevel` is a direct, fixed mapping of `attentionScore`:
`>= 75` → High, `>= 45` → Medium, else Low.

## Response shape

```js
{
  generatedAt: ISO string,
  items: BriefItem[],       // 0-8 items
  itemCount: number,
  isBelowTargetMinimum: boolean,  // true when fewer than 5 real items exist
  summary: string,
}
```

## Tests

`backend/services/morningBrief/morningBriefService.test.js` — 6 tests:
honestly-empty brief with no data, never exceeding 8 items with many real
claims, held-symbol claims ranking above unheld ones, a real portfolio
value change producing a `portfolio-change` item, strict descending sort by
`attentionScore`, and every item carrying all required fields. All passing.

Route smoke test: `backend/routes/uiIntegration.integration.test.js` — `GET
/api/v2/morning-brief/today` returns an honestly-empty brief with no real
intelligence yet.
