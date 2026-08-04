# Market Sentiment Engine — API Contract (Phase AI-ENGINE-002)

**Status:** Architecture only — no route, controller, or service described below has been implemented. This defines the contract new code would need to satisfy, in the same documentation style as `API_CONTRACTS.md` and `OPTIONS_AGENT_API.md`.

## 1. Contract rules (inherited from `API_CONTRACTS.md` / `OPTIONS_AGENT_API.md`)

- Mounted under `/api/v2/market-sentiment/*`, alongside this platform's other v2, betaUser-aware surfaces — not under the legacy unversioned `/api/*` namespace.
- Market sentiment is **market-wide, not personal data** — every endpoint below requires **no** beta user identity, matching `CanonicalEvent`'s existing no-`betaUserId` precedent (unlike, say, `workspaceService`'s beta-scoped reads). There is no portfolio-relative variant of this engine in v1 — sentiment is the same for every user.
- Rollout is gated behind the `FeatureFlag` row `key: "market-sentiment-engine"` (§10 of the architecture doc) — `featureFlagService.js`'s existing convention, not a new ad hoc env var.
- **Every output object below (the overall reading, and every per-dimension reading) contains exactly these 6 fields, always:** `score`, `trend`, `confidence`, `contributors`, `missingInputs`, `lastUpdated`. This is a structural requirement, not a per-endpoint convenience — see §2 for the shared shape every endpoint reuses.
- When a dimension (or, in a degenerate case, the whole engine) has no available data, the response is still `200` with `score: null`, `confidence: null`, and a populated `missingInputs` — never a `404`/`501` for an intentionally-unbuilt or momentarily-unavailable dimension, matching this codebase's "degrade honestly within a 200" convention (`MarketPositioningScreen.jsx`'s `unavailableFactors` handling, `OPTIONS_AGENT_API.md` §1's `not_connected` precedent).

## 2. The shared `SentimentReading` shape

Every endpoint below returns one or more objects of this exact shape — defined once here, not redefined per-endpoint:

```json
{
  "dimension": "NEWS_SENTIMENT",
  "score": 62,
  "trend": {
    "daily": { "direction": "IMPROVING", "changeAbs": 4, "changePct": 6.9 },
    "weekly": { "direction": "STABLE", "changeAbs": -1, "changePct": -1.6 }
  },
  "confidence": 71,
  "contributors": [
    { "label": "Feed impactType mix (24h)", "detail": "18 opportunity, 6 risk, 11 neutral events", "weight": 0.6 },
    { "label": "Average importanceScore (24h)", "detail": 58, "weight": 0.4 }
  ],
  "missingInputs": [],
  "lastUpdated": "2026-07-26T20:05:00.000Z",
  "methodologyVersion": "sentiment-engine-v1",
  "label": "Signal — not a recommendation"
}
```

- `score`/`confidence` are `null` (never `0` as a stand-in) when the dimension is unavailable that run — see the `EARNINGS_TREND` example in §3.
- `trend.daily`/`trend.weekly` each have `direction` ∈ `IMPROVING`/`DETERIORATING`/`STABLE`/`INSUFFICIENT_HISTORY` — the last one used honestly when fewer than 2 (daily) or 6 (weekly, ~1 trading week) snapshots exist for this dimension yet, never interpolated.
- `contributors` is always the real evidence this specific reading used — empty array only when genuinely no contributor exists yet (matches `missingInputs` being non-empty).
- `label` is always the literal string `"Signal — not a recommendation"` (same governance-view field the Options Agent's `sanitizeOptionsSignal` already attaches) — a structural reminder, not a per-response choice.

## 3. Endpoint index

### Read — market-wide (no beta user identity required, no internal gating)

- `GET /api/v2/market-sentiment/status`
- `GET /api/v2/market-sentiment/overview`
- `GET /api/v2/market-sentiment/dimensions/:dimension`
- `GET /api/v2/market-sentiment/history/daily`
- `GET /api/v2/market-sentiment/history/weekly`
- `GET /api/v2/market-sentiment/snapshots/:date`

### Internal / operational (dev-console gated, same pattern as `/api/v2/options-agent/providers/health`)

- `GET /api/v2/market-sentiment/providers/health`
- `POST /api/v2/market-sentiment/snapshot/run` *(manual trigger, mirrors `POST /api/v2/options-agent/ingest/run`)*

## 4. Endpoint detail

### `GET /api/v2/market-sentiment/status`

Health/configuration status — always safe to call, never requires identity.

```json
{
  "connected": true,
  "enabledDimensions": ["NEWS_SENTIMENT", "AI_RECOMMENDATION_DISTRIBUTION", "VOLATILITY", "MACRO_EVENTS"],
  "unavailableDimensions": [
    { "dimension": "MARKET_BREADTH", "reason": "No advance/decline computation exists yet — architecture §5a not yet implemented." },
    { "dimension": "EARNINGS_TREND", "reason": "No live earnings-beat/miss data source is connected (earningsProvider.js is an honest stub)." },
    { "dimension": "SECTOR_ROTATION", "reason": "Relative-strength computation not yet implemented — architecture §5d." }
  ],
  "lastSnapshotRunAt": "2026-07-26T21:05:00.000Z",
  "methodologyVersion": "sentiment-engine-v1"
}
```

`enabledDimensions`/`unavailableDimensions` are always disjoint and together cover all 8 named dimensions — a dimension can never be silently absent from both lists.

### `GET /api/v2/market-sentiment/overview`

The canonical, composite market sentiment reading — this is the one endpoint the rest of the platform (recommendations, Mission Control, a future Sentiment section) should read for "what does the market feel like right now."

```json
{
  "generatedAt": "2026-07-26T21:05:00.000Z",
  "overall": {
    "dimension": "OVERALL",
    "score": 58,
    "trend": { "daily": { "direction": "STABLE", "changeAbs": 1, "changePct": 1.7 }, "weekly": { "direction": "IMPROVING", "changeAbs": 6, "changePct": 11.5 } },
    "confidence": 46,
    "contributors": [
      { "label": "NEWS_SENTIMENT", "score": 62, "confidence": 71, "weightApplied": 0.19 },
      { "label": "AI_RECOMMENDATION_DISTRIBUTION", "score": 55, "confidence": 80, "weightApplied": 0.22 },
      { "label": "VOLATILITY", "score": 48, "confidence": 65, "weightApplied": 0.18 },
      { "label": "MACRO_EVENTS", "score": 60, "confidence": 55, "weightApplied": 0.15 }
    ],
    "missingInputs": [
      "MARKET_BREADTH: no advance/decline computation exists yet",
      "SECTOR_ROTATION: relative-strength computation not yet implemented",
      "FEAR_GREED: not yet enabled",
      "EARNINGS_TREND: no live earnings data source is connected"
    ],
    "lastUpdated": "2026-07-26T21:05:00.000Z",
    "methodologyVersion": "sentiment-engine-v1",
    "label": "Signal — not a recommendation"
  },
  "byDimension": [
    { "dimension": "NEWS_SENTIMENT", "score": 62, "...": "full SentimentReading shape, §2" },
    { "dimension": "MARKET_BREADTH", "score": null, "confidence": null, "trend": { "daily": { "direction": "INSUFFICIENT_HISTORY" }, "weekly": { "direction": "INSUFFICIENT_HISTORY" } }, "contributors": [], "missingInputs": ["no advance/decline computation exists yet"], "lastUpdated": "2026-07-26T21:05:00.000Z", "methodologyVersion": "sentiment-engine-v1", "label": "Signal — not a recommendation" }
  ]
}
```

`overall.confidence` (46 in this example, with only 4 of 8 dimensions available) is deliberately capped by the `(availableComponentCount / 8) * 60` term from the architecture doc §6 — it can never read as confidently as a fully-available reading would, even though every available component here has decent individual confidence.

### `GET /api/v2/market-sentiment/dimensions/:dimension`

One dimension's current `SentimentReading` (§2 shape exactly). `404` for an unrecognized dimension key (a real not-found — the 8 valid keys plus `OVERALL` are a fixed, documented enum, not user input); `200` with `score: null`/populated `missingInputs` for a recognized-but-currently-unavailable dimension (never a `404` for "not built yet" — that's a data-availability state, not a routing error).

### `GET /api/v2/market-sentiment/history/daily`

**Query params:** `dimension` (required, one of the 8 + `OVERALL`), `days` (default `30`, max `180`).

```json
{
  "dimension": "OVERALL",
  "generatedAt": "2026-07-26T21:05:00.000Z",
  "points": [
    { "snapshotDate": "2026-07-25", "score": 57, "confidence": 44, "missingInputs": ["..."] },
    { "snapshotDate": "2026-07-26", "score": 58, "confidence": 46, "missingInputs": ["..."] }
  ]
}
```

A day with no captured snapshot (scheduler didn't run, or the dimension was unavailable that day) is simply absent from `points` — never a fabricated interpolated point.

### `GET /api/v2/market-sentiment/history/weekly`

Same shape as `/history/daily`, aggregated to one point per trading week (the same 5-trading-session window the architecture doc's weekly-trend definition uses, §7) — `days` query param becomes `weeks` (default `12`, max `52`).

### `GET /api/v2/market-sentiment/snapshots/:date`

All dimensions' captured `MarketSentimentSnapshot` rows for one exact date (`YYYY-MM-DD`) — the audit/debug surface, mirroring `GET /api/v2/options-agent/signals/:signalId`'s "show your work" precedent. `404` with `{ "error": "No sentiment snapshot exists for this date." }` if the scheduler never ran that day (a real not-found, distinct from a dimension being honestly unavailable within an existing snapshot).

### `GET /api/v2/market-sentiment/providers/health` *(dev-console gated)*

Per-component-scorer health, distinct from a generic "is the route up" check — mirrors the Options Agent's `detectionHealth` precedent (avoiding the platform's already-documented "false success" pattern):

```json
{
  "componentHealth": [
    { "dimension": "NEWS_SENTIMENT", "lastComputedAt": "2026-07-26T21:05:00.000Z", "available": true, "confidence": 71 },
    { "dimension": "MARKET_BREADTH", "lastComputedAt": null, "available": false, "reason": "Scorer not yet implemented." }
  ],
  "note": "A component reporting 'available: false' is expected and honest for dimensions not yet built (see MARKET_SENTIMENT_ENGINE.md §3) — this is not the same as a failure."
}
```

### `POST /api/v2/market-sentiment/snapshot/run` *(dev-console gated)*

Manual trigger for the daily snapshot scheduler (architecture §12), mirroring `POST /api/v2/options-agent/ingest/run`. Returns the same run-result shape `providerIngestionService.runProviderIngestion()`-style calls already produce — no new run-result shape invented.

## 5. Error semantics

| Case | Status | Body |
|---|---|---|
| A dimension has no available data this run | `200` | `score: null`, `confidence: null`, populated `missingInputs` — never an error |
| Unknown `:dimension` key | `404` | `{ "error": "Unknown sentiment dimension: <value>." }` |
| No snapshot exists for a requested `:date` | `404` | `{ "error": "No sentiment snapshot exists for this date." }` |
| Feature flag disabled | `404` | Same "as if the route doesn't exist" treatment already used elsewhere for gated routes, not a `403` that would confirm the feature's existence |

## 6. Versioning

`methodologyVersion` (`"sentiment-engine-v1"` initially) is carried on every `SentimentReading` and every `MarketSentimentSnapshot` — same discipline as `Outcome.methodologyVersion`/`OptionsSignal.methodologyVersion`, so a future change to the rollup formula (architecture §6) never silently reinterprets historical snapshots. This is a genuinely new API surface (`/api/v2/market-sentiment/*`), not an extension of an existing unversioned route.
