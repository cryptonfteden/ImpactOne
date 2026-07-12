# ImpactOne MVP API Contracts

**Document Type:** Backend API Contract Specification  
**Scope:** MVP endpoints only  
**Status:** Based on the current backend implementation where available; missing MVP endpoints are explicitly called out  
**Date:** 2026-07-11

---

## 1. Contract Rules

- All current endpoints are public in the implementation; there is no auth middleware applied today.
- `GET` endpoints use query parameters and do not require a request body.
- `POST` endpoints accept JSON bodies via `express.json()`.
- Error responses come from the shared error handler unless a controller returns a custom shape.
- When a service fails but has a fallback path, the endpoint may still return `200` with fallback data.
- All response examples below reflect the current implementation or the closest current contract where the backend composes external provider data.

---

## 2. Endpoint Index

### Implemented today

- `GET /health`
- `GET /api/news`
- `GET /api/watchlist`
- `GET /api/market`
- `GET /api/ai/analyze`
- `POST /api/ai/analyze`
- `GET /api/committee/analyze`
- `POST /api/committee/analyze`
- `GET /api/committee/track-record`
- `GET /api/compare`
- `GET /api/portfolio`
- `GET /api/quote`
- `GET /api/alt-data/cot`
- `GET /api/alt-data/polymarket`
- `GET /api/alt-data/macro`
- `GET /api/alt-data/sec`
- `GET /api/alt-data/congress`
- `GET /api/alt-data/events`
- `GET /api/alt-data/summary`
- `GET /api/intelligence/analyze`
- `POST /api/intelligence/analyze`
- `GET /api/intelligence/scenario`
- `POST /api/intelligence/scenario`
- `GET /api/intelligence/impact`
- `POST /api/intelligence/impact`
- `GET /api/intelligence/history`
- `POST /api/intelligence/history`
- `POST /api/intelligence/portfolio`
- `GET /api/intelligence/daily-brief`
- `POST /api/intelligence/daily-brief`
- `GET /api/intelligence/overview`
- `POST /api/intelligence/overview`
- `GET /api/intelligence/live-feed`
- `GET /api/intelligence/changes`
- `GET /api/intelligence/watchlist-priority`
- `GET /api/intelligence/global-map`
- `GET /api/intelligence/decision-center`
- `GET /api/intelligence/alpha-discovery`
- `GET /api/v2/portfolio`
- `POST /api/v2/portfolio/orders`
- `GET /api/v2/portfolio/trades`
- `GET /api/v2/portfolio/transactions`
- `GET /api/v2/portfolio/performance`
- `POST /api/v2/portfolio/performance/snapshot`
- `POST /api/v2/portfolio/reset`
- `POST /api/chat/ask`
- `GET /api/v2/recommendations`
- `GET /api/v2/recommendations/:id`
- `POST /api/v2/recommendations/run`
- `GET /api/v2/recommendations/status`
- `GET /api/v2/recommendations/:id/decision-trace`

### MVP-required but currently missing

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/onboarding/preferences`
- `PUT /api/onboarding/preferences`
- `GET /api/watchlist` write operations (`POST`, `PATCH`, `DELETE`) for CRUD management
- `GET /api/settings`
- `PUT /api/settings`
- `GET /api/billing/plans`
- `POST /api/billing/checkout`
- `POST /api/billing/portal`
- `GET /api/intelligence/daily-brief/archive`

The sections below document the current implemented endpoints in detail and then the missing MVP endpoints as proposed contracts.

---

## 3. Implemented Endpoint Contracts

### 3.1 `GET /health`

**Route**
- `/health`

**HTTP method**
- `GET`

**Request body**
- None.

**Response schema**
- `{ status: "ok" }`

**Error responses**
- `500 { error: "Internal Server Error" }` if the app-level error handler catches an unexpected failure.

**Authentication requirements**
- None.

**Validation rules**
- None.

**Example request**
```http
GET /health
```

**Example response**
```json
{ "status": "ok" }
```

---

### 3.2 `GET /api/news`

**Route**
- `/api/news`

**HTTP method**
- `GET`

**Request body**
- None.
- Query parameter: `query` optional string, defaults to `finance`.

**Response schema**
- `{ query: string, news: Array<object> }`
- When `NEWS_API_KEY` is missing, returns a deterministic fallback article array.

**Error responses**
- `500 { error: "Internal Server Error" }` if controller-level failure occurs.
- The service itself usually returns an empty array or fallback article instead of failing.

**Authentication requirements**
- None.

**Validation rules**
- Query is treated as a free-text string.
- Empty or missing `query` defaults to `finance`.

**Example request**
```http
GET /api/news?query=semiconductors
```

**Example response**
```json
{
  "query": "semiconductors",
  "news": [
    {
      "title": "AI infrastructure demand remains strong",
      "description": "Institutional capital continues to flow into compute and cloud leaders.",
      "url": "https://example.com/news/1"
    }
  ]
}
```

---

### 3.3 `GET /api/watchlist`

**Route**
- `/api/watchlist`

**HTTP method**
- `GET`

**Request body**
- None.
- Query parameter: `symbols` optional comma-separated string, defaults to `NVDA,PLTR,AMZN,TSLA`.

**Response schema**
- `{ watchlist: Array<{ symbol, company, price, change, aiRating, aiScore, alertBadge }> }`

**Error responses**
- `400/502-like service error` if an upstream provider error exposes `statusCode`.
- Current controller returns `{ error: string, watchlist: [] }` for known service failures.
- `500 { error: "Internal Server Error" }` for uncaught failures.

**Authentication requirements**
- None.

**Validation rules**
- Symbols are split by comma, trimmed, and used as-is.
- No strict symbol validation is enforced at the controller layer.

**Example request**
```http
GET /api/watchlist?symbols=AAPL,NVDA,TSLA
```

**Example response**
```json
{
  "watchlist": [
    {
      "symbol": "AAPL",
      "company": "Apple Inc.",
      "price": 192.5,
      "change": 1.2,
      "aiRating": "Buy",
      "aiScore": 81,
      "alertBadge": { "type": "opportunity", "label": "Opportunity" }
    }
  ]
}
```

---

### 3.4 `GET /api/market`

**Route**
- `/api/market`

**HTTP method**
- `GET`

**Request body**
- None.
- Query parameter: `symbol` optional string, defaults to `NVDA`.

**Response schema**
- `{ symbol: string, quote: object, previousClose: object, marketOverview: object }`

**Error responses**
- `500 { error: "Internal Server Error" }` for unexpected failures.

**Authentication requirements**
- None.

**Validation rules**
- Symbol is accepted as a free-text string and passed to provider clients.
- Default symbol is `NVDA`.

**Example request**
```http
GET /api/market?symbol=AAPL
```

**Example response**
```json
{
  "symbol": "AAPL",
  "quote": {
    "symbol": "AAPL",
    "price": 192.5,
    "change": 1.2,
    "trend": "Positive",
    "marketCap": "3.0T",
    "pe": 31.4,
    "volume": "42.1M",
    "weekHigh": "$198.10",
    "weekLow": "$164.50",
    "companyLogo": "https://...",
    "companyDescription": "Apple Inc. is a publicly traded company tracked through Finnhub."
  },
  "previousClose": {
    "symbol": "AAPL",
    "previousClose": 121.4,
    "change": 2.8
  },
  "marketOverview": {
    "symbol": "AAPL",
    "function": "TIME_SERIES_DAILY",
    "data": {
      "2024-01-01": { "open": 100, "high": 104, "low": 99, "close": 102, "volume": 1000 }
    }
  }
}
```

---

### 3.5 `GET /api/quote`

**Route**
- `/api/quote`

**HTTP method**
- `GET`

**Request body**
- None.
- Query parameter: `symbol` optional string, defaults to `NVDA`.

**Response schema**
- `{ symbol, quote, company, recommendation, recommendationTrend, news, chart, fearGreed }`

**Error responses**
- `404 { symbol, error }` for invalid tickers.
- `502 { symbol, error }` for provider/key failures.
- `500 { error: "Internal Server Error" }` for unexpected failures.

**Authentication requirements**
- None.

**Validation rules**
- Symbol is uppercased in service logic.
- Finnhub response must include a valid company profile and quote.
- Invalid or unknown ticker input is rejected with 404 from the service.

**Example request**
```http
GET /api/quote?symbol=AAPL
```

**Example response**
```json
{
  "symbol": "AAPL",
  "quote": {
    "symbol": "AAPL",
    "price": 192.5,
    "change": 1.2,
    "trend": "Positive",
    "marketCap": "3.0T",
    "pe": 31.4,
    "volume": "42.1M",
    "weekHigh": "$198.10",
    "weekLow": "$164.50",
    "companyLogo": "https://...",
    "companyDescription": "Apple Inc. is a publicly traded company tracked through Finnhub."
  },
  "company": {
    "name": "Apple Inc.",
    "exchange": "NASDAQ",
    "industry": "Consumer Electronics",
    "country": "US",
    "currency": "USD",
    "website": "https://www.apple.com",
    "marketCap": "3.0T",
    "ipo": "1980-12-12",
    "employees": "50M shares"
  },
  "recommendation": {
    "label": "Buy",
    "reason": "The balance of analyst ratings leans positive, supported by a positive daily move.",
    "details": "12 Buy / 9 Hold / 1 Sell"
  },
  "recommendationTrend": {
    "direction": "Improving",
    "summary": "Latest: 12 Buy / 9 Hold / 1 Sell vs prior 11 Buy / 10 Hold / 1 Sell.",
    "latest": "2026-07",
    "previous": "2026-06"
  },
  "news": [
    {
      "headline": "Apple expands AI infrastructure",
      "summary": "...",
      "url": "https://...",
      "datetime": 1710000000
    }
  ],
  "chart": [
    { "label": "Jun 1", "value": 190.12 }
  ],
  "fearGreed": {
    "value": "68",
    "classification": "Greed",
    "timestamp": "1710000000"
  }
}
```

---

### 3.6 `GET /api/ai/analyze` and `POST /api/ai/analyze`

**Route**
- `/api/ai/analyze`

**HTTP method**
- `GET`, `POST`

**Request body**
- `symbol` optional string.
- `context` optional object.
- Or top-level fields used as fallback context:
  - `quote`
  - `company`
  - `recommendation`
  - `recommendationTrend`
  - `news`
  - `chart`
  - `fearGreed`
  - `metrics`

**Response schema**
- `{ symbol: string, analysis: { executiveSummary, bullCase, bearCase, valuation, keyRisks, catalysts, shortTermOutlook, longTermOutlook, investmentRating, confidenceScore, whatChangedToday, requiresApiKey, source, providerError?, providerNotice?, marketImpact, alternativeDataSignals, committeeDebate, committeeTrackRecord } }` — `committeeDebate` (renamed from `committee` in Sprint 18A; see 3.8) is debate/explanation context only, never an independent verdict. `investmentRating` above is a separate, pre-existing field from this endpoint's own OpenAI-backed analysis and is out of scope for the Sprint 18A canonical-verdict merge (see `INTELLIGENCE_PLATFORM_REVIEW.md`, which scoped the merge to the Investment Committee and Recommendation Engines specifically).

**Error responses**
- `500 { error: "..." }` via global error handler for uncaught failures.
- The endpoint itself frequently returns fallback AI content rather than failing.

**Authentication requirements**
- None.

**Validation rules**
- Symbol defaults to `NVDA`.
- Context object is optional and may be partially populated.
- Investment rating is normalized to one of `Strong Buy`, `Buy`, `Hold`, `Sell`.
- Confidence is clamped to 0-100.

**Example request**
```http
POST /api/ai/analyze
Content-Type: application/json

{
  "symbol": "AAPL",
  "context": {
    "quote": { "price": 192.5, "change": 1.2 },
    "company": { "name": "Apple Inc." },
    "news": [{ "headline": "Apple expands AI infrastructure" }]
  }
}
```

**Example response**
```json
{
  "symbol": "AAPL",
  "analysis": {
    "symbol": "AAPL",
    "executiveSummary": "AAPL appears fundamentally interesting.",
    "bullCase": ["..."],
    "bearCase": ["..."],
    "valuation": "Valuation remains a key watch item.",
    "keyRisks": ["..."],
    "catalysts": ["..."],
    "shortTermOutlook": "Short-term outlook pending.",
    "longTermOutlook": "Long-term outlook pending.",
    "investmentRating": "Buy",
    "confidenceScore": 72,
    "whatChangedToday": ["AAPL moved 1.20% in the latest session."],
    "requiresApiKey": false,
    "source": "fallback",
    "providerError": null,
    "providerNotice": "OpenAI is temporarily unavailable. Falling back to deterministic analysis.",
    "marketImpact": {
      "score": 64,
      "why": "..."
    },
    "alternativeDataSignals": {
      "smartMoneyPositioning": {},
      "predictionMarketProbabilities": {},
      "macroRegime": {},
      "secFilingSignal": "...",
      "politicalTradingSignal": "...",
      "optionsStatus": {},
      "onChainStatus": {},
      "upcomingEventRisk": [],
      "impactedSectors": [],
      "relatedTickers": [],
      "confidenceScore": 78
    },
    "committeeDebate": null,
    "committeeTrackRecord": null
  }
}
```

---

### 3.7 `GET /api/compare`

**Route**
- `/api/compare`

**HTTP method**
- `GET`

**Request body**
- None.
- Query parameter: `symbol` optional string, defaults to `NVDA`.

**Response schema**
- `{ symbol: string, peers: string[], comparison: Array<{ symbol, priceChange, marketCap, pe, analystRating, aiRating, aiScore }> }`

**Error responses**
- `400/404/502` style service errors are returned as `{ symbol, error }` when known.
- `500 { error: "Internal Server Error" }` otherwise.

**Authentication requirements**
- None.

**Validation rules**
- Symbol is uppercased.
- Peer list is derived server-side.

**Example request**
```http
GET /api/compare?symbol=AAPL
```

**Example response**
```json
{
  "symbol": "AAPL",
  "peers": ["MSFT", "GOOGL"],
  "comparison": [
    {
      "symbol": "AAPL",
      "priceChange": 1.2,
      "marketCap": "3.0T",
      "pe": 31.4,
      "analystRating": "Buy",
      "aiRating": "Buy",
      "aiScore": 81
    }
  ]
}
```

---

### 3.8 `GET /api/committee/analyze` and `POST /api/committee/analyze`

**Sprint 18A — Canonical Decision Architecture.** The committee is a debate/explanation layer, not an independent verdict engine. Its response never contains a `decision`/`action`/`verdict`-shaped field on its own (see `backend/services/canonicalVerdict.js`, which structurally strips any such key even if one somehow appeared). The one canonical action for a symbol, when one exists, comes only from a persisted `Recommendation` — surfaced here as `relatedRecommendation` and reflected in `canonicalVerdict`.

**Route**
- `/api/committee/analyze`

**HTTP method**
- `GET`, `POST`

**Request body**
- `symbol` optional string.
- `context` optional object.
- `intelligenceReport` optional object.
- `altDataSummary` optional object.
- `marketImpact` optional object.

**Response schema**
- `{ symbol, displaySymbol, committeeDebate: { generatedAt, eventHint, supportingArguments, opposingArguments, expertVotes, disagreementLevel, consensusLevel, expertsDisagree, disagreementExplanation, voteBreakdown, specialistObservations, synthesis }, trackRecord, relatedRecommendation, canonicalVerdict }`
  - `committeeDebate.expertVotes`: `Array<{ agent, vote, confidence, rationale }>` — each agent's raw vote on the original 6-way scale (`Strong Buy`…`Strong Sell`). This is the committee's individual-expert opinion, not a published aggregate verdict.
  - `committeeDebate.supportingArguments` / `opposingArguments`: `Array<{ agent, argument }>` — every bull/bear argument, tagged by the agent that raised it.
  - `committeeDebate.synthesis`: the CIO narrative (`executiveSummary`, `expectedReturn`, `risk`, `confidence`, `investmentHorizon`, `portfolioAllocationSuggestion`, `providerNotice`, `source`) with its `decision` field deliberately removed.
  - `relatedRecommendation`: `null`, or `{ id, action, confidenceScore, qualityScore, riskLabel, createdAt }` read from an ACTIVE `Recommendation` row when one exists for this symbol — the platform's one canonical call, shown at most once.
  - `canonicalVerdict`: `{ hasCanonicalRecommendation, action, confidenceScore, qualityScore, riskLabel, committeeDebate }` — the same assembly `buildCanonicalVerdictView` produces internally; `action` is `null` when no persisted recommendation exists yet (never a synthesized substitute).
  - `trackRecord`: unchanged shape, now a **frozen/legacy** view — see 3.9.

**Error responses**
- `500 { error: "Internal Server Error" }` via global error handler for uncaught failures.

**Authentication requirements**
- None.

**Validation rules**
- Symbol defaults to `NVDA`.
- Context objects are optional and may be partial.
- Internal service normalizes the asset class and may fetch quote context automatically.

**Example request**
```http
POST /api/committee/analyze
Content-Type: application/json

{
  "symbol": "NVDA",
  "context": {
    "quote": { "price": 130.4, "change": 2.1 },
    "news": [{ "headline": "AI capex remains strong" }]
  }
}
```

**Example response**
```json
{
  "symbol": "NVDA",
  "displaySymbol": "NVDA",
  "committeeDebate": {
    "generatedAt": "2026-07-12T12:00:00.000Z",
    "eventHint": "AI capex remains strong",
    "supportingArguments": [{ "agent": "Equity Analyst", "argument": "Business quality supports upside." }],
    "opposingArguments": [{ "agent": "Risk Manager", "argument": "Tail risk remains elevated." }],
    "expertVotes": [
      { "agent": "Macro Strategist", "vote": "Buy", "confidence": 70, "rationale": "Macro regime is currently risk-on." },
      { "agent": "Equity Analyst", "vote": "Buy", "confidence": 74, "rationale": "Business quality supports upside." }
    ],
    "disagreementLevel": 20,
    "consensusLevel": 80,
    "expertsDisagree": false,
    "disagreementExplanation": "Committee alignment is high enough to support a cleaner final recommendation.",
    "voteBreakdown": [{ "vote": "Buy", "count": 4 }],
    "specialistObservations": [
      { "agent": "Equity Analyst", "focus": ["Valuation"], "supportingEvidence": ["Analyst posture: Buy"], "unknowns": ["Future earnings quality is still uncertain."] }
    ],
    "synthesis": {
      "executiveSummary": "Balance of views points to buy with moderate conviction.",
      "expectedReturn": "12-18%",
      "risk": "Moderate",
      "confidence": 74,
      "investmentHorizon": "3-12 months",
      "portfolioAllocationSuggestion": "3-5% tactical allocation",
      "providerNotice": null,
      "source": "openai"
    }
  },
  "trackRecord": {
    "entries": [],
    "stats": {
      "totalDecisions": 12,
      "evaluatedDecisions": 4,
      "accuracy": 75,
      "winRate": 75,
      "confidenceCalibration": 81,
      "averageReturn": 6.12,
      "pendingEvaluations": 8
    }
  },
  "relatedRecommendation": { "id": "rec-1", "action": "BUY", "confidenceScore": 88, "qualityScore": 82, "riskLabel": "Low", "createdAt": "2026-07-12T11:30:00.000Z" },
  "canonicalVerdict": { "hasCanonicalRecommendation": true, "action": "BUY", "confidenceScore": 88, "qualityScore": 82, "riskLabel": "Low", "committeeDebate": { "...": "sanitized copy of committeeDebate above" } }
}
```

---

### 3.9 `GET /api/committee/track-record`

**Sprint 18A note:** this endpoint's underlying store (`backend/data/committeeTrackRecord.json`) is now **frozen** — `analyzeInvestmentCommittee` no longer writes new entries to it (that write, `upsertCommitteeDecision`, was removed as part of folding the committee into a debate layer; see 3.8). Existing historical entries remain fully readable via this endpoint, unchanged and undiscarded. A future Alpha Attribution Engine (see `INTELLIGENCE_PLATFORM_BLUEPRINT.md`) is the intended eventual replacement for real, ongoing committee/recommendation outcome tracking.

**Route**
- `/api/committee/track-record`

**HTTP method**
- `GET`

**Request body**
- None.
- Query parameter: `symbol` optional string.

**Response schema**
- `{ entries: Array<object>, stats: { totalDecisions, evaluatedDecisions, accuracy, winRate, confidenceCalibration, averageReturn, pendingEvaluations } }`

**Error responses**
- `500 { error: "Internal Server Error" }` via global error handler for uncaught failures.

**Authentication requirements**
- None.

**Validation rules**
- Symbol filter is optional.
- Entries are enriched with live quote data when possible. The entry set itself no longer grows — it reflects committee decisions made before Sprint 18A only.

**Example request**
```http
GET /api/committee/track-record?symbol=NVDA
```

**Example response**
```json
{
  "entries": [
    {
      "symbol": "NVDA",
      "displaySymbol": "NVDA",
      "generatedAt": "2026-07-11T12:00:00.000Z",
      "finalDecision": "Buy",
      "confidence": 74,
      "entryPrice": 120.5,
      "expectedReturn": "+12%",
      "disagreementScore": 20,
      "assetClass": "stock",
      "currentPrice": 130.4,
      "currentReturn": 8.21,
      "accuracy": 1
    }
  ],
  "stats": {
    "totalDecisions": 12,
    "evaluatedDecisions": 4,
    "accuracy": 75,
    "winRate": 75,
    "confidenceCalibration": 81,
    "averageReturn": 6.12,
    "pendingEvaluations": 8
  }
}
```

---

### 3.10 `GET /api/portfolio`

**Route**
- `/api/portfolio`

**HTTP method**
- `GET`

**Request body**
- None.

**Response schema**
- `{ portfolio: { totalValue, change, allocations: Array<{ name, value, allocation }> } }`

**Error responses**
- `500 { error: "Internal Server Error" }` via global error handler for uncaught failures.

**Authentication requirements**
- None.

**Validation rules**
- None; this is a fixed legacy mock response.

**Example request**
```http
GET /api/portfolio
```

**Example response**
```json
{
  "portfolio": {
    "totalValue": 1240000,
    "change": 11.8,
    "allocations": [
      { "name": "Growth Leaders", "value": 520000, "allocation": 42 },
      { "name": "Energy Transition", "value": 310000, "allocation": 25 },
      { "name": "Defensive Income", "value": 240000, "allocation": 19 },
      { "name": "Cash Reserve", "value": 170000, "allocation": 14 }
    ]
  }
}
```

---

### 3.11 `GET /api/alt-data/cot`

**Route**
- `/api/alt-data/cot`

**HTTP method**
- `GET`

**Request body**
- None.
- Query parameter: `symbol` optional string, defaults to `AAPL`.

**Response schema**
- `{ symbol: string, cot: { asset, market, commercialLong, commercialShort, nonCommercialLong, nonCommercialShort, netPositioning, weeklyChange, signal, source } }`

**Error responses**
- Fallback data is usually returned; unexpected failures go to `500`.

**Authentication requirements**
- None.

**Validation rules**
- Symbol is uppercased.
- Asset inference is based on the symbol.

**Example request**
```http
GET /api/alt-data/cot?symbol=NVDA
```

**Example response**
```json
{
  "symbol": "NVDA",
  "cot": {
    "asset": "equities",
    "market": "S&P 500 E-mini",
    "commercialLong": 245331,
    "commercialShort": 268901,
    "nonCommercialLong": 198533,
    "nonCommercialShort": 154442,
    "netPositioning": 44091,
    "weeklyChange": 3211,
    "signal": "Bullish buildup",
    "source": "cftc"
  }
}
```

---

### 3.12 `GET /api/alt-data/polymarket`

**Route**
- `/api/alt-data/polymarket`

**HTTP method**
- `GET`

**Request body**
- None.
- Query parameter: `symbol` optional string, defaults to `AAPL`.

**Response schema**
- `{ symbol: string, polymarket: Array<{ event, category, probability, volume, liquidity, trend, relatedSectors, relatedTickers, source }> }`

**Error responses**
- Fallback array is usually returned; unexpected failures go to `500`.

**Authentication requirements**
- None.

**Validation rules**
- Symbol is uppercased.
- Event-related tickers and sectors are inferred from the symbol and event text.

**Example request**
```http
GET /api/alt-data/polymarket?symbol=BTC
```

**Example response**
```json
{
  "symbol": "BTC",
  "polymarket": [
    {
      "event": "Will BTC close above $100k this quarter?",
      "category": "Crypto",
      "probability": 0.54,
      "volume": 1820000,
      "liquidity": 840000,
      "trend": "Stable",
      "relatedSectors": ["crypto"],
      "relatedTickers": ["BTC", "COIN", "MSTR"],
      "source": "fallback"
    }
  ]
}
```

---

### 3.13 `GET /api/alt-data/macro`

**Route**
- `/api/alt-data/macro`

**HTTP method**
- `GET`

**Request body**
- None.

**Response schema**
- `{ macro: { rates, cpi, unemployment, m2, tenYearYield, regime, source } }`

**Error responses**
- Fallback macro regime is usually returned; unexpected failures go to `500`.

**Authentication requirements**
- None.

**Validation rules**
- None.

**Example request**
```http
GET /api/alt-data/macro
```

**Example response**
```json
{
  "macro": {
    "rates": { "id": "FEDFUNDS", "latest": 5.25, "previous": 5.25, "change": 0, "asOf": "n/a" },
    "cpi": { "id": "CPIAUCSL", "latest": 313.5, "previous": 312.8, "change": 0.7, "asOf": "n/a" },
    "unemployment": { "id": "UNRATE", "latest": 4.1, "previous": 4.0, "change": 0.1, "asOf": "n/a" },
    "m2": { "id": "M2SL", "latest": 20900, "previous": 20840, "change": 60, "asOf": "n/a" },
    "tenYearYield": { "id": "DGS10", "latest": 4.25, "previous": 4.19, "change": 0.06, "asOf": "n/a" },
    "regime": {
      "riskMode": "risk-on",
      "inflationPressure": "moderate",
      "recessionRisk": "medium",
      "liquidityTrend": "improving"
    },
    "source": "fallback"
  }
}
```

---

### 3.14 `GET /api/alt-data/sec`

**Route**
- `/api/alt-data/sec`

**HTTP method**
- `GET`

**Request body**
- None.
- Query parameter: `symbol` optional string, defaults to `AAPL`.

**Response schema**
- `{ symbol: string, sec: { symbol, filings: Array<{ form, filedAt, accessionNumber, primaryDocument }>, signal, source } }`

**Error responses**
- Fallback SEC data is usually returned; unexpected failures go to `500`.

**Authentication requirements**
- None.

**Validation rules**
- Symbol is uppercased.

**Example request**
```http
GET /api/alt-data/sec?symbol=NVDA
```

**Example response**
```json
{
  "symbol": "NVDA",
  "sec": {
    "symbol": "NVDA",
    "filings": [
      { "form": "10-Q", "filedAt": "N/A", "accessionNumber": "N/A", "primaryDocument": "N/A" },
      { "form": "8-K", "filedAt": "N/A", "accessionNumber": "N/A", "primaryDocument": "N/A" }
    ],
    "signal": "No live SEC feed available for NVDA. Monitoring for material filings.",
    "source": "fallback"
  }
}
```

---

### 3.15 `GET /api/alt-data/congress`

**Route**
- `/api/alt-data/congress`

**HTTP method**
- `GET`

**Request body**
- None.
- Query parameter: `symbol` optional string, defaults to `AAPL`.

**Response schema**
- `{ symbol: string, congress: { symbol, trades: Array<{ politician, asset, ticker, sector, transactionType, amount, date }>, signal, source } }`

**Error responses**
- Fallback congressional trade data is usually returned; unexpected failures go to `500`.

**Authentication requirements**
- None.

**Validation rules**
- Symbol is uppercased.

**Example request**
```http
GET /api/alt-data/congress?symbol=AAPL
```

**Example response**
```json
{
  "symbol": "AAPL",
  "congress": {
    "symbol": "AAPL",
    "trades": [
      {
        "politician": "Unknown",
        "asset": "Apple Inc.",
        "ticker": "AAPL",
        "sector": "technology",
        "transactionType": "Buy",
        "amount": "$1,001 - $15,000",
        "date": "2026-07-01"
      }
    ],
    "signal": "1 recent disclosed congress trades mention AAPL.",
    "source": "house-stock-watcher"
  }
}
```

---

### 3.16 `GET /api/alt-data/events`

**Route**
- `/api/alt-data/events`

**HTTP method**
- `GET`

**Request body**
- None.
- Query parameter: `symbol` optional string, defaults to `AAPL`.

**Response schema**
- `{ symbol: string, events: Array<{ date, event, category, importance, relatedTickers, relatedSectors, source }> }`

**Error responses**
- Fallback event data is usually returned; unexpected failures go to `500`.

**Authentication requirements**
- None.

**Validation rules**
- Symbol is uppercased.

**Example request**
```http
GET /api/alt-data/events?symbol=AAPL
```

**Example response**
```json
{
  "symbol": "AAPL",
  "events": [
    {
      "date": "2026-07-12",
      "event": "US CPI Release",
      "category": "Macro",
      "importance": "High",
      "relatedTickers": ["AAPL", "SPY"],
      "relatedSectors": ["technology"],
      "source": "fallback"
    }
  ]
}
```

---

### 3.17 `GET /api/alt-data/summary`

**Route**
- `/api/alt-data/summary`

**HTTP method**
- `GET`

**Request body**
- None.
- Query parameter: `symbol` optional string, defaults to `AAPL`.

**Response schema**
- `{ symbol, cot, polymarket, macro, sec, congress, events, placeholders, signals }`

**Error responses**
- Fallback summary data is usually returned; unexpected failures go to `500`.

**Authentication requirements**
- None.

**Validation rules**
- Symbol is uppercased.
- The summary is built from the other alt-data endpoints.

**Example request**
```http
GET /api/alt-data/summary?symbol=AAPL
```

**Example response**
```json
{
  "symbol": "AAPL",
  "cot": { "asset": "equities", "signal": "Bullish buildup" },
  "polymarket": [{ "event": "Will the Fed cut rates by year-end?" }],
  "macro": { "regime": { "riskMode": "risk-on" } },
  "sec": { "signal": "..." },
  "congress": { "signal": "..." },
  "events": [{ "event": "US CPI Release" }],
  "placeholders": {
    "optionsFlow": { "status": "not_connected", "provider": "pending", "message": "Options flow provider is not connected yet." },
    "onChain": { "status": "not_connected", "provider": "pending", "message": "On-chain provider is not connected yet." }
  },
  "signals": {
    "symbol": "AAPL",
    "smartMoneyPositioning": { "signal": "Bullish buildup" },
    "predictionMarketProbabilities": { "event": "Will the Fed cut rates by year-end?" },
    "macroRegime": { "riskMode": "risk-on" },
    "secFilingSignal": "...",
    "politicalTradingSignal": "...",
    "optionsStatus": { "status": "not_connected" },
    "onChainStatus": { "status": "not_connected" },
    "upcomingEventRisk": [],
    "impactedSectors": ["technology"],
    "relatedTickers": ["AAPL", "SPY"],
    "confidenceScore": 78
  }
}
```

---

### 3.18 `GET /api/intelligence/analyze` and `POST /api/intelligence/analyze`

**Route**
- `/api/intelligence/analyze`

**HTTP method**
- `GET`, `POST`

**Request body**
- `event` optional string, defaults to `Fed rate hike`.
- `symbol` optional string, defaults to `AAPL`.

**Response schema**
- `{ event, symbol, confidenceScore, timeHorizon, historicalSimilarity, affected, relationshipGraph, scenario, sectorPropagation, explainability }`

**Error responses**
- `500 { error: "Internal Server Error" }` for uncaught failures.

**Authentication requirements**
- None.

**Validation rules**
- Event and symbol default values are used if omitted.
- Symbol is uppercased.

**Example request**
```http
GET /api/intelligence/analyze?event=Fed%20rate%20hike&symbol=AAPL
```

**Example response**
```json
{
  "event": "Fed rate hike",
  "symbol": "AAPL",
  "confidenceScore": 74,
  "timeHorizon": "1-3 months",
  "historicalSimilarity": [{ "event": "2018 rate hike cycle", "similarity": 78 }],
  "affected": {
    "stocks": ["JPM", "AAPL", "NVDA", "TLT"],
    "sectors": ["Technology", "Semiconductors"],
    "countries": ["US", "EU"]
  },
  "relationshipGraph": {},
  "scenario": {},
  "sectorPropagation": [],
  "explainability": {
    "why": "The event 'Fed rate hike' affects cross-asset pricing through macro regime, positioning, and liquidity channels.",
    "supportingEvidence": [],
    "dataSourcesUsed": ["altData", "historicalMatches"],
    "confidence": 74,
    "possibleRisks": []
  }
}
```

---

### 3.19 `GET /api/intelligence/impact` and `POST /api/intelligence/impact`

**Route**
- `/api/intelligence/impact`

**HTTP method**
- `GET`, `POST`

**Request body**
- `event` optional string, defaults to `Fed rate hike`.
- `symbol` optional string, defaults to `AAPL`.

**Response schema**
- `{ event, confidenceScore, timeHorizon, affected, relationshipGraph, sectorPropagation }`

**Error responses**
- `500 { error: "Internal Server Error" }` for uncaught failures.

**Authentication requirements**
- None.

**Validation rules**
- Defaults are applied when event or symbol are missing.

**Example request**
```http
GET /api/intelligence/impact?event=Oil%20spike&symbol=XOM
```

**Example response**
```json
{
  "event": "Oil spike",
  "confidenceScore": 69,
  "timeHorizon": "1-3 months",
  "affected": {
    "stocks": ["XOM", "CVX", "DAL", "LUV"],
    "sectors": ["Energy", "Airlines", "Shipping", "Consumer"],
    "countries": ["US", "Global"]
  },
  "relationshipGraph": {},
  "sectorPropagation": []
}
```

---

### 3.20 `GET /api/intelligence/history` and `POST /api/intelligence/history`

**Route**
- `/api/intelligence/history`

**HTTP method**
- `GET`, `POST`

**Request body**
- `event` optional string, defaults to `Fed rate hike`.

**Response schema**
- `{ event, matches: Array<object> }`

**Error responses**
- `500 { error: "Internal Server Error" }` for uncaught failures.

**Authentication requirements**
- None.

**Validation rules**
- Event defaults to `Fed rate hike`.

**Example request**
```http
GET /api/intelligence/history?event=Oil%20spike
```

**Example response**
```json
{
  "event": "Oil spike",
  "matches": [
    { "event": "1970s oil shock", "similarity": 82 }
  ]
}
```

---

### 3.21 `GET /api/intelligence/scenario` and `POST /api/intelligence/scenario`

**Route**
- `/api/intelligence/scenario`

**HTTP method**
- `GET`, `POST`

**Request body**
- `event` optional string, defaults to `Fed rate hike`.

**Response schema**
- `{ event, scenario: object }`

**Error responses**
- `500 { error: "Internal Server Error" }` for uncaught failures.

**Authentication requirements**
- None.

**Validation rules**
- Event defaults to `Fed rate hike`.

**Example request**
```http
POST /api/intelligence/scenario
Content-Type: application/json

{ "event": "BTC ETF approval" }
```

**Example response**
```json
{
  "event": "BTC ETF approval",
  "scenario": {
    "baseCase": "...",
    "bullCase": "...",
    "bearCase": "..."
  }
}
```

---

### 3.22 `POST /api/intelligence/portfolio`

**Route**
- `/api/intelligence/portfolio`

**HTTP method**
- `POST`

**Request body**
- `holdings` required array of objects.
- Each holding object should contain at least `symbol` and `weight`.

**Response schema**
- `{ portfolioExposure: Array<{ symbol, weight, sector, country, beta, macro }>, sectorConcentration: Array<{ name, weight }>, countryExposure: Array<{ name, weight }>, riskConcentration: { betaWeighted, topPosition }, macroExposure: Array<{ name, weight }>, aiSuggestions: string[] }`

**Error responses**
- `500 { error: "Internal Server Error" }` for uncaught failures.

**Authentication requirements**
- None.

**Validation rules**
- Holdings are normalized; missing or invalid weight values default to `0`.
- Empty holdings produce normalized empty/default results.

**Example request**
```http
POST /api/intelligence/portfolio
Content-Type: application/json

{
  "holdings": [
    { "symbol": "AAPL", "weight": 0.4 },
    { "symbol": "NVDA", "weight": 0.6 }
  ]
}
```

**Example response**
```json
{
  "portfolioExposure": [
    { "symbol": "AAPL", "weight": 0.4, "sector": "Technology", "country": "US", "beta": 1.1, "macro": "growth" },
    { "symbol": "NVDA", "weight": 0.6, "sector": "Semiconductors", "country": "US", "beta": 1.4, "macro": "ai" }
  ],
  "sectorConcentration": [
    { "name": "Semiconductors", "weight": 0.6 },
    { "name": "Technology", "weight": 0.4 }
  ],
  "countryExposure": [{ "name": "US", "weight": 1 }],
  "riskConcentration": { "betaWeighted": 1.28, "topPosition": { "symbol": "NVDA", "weight": 0.6, "sector": "Semiconductors", "country": "US", "beta": 1.4, "macro": "ai" } },
  "macroExposure": [{ "name": "ai", "weight": 0.6 }, { "name": "growth", "weight": 0.4 }],
  "aiSuggestions": [
    "Diversify high-conviction positions across at least two non-correlated sectors.",
    "Monitor macro-sensitive exposures when rates and inflation signals diverge.",
    "Use event-driven hedging around high-impact macro calendar dates."
  ]
}
```

---

### 3.23 `GET /api/intelligence/daily-brief` and `POST /api/intelligence/daily-brief`

**Route**
- `/api/intelligence/daily-brief`

**HTTP method**
- `GET`, `POST`

**Request body**
- `watchlist` optional comma-separated string or array-like string, defaults to `AAPL,NVDA,TSLA`.
- `scenarios` optional comma-separated string, defaults to `Oil spike,Fed rate hike,BTC ETF approval,Israel conflict`.
- `sessionType` optional string, defaults to `morning`.

**Response schema**
- `{ generatedAt, sessionType, overnightMarketChanges, topMarketMovingEvents, impactedSectors, impactedTickers, portfolioWatchlistExposure, topRisks, topOpportunities, whatToMonitorToday, relevanceItems, actionCards, dataModel, altSignalsSnapshot, whatChangedSinceYesterday, aiSummary }`

**Error responses**
- `500 { error: "Internal Server Error" }` for uncaught failures.

**Authentication requirements**
- None.

**Validation rules**
- Watchlist and scenarios are parsed from CSV-like strings.
- Watchlist defaults to `AAPL,NVDA,TSLA` if omitted.
- Session type defaults to `morning`.

**Example request**
```http
GET /api/intelligence/daily-brief?watchlist=AAPL,NVDA,TSLA&sessionType=morning
```

**Example response**
```json
{
  "generatedAt": "2026-07-11T12:00:00.000Z",
  "sessionType": "morning",
  "overnightMarketChanges": [
    { "symbol": "AAPL", "change": 1.2, "price": 192.5, "trend": "up" }
  ],
  "topMarketMovingEvents": [
    { "event": "Fed rate hike", "importanceScore": 84, "urgency": "high", "impactType": "risk" }
  ],
  "impactedSectors": ["Technology", "Semiconductors"],
  "impactedTickers": ["AAPL", "NVDA"],
  "portfolioWatchlistExposure": {
    "portfolioExposure": []
  },
  "topRisks": ["Macro rates can pressure growth valuations."],
  "topOpportunities": ["Defensives may attract rotation."],
  "whatToMonitorToday": ["Fed rate hike (high urgency, risk)"],
  "relevanceItems": [],
  "actionCards": [],
  "dataModel": {
    "morningBrief": { "supported": true, "generatedAt": "2026-07-11T12:00:00.000Z" },
    "marketCloseRecap": { "supported": true, "generatedAt": null },
    "weeklySummary": { "supported": true, "generatedAt": null }
  },
  "altSignalsSnapshot": {},
  "whatChangedSinceYesterday": ["No material regime shift detected vs the prior brief snapshot."],
  "aiSummary": {
    "executiveSummary": "Overnight conditions suggest selective risk-taking.",
    "keyRisks": [],
    "keyOpportunities": [],
    "watchlistImpact": "AAPL: +1.20%",
    "todaysFocus": ["Monitor macro catalysts and watchlist volatility."],
    "confidenceScore": 68,
    "providerNotice": null,
    "source": "openai"
  }
}
```

---

### 3.24 `GET /api/intelligence/overview` and `POST /api/intelligence/overview`

**Route**
- `/api/intelligence/overview`

**HTTP method**
- `GET`, `POST`

**Request body**
- `watchlist` optional comma-separated string, defaults to `AAPL,NVDA,TSLA`.
- `scenarios` optional comma-separated string, defaults to `Oil spike,Fed rate hike,BTC ETF approval,Israel conflict`.
- `sessionType` optional string, defaults to `morning`.

**Response schema**
- `{ generatedAt, watchlist, scanCoverage, pipeline, feed, changeWindows, alerts, watchlistRankings, globalMap, decisionCenter, alphaDiscovery, dailyBrief, portfolioExposure, homepageAnswers }`

**Error responses**
- `500 { error: "Internal Server Error" }` for uncaught failures.

**Authentication requirements**
- None.

**Validation rules**
- Watchlist and scenarios are normalized from comma-separated values.
- Empty watchlist defaults to `AAPL,NVDA,TSLA`.

**Example request**
```http
GET /api/intelligence/overview?watchlist=AAPL,NVDA,TSLA
```

**Example response**
```json
{
  "generatedAt": "2026-07-11T12:00:00.000Z",
  "watchlist": ["AAPL", "NVDA", "TSLA"],
  "scanCoverage": [
    { "scanType": "macro", "status": "active", "sourceCount": 4, "examples": ["Fed rate hike", "Global macro scan"] }
  ],
  "pipeline": {
    "stages": [
      "Event Detection",
      "Event Classification",
      "Importance Scoring",
      "Market Impact Prediction",
      "Portfolio Impact Prediction",
      "Historical Comparison",
      "AI Explanation",
      "Dashboard Delivery"
    ],
    "processedEvents": 28
  },
  "feed": [],
  "changeWindows": {},
  "alerts": [],
  "watchlistRankings": [],
  "globalMap": {},
  "decisionCenter": {},
  "alphaDiscovery": {},
  "dailyBrief": {},
  "portfolioExposure": {},
  "homepageAnswers": {
    "whatMattersToday": "No dominant event detected.",
    "whereMoneyIsFlowing": "Cross-asset flows are balanced.",
    "whatChanged": "No major change window event detected.",
    "whatShouldIBuy": null,
    "whatShouldIAvoid": null,
    "biggestGlobalRisk": null
  }
}
```

---

### 3.25 `GET /api/intelligence/live-feed`

**Route**
- `/api/intelligence/live-feed`

**HTTP method**
- `GET`

**Request body**
- None.
- Query parameter: `watchlist` optional CSV string, defaults to `AAPL,NVDA,TSLA`.

**Response schema**
- `{ generatedAt, feed, alerts }`

**Error responses**
- `500 { error: "Internal Server Error" }` for uncaught failures.

**Authentication requirements**
- None.

**Validation rules**
- Watchlist is CSV-parsed and defaulted when omitted.

**Example request**
```http
GET /api/intelligence/live-feed?watchlist=AAPL,NVDA,TSLA
```

**Example response**
```json
{
  "generatedAt": "2026-07-11T12:00:00.000Z",
  "feed": [
    {
      "headline": "Fed rate hike",
      "importanceScore": 84,
      "whyItMatters": "..."
    }
  ],
  "alerts": [
    {
      "headline": "Fed rate hike",
      "importanceScore": 84,
      "riskLevel": "high"
    }
  ]
}
```

---

### 3.26 `GET /api/intelligence/changes`

**Route**
- `/api/intelligence/changes`

**HTTP method**
- `GET`

**Request body**
- None.
- Query parameter: `watchlist` optional CSV string, defaults to `AAPL,NVDA,TSLA`.

**Response schema**
- `{ generatedAt, changeWindows }`

**Error responses**
- `500 { error: "Internal Server Error" }` for uncaught failures.

**Authentication requirements**
- None.

**Validation rules**
- Watchlist is CSV-parsed and defaulted when omitted.

**Example request**
```http
GET /api/intelligence/changes?watchlist=AAPL,NVDA,TSLA
```

**Example response**
```json
{
  "generatedAt": "2026-07-11T12:00:00.000Z",
  "changeWindows": {
    "last15Minutes": ["Fed rate hike | ..."],
    "lastHour": ["Fed rate hike | medium actionability"],
    "sinceMarketOpen": ["Fed rate hike | high risk"],
    "overnight": ["Fed rate hike | global"],
    "weekly": ["Fed rate hike"]
  }
}
```

---

### 3.27 `GET /api/intelligence/watchlist-priority`

**Route**
- `/api/intelligence/watchlist-priority`

**HTTP method**
- `GET`

**Request body**
- None.
- Query parameter: `watchlist` optional CSV string, defaults to `AAPL,NVDA,TSLA`.

**Response schema**
- `{ generatedAt, watchlistRankings }`

**Error responses**
- `500 { error: "Internal Server Error" }` for uncaught failures.

**Authentication requirements**
- None.

**Validation rules**
- Watchlist is CSV-parsed and defaulted when omitted.

**Example request**
```http
GET /api/intelligence/watchlist-priority?watchlist=AAPL,NVDA,TSLA
```

**Example response**
```json
{
  "generatedAt": "2026-07-11T12:00:00.000Z",
  "watchlistRankings": [
    {
      "symbol": "NVDA",
      "opportunityScore": 82,
      "riskScore": 41,
      "momentum": 67,
      "institutionalActivity": 71,
      "predictionMarketSignal": 58,
      "macroExposure": 63,
      "eventExposure": 74,
      "overallAiScore": 78,
      "primaryDriver": "NVDA AI demand acceleration",
      "explanation": "..."
    }
  ]
}
```

---

### 3.28 `GET /api/intelligence/global-map`

**Route**
- `/api/intelligence/global-map`

**HTTP method**
- `GET`

**Request body**
- None.
- Query parameter: `watchlist` optional CSV string, defaults to `AAPL,NVDA,TSLA`.

**Response schema**
- `{ generatedAt, globalMap }`

**Error responses**
- `500 { error: "Internal Server Error" }` for uncaught failures.

**Authentication requirements**
- None.

**Validation rules**
- Watchlist is CSV-parsed and defaulted when omitted.

**Example request**
```http
GET /api/intelligence/global-map?watchlist=AAPL,NVDA,TSLA
```

**Example response**
```json
{
  "generatedAt": "2026-07-11T12:00:00.000Z",
  "globalMap": {
    "majorGlobalEvents": [],
    "countriesAffected": ["US"],
    "countries": [],
    "sectorPropagation": [],
    "capitalFlows": [],
    "macroRegime": {},
    "currentMarketSentiment": {
      "classification": "Stable",
      "confidence": 68,
      "fearGreedProxy": 68
    }
  }
}
```

---

### 3.29 `GET /api/intelligence/decision-center`

**Route**
- `/api/intelligence/decision-center`

**HTTP method**
- `GET`

**Request body**
- None.
- Query parameter: `watchlist` optional CSV string, defaults to `AAPL,NVDA,TSLA`.

**Response schema**
- `{ generatedAt, decisionCenter }`

**Error responses**
- `500 { error: "Internal Server Error" }` for uncaught failures.

**Authentication requirements**
- None.

**Validation rules**
- Watchlist is CSV-parsed and defaulted when omitted.

**Example request**
```http
GET /api/intelligence/decision-center?watchlist=AAPL,NVDA,TSLA
```

**Example response**
```json
{
  "generatedAt": "2026-07-11T12:00:00.000Z",
  "decisionCenter": {
    "highestConvictionIdeas": [],
    "biggestRisks": [],
    "mostImportantMacroEvent": null,
    "mostImportantCompanyEvent": null,
    "sectorRotation": [],
    "capitalFlow": [],
    "mostImportantNewsIgnoredByMarkets": null
  }
}
```

---

### 3.30 `GET /api/intelligence/alpha-discovery`

**Route**
- `/api/intelligence/alpha-discovery`

**HTTP method**
- `GET`

**Request body**
- None.
- Query parameter: `watchlist` optional CSV string, defaults to `AAPL,NVDA,TSLA`.

**Response schema**
- `{ generatedAt, alphaDiscovery, homepageAnswers, scanCoverage }`

**Error responses**
- `500 { error: "Internal Server Error" }` for uncaught failures.

**Authentication requirements**
- None.

**Validation rules**
- Watchlist is CSV-parsed and defaulted when omitted.

**Example request**
```http
GET /api/intelligence/alpha-discovery?watchlist=AAPL,NVDA,TSLA
```

**Example response**
```json
{
  "generatedAt": "2026-07-11T12:00:00.000Z",
  "alphaDiscovery": {
    "top10InvestmentIdeas": [],
    "top10Risks": [],
    "topMacroThemes": [],
    "topSectors": [],
    "capitalRotation": [],
    "institutionalPositioning": {},
    "hiddenOpportunities": [],
    "emergingNarratives": [],
    "contrarianOpportunities": []
  },
  "homepageAnswers": {
    "whatMattersToday": "No dominant event detected.",
    "whereMoneyIsFlowing": "Cross-asset flows are balanced.",
    "whatChanged": "No major change window event detected.",
    "whatShouldIBuy": null,
    "whatShouldIAvoid": null,
    "biggestGlobalRisk": null
  },
  "scanCoverage": [
    { "scanType": "macro", "status": "active", "sourceCount": 4, "examples": ["Fed rate hike", "Global macro scan"] }
  ]
}
```

---

### 3.31 `GET /api/v2/portfolio`

**Route**
- `/api/v2/portfolio`

**HTTP method**
- `GET`

**Request body**
- None.

**Response schema**
- `{ portfolioId, cashBalance, startingCapital, positionsValue, totalValue, realizedPnl, unrealizedPnl, totalReturn, totalReturnPct, positions: Array<object>, allocation: { bySector, byAssetType }, benchmarkSymbol, updatedAt }`

**Error responses**
- `400 { error: "..." }` for known request/state issues.
- `500 { error: "Internal Server Error" }` for uncaught failures.

**Authentication requirements**
- None in current implementation.

**Validation rules**
- Default portfolio is auto-created on first access.
- Live prices are fetched for open positions where possible.

**Example request**
```http
GET /api/v2/portfolio
```

**Example response**
```json
{
  "portfolioId": "uuid",
  "cashBalance": 100000,
  "startingCapital": 100000,
  "positionsValue": 0,
  "totalValue": 100000,
  "realizedPnl": 0,
  "unrealizedPnl": 0,
  "totalReturn": 0,
  "totalReturnPct": 0,
  "positions": [],
  "allocation": { "bySector": [], "byAssetType": [] },
  "benchmarkSymbol": "SPY",
  "updatedAt": "2026-07-11T12:00:00.000Z"
}
```

---

### 3.32 `POST /api/v2/portfolio/orders`

**Route**
- `/api/v2/portfolio/orders`

**HTTP method**
- `POST`

**Request body**
- `{ symbol: string, side: "BUY" | "SELL", quantity: number, sector?: string, assetType?: string }`

**Response schema**
- `{ order, trade, position }`

**Error responses**
- `400 { error: "A symbol is required." }`
- `400 { error: "side must be BUY or SELL." }`
- `400 { error: "quantity must be a positive whole number of shares." }`
- `400 { error: "No live price available for SYMBOL." }`
- `400 { error: "Insufficient cash balance ..." }`
- `400 { error: "Cannot sell ... position only holds N." }`
- `500 { error: "Internal Server Error" }` for uncaught failures.

**Authentication requirements**
- None in current implementation.

**Validation rules**
- `symbol` is required and uppercased.
- `side` must be `BUY` or `SELL`.
- `quantity` must be a positive whole number.
- Live quote must exist for the symbol.
- Sell orders cannot exceed current holdings.

**Example request**
```http
POST /api/v2/portfolio/orders
Content-Type: application/json

{ "symbol": "SOFI", "side": "BUY", "quantity": 20 }
```

**Example response**
```json
{
  "order": {
    "id": "order-id",
    "symbol": "SOFI",
    "side": "BUY",
    "quantity": 20,
    "requestedPrice": 50,
    "status": "FILLED"
  },
  "trade": {
    "id": "trade-id",
    "symbol": "SOFI",
    "side": "BUY",
    "quantity": 20,
    "price": 50,
    "realizedPnl": null
  },
  "position": {
    "id": "position-id",
    "symbol": "SOFI",
    "quantity": 20,
    "avgEntryPrice": 50
  }
}
```

---

### 3.33 `GET /api/v2/portfolio/trades`

**Route**
- `/api/v2/portfolio/trades`

**HTTP method**
- `GET`

**Request body**
- None.
- Query parameter: `limit` optional number.

**Response schema**
- `{ trades: Array<{ id, symbol, side, quantity, price, realizedPnl, executedAt }> }`

**Error responses**
- `400 { error: "..." }` for known request issues.
- `500 { error: "Internal Server Error" }` otherwise.

**Authentication requirements**
- None.

**Validation rules**
- `limit` is optional and coerced to a number.

**Example request**
```http
GET /api/v2/portfolio/trades?limit=10
```

**Example response**
```json
{
  "trades": [
    {
      "id": "trade-id",
      "symbol": "SOFI",
      "side": "BUY",
      "quantity": 20,
      "price": 50,
      "realizedPnl": null,
      "executedAt": "2026-07-11T12:00:00.000Z"
    }
  ]
}
```

---

### 3.34 `GET /api/v2/portfolio/transactions`

**Route**
- `/api/v2/portfolio/transactions`

**HTTP method**
- `GET`

**Request body**
- None.
- Query parameter: `limit` optional number.

**Response schema**
- `{ transactions: Array<{ id, type, amount, balanceAfter, relatedTradeId, description, createdAt }> }`

**Error responses**
- `400 { error: "..." }` for known request issues.
- `500 { error: "Internal Server Error" }` otherwise.

**Authentication requirements**
- None.

**Validation rules**
- `limit` is optional and coerced to a number.

**Example request**
```http
GET /api/v2/portfolio/transactions?limit=10
```

**Example response**
```json
{
  "transactions": [
    {
      "id": "ledger-id",
      "type": "TRADE_DEBIT",
      "amount": -1000,
      "balanceAfter": 99000,
      "relatedTradeId": "trade-id",
      "description": "Bought 20 SOFI @ $50.00",
      "createdAt": "2026-07-11T12:00:00.000Z"
    }
  ]
}
```

---

### 3.35 `GET /api/v2/portfolio/performance`

**Route**
- `/api/v2/portfolio/performance`

**HTTP method**
- `GET`

**Request body**
- None.
- Query parameter: `limit` optional number.

**Response schema**
- `{ timeline: Array<{ capturedAt, totalValue, cashBalance, positionsValue, realizedPnl, unrealizedPnl, totalReturnPct, benchmarkReturnPct }> }`

**Error responses**
- `400 { error: "..." }` for known request issues.
- `500 { error: "Internal Server Error" }` otherwise.

**Authentication requirements**
- None.

**Validation rules**
- `limit` is optional and coerced to a number.

**Example request**
```http
GET /api/v2/portfolio/performance?limit=20
```

**Example response**
```json
{
  "timeline": [
    {
      "capturedAt": "2026-07-11T12:00:00.000Z",
      "totalValue": 100000,
      "cashBalance": 99500,
      "positionsValue": 500,
      "realizedPnl": 0,
      "unrealizedPnl": 0,
      "totalReturnPct": 0,
      "benchmarkReturnPct": null
    }
  ]
}
```

---

### 3.36 `POST /api/v2/portfolio/performance/snapshot`

**Route**
- `/api/v2/portfolio/performance/snapshot`

**HTTP method**
- `POST`

**Request body**
- None.

**Response schema**
- `{ capturedAt, totalValue, cashBalance, positionsValue, realizedPnl, unrealizedPnl, totalReturnPct, benchmarkReturnPct }`

**Error responses**
- `400 { error: "..." }` for known request issues.
- `500 { error: "Internal Server Error" }` otherwise.

**Authentication requirements**
- None.

**Validation rules**
- Uses current portfolio summary to create a point-in-time snapshot.

**Example request**
```http
POST /api/v2/portfolio/performance/snapshot
```

**Example response**
```json
{
  "capturedAt": "2026-07-11T12:00:00.000Z",
  "totalValue": 100000,
  "cashBalance": 99500,
  "positionsValue": 500,
  "realizedPnl": 0,
  "unrealizedPnl": 0,
  "totalReturnPct": 0,
  "benchmarkReturnPct": null
}
```

---

### 3.37 `POST /api/v2/portfolio/reset`

**Route**
- `/api/v2/portfolio/reset`

**HTTP method**
- `POST`

**Request body**
- None.

**Response schema**
- Same as `GET /api/v2/portfolio` summary response.

**Error responses**
- `400 { error: "..." }` for known request issues.
- `500 { error: "Internal Server Error" }` otherwise.

**Authentication requirements**
- None.

**Validation rules**
- Resets the active default portfolio back to initial cash and empty positions.

**Example request**
```http
POST /api/v2/portfolio/reset
```

**Example response**
```json
{
  "portfolioId": "uuid",
  "cashBalance": 100000,
  "startingCapital": 100000,
  "positionsValue": 0,
  "totalValue": 100000,
  "realizedPnl": 0,
  "unrealizedPnl": 0,
  "totalReturn": 0,
  "totalReturnPct": 0,
  "positions": [],
  "allocation": { "bySector": [], "byAssetType": [] },
  "benchmarkSymbol": "SPY",
  "updatedAt": "2026-07-11T12:00:00.000Z"
}
```

---

### 3.38 `POST /api/chat/ask`

**Route**
- `/api/chat/ask`

**HTTP method**
- `POST`

**Request body**
- `{ question: string, context?: object }`

**Response schema**
- `{ question: string, answer: string, source: "openai" | "fallback", providerNotice?: string, providerError?: string }`

**Error responses**
- `400 { error: "A question is required." }`
- `500 { error: "Internal Server Error" }` for uncaught failures.

**Authentication requirements**
- None.

**Validation rules**
- `question` is required and must be non-empty after trimming.
- Context is optional and may be partial.

**Example request**
```http
POST /api/chat/ask
Content-Type: application/json

{
  "question": "What changed in semis today?",
  "context": {
    "watchlist": ["NVDA", "AMD"],
    "portfolio": { "positions": [] }
  }
}
```

**Example response**
```json
{
  "question": "What changed in semis today?",
  "answer": "Semis weakened after cautious guidance commentary and multiple names are now more valuation-sensitive.",
  "source": "openai",
  "providerNotice": null
}
```

---

### 3.39 `GET /api/v2/recommendations`

**Purpose**
- Sprint 16 (Phases A-D) — lists advisory-only, AI-generated recommendations from the autonomous recommendation engine. Never places a trade; see `POST /api/v2/recommendations/run`.

**Route**
- `/api/v2/recommendations`

**HTTP method**
- `GET`

**Request body**
- None.
- Query parameters: `status` (`ACTIVE` | `SUPERSEDED` | `EXPIRED`, optional), `symbol` (optional), `limit` (optional number). When neither `status` nor `symbol` is given, defaults to `ACTIVE` only.

**Response schema**
- `{ recommendations: Array<Recommendation> }`, where `Recommendation` is:
  - `id, createdAt, symbol, action ("BUY"|"REDUCE"|"EXIT"), confidenceScore, expectedUpside, expectedDownside, riskScore, riskLabel, positionSizeSuggestion, reasoning, timeHorizon, status, supersededById, expiresAt`
  - `explanation: { thesis, supportingEvidence: Array<{headline, whyItMatters, sourceName, sourceUrl}>, opposingEvidence: Array<{headline, whyItMatters, sourceName, sourceUrl, counterarguments}>, keyRisks: string[], invalidationConditions: string[], timeHorizon, affectedPositions: Array<{symbol, quantity, marketValue, weightPct, sector}>, affectedWatchlistSymbols: string[], confidenceDrivers: string[], confidenceReducers: string[], committeeDebate: object|null }` — Sprint 18A: `committeeDebate` is the sanitized Investment Committee debate for this symbol (same shape as 3.8's `committeeDebate`, minus any raw-response fields), embedded here so the UI never needs a second fetch; `null` when the committee call failed or hadn't run.
  - `scenarios: Array<{ case: "bull"|"base"|"bear", narrative, probability (0-1), priceImpact, portfolioImpact (string|null), catalysts: string[], risks: string[], invalidationTrigger }>` (always exactly 3 entries)
  - `qualityScore` (0-100) and `qualityComponents: { sourceQuality, evidenceFreshness, portfolioRelevance, evidenceAgreement, dataCompleteness, modelConfidence }` (each 0-100; weighted 15/15/20/20/10/20% respectively to produce `qualityScore`)
  - `evidence: { overallAiScore, opportunityScore, riskScore, convictionScore, primaryDriver, rankingExplanation, matchedEvents, sectorWeightPct, concentrationTriggered, macroRegime, currentPrice, dayChangePercent, symbolSource ("portfolio"|"watchlist"|"market-scan") }`, where each `matchedEvents` entry is `{ headline, importanceScore, whyItMatters, sourceUrl, sourceName, publishedAt, confidence, reliability, impactType, riskLevel, timeHorizon, counterarguments, invalidationSignals, personalRelevance }`
  - `portfolioContext: { quantity, marketValue, unrealizedPnlPct, sector, weightPct } | null` (null when not currently held)

**Error responses**
- `500 { error: "Internal Server Error" }` for uncaught failures.

**Authentication requirements**
- None.

**Validation rules**
- `limit` is optional and coerced to a number.

**Example request**
```http
GET /api/v2/recommendations?status=ACTIVE
```

**Example response**
```json
{
  "recommendations": [
    {
      "id": "rec-id",
      "symbol": "NVDA",
      "action": "BUY",
      "confidenceScore": 84,
      "riskLabel": "Moderate",
      "expectedUpside": "10-16%",
      "expectedDownside": "-8% tactical stop",
      "timeHorizon": "1-3 months",
      "qualityScore": 82,
      "qualityComponents": { "sourceQuality": 95, "evidenceFreshness": 80, "portfolioRelevance": 40, "evidenceAgreement": 100, "dataCompleteness": 100, "modelConfidence": 84 },
      "explanation": { "thesis": "Buy NVDA: AI infrastructure demand remains strong", "supportingEvidence": [], "opposingEvidence": [], "keyRisks": [], "invalidationConditions": [], "affectedPositions": [], "affectedWatchlistSymbols": [], "confidenceDrivers": [], "confidenceReducers": [] },
      "scenarios": [{ "case": "bull", "narrative": "AI capex accelerates.", "probability": 0.3, "priceImpact": "15-22%", "portfolioImpact": null, "catalysts": [], "risks": [], "invalidationTrigger": "..." }],
      "status": "ACTIVE"
    }
  ]
}
```

---

### 3.40 `GET /api/v2/recommendations/:id`

**Purpose**
- Full detail for a single recommendation, including the same `explanation`/`scenarios`/`qualityScore`/`evidence` fields as the list endpoint.

**Route**
- `/api/v2/recommendations/:id`

**HTTP method**
- `GET`

**Request body**
- None.

**Response schema**
- `Recommendation` (see 3.39).

**Error responses**
- `404 { error: "Recommendation not found." }`
- `500 { error: "Internal Server Error" }` otherwise.

**Authentication requirements**
- None.

**Validation rules**
- `:id` must be an existing recommendation id.

**Example request**
```http
GET /api/v2/recommendations/rec-id
```

**Example response**
- Same shape as one entry of `GET /api/v2/recommendations`.

---

### 3.41 `POST /api/v2/recommendations/run`

**Purpose**
- Triggers one on-demand evaluation pass of the recommendation engine. Advisory only — never calls the portfolio engine's order-placement path. The same logic also runs on a schedule server-side (`AUTONOMOUS_ENGINE_INTERVAL_MINUTES`, default 30).

**Route**
- `/api/v2/recommendations/run`

**HTTP method**
- `POST`

**Request body**
- `{ watchlist?: string[] }` — optional. When provided (e.g. from the frontend's real localStorage watchlist), personalizes the evaluation universe and news queries; when omitted, the engine falls back to held positions plus the default 3-symbol universe (`AAPL`/`NVDA`/`TSLA`) — the same behavior scheduled runs use, since they have no per-request context.

**Response schema**
- `{ runLog: { id, startedAt, symbolsEvaluated, recommendationsGenerated, errors }, symbolsEvaluated, recommendationsGenerated, errors: Array<{symbol, message}> }`

**Error responses**
- `500 { error: "Internal Server Error" }` for uncaught failures. Per-symbol errors are captured in the response body's `errors` array rather than failing the whole request.

**Authentication requirements**
- None.

**Validation rules**
- `watchlist`, if present, must be an array; non-array values are ignored (treated as `[]`).

**Example request**
```http
POST /api/v2/recommendations/run
Content-Type: application/json

{ "watchlist": ["PLTR"] }
```

**Example response**
```json
{
  "runLog": { "id": "log-id", "startedAt": "2026-07-11T12:00:00.000Z", "symbolsEvaluated": 4, "recommendationsGenerated": 2, "errors": null },
  "symbolsEvaluated": 4,
  "recommendationsGenerated": 2,
  "errors": []
}
```

---

### 3.42 `GET /api/v2/recommendations/status`

**Purpose**
- Engine status for the Recommendations screen — whether the scheduler is enabled/running, its interval, and the most recent run.

**Route**
- `/api/v2/recommendations/status`

**HTTP method**
- `GET`

**Request body**
- None.

**Response schema**
- `{ enabled: boolean, running: boolean, intervalMinutes: number, lastRunAt: string|null, lastRunResult: object|null, latestRunLog: { id, startedAt, symbolsEvaluated, recommendationsGenerated, errors } | null }`

**Error responses**
- `500 { error: "Internal Server Error" }` otherwise.

**Authentication requirements**
- None.

**Validation rules**
- None.

**Example request**
```http
GET /api/v2/recommendations/status
```

**Example response**
```json
{
  "enabled": true,
  "running": true,
  "intervalMinutes": 30,
  "lastRunAt": "2026-07-11T12:00:00.000Z",
  "latestRunLog": { "id": "log-id", "startedAt": "2026-07-11T12:00:00.000Z", "symbolsEvaluated": 4, "recommendationsGenerated": 2, "errors": null }
}
```

---

### 3.43 `GET /api/v2/recommendations/:id/decision-trace`

**Purpose**
- Sprint 16 Phase D — returns the immutable decision trace for a recommendation: the input evidence, ranking result, confidence calculation, and final output used to generate it. A separate resource from the main detail response so the (more verbose) audit payload only downloads when specifically requested. Contains only already-processed application data — never a raw provider HTTP response or an API key.
- **Sprint 18A** adds three additive, nullable fields (`committeeDebate`, `evidenceReferences`, `modelVersionMetadata`) and enriches `confidenceCalculation` with `conviction` and `uncertainty`. Historical traces created before Sprint 18A simply have `null` for the three new fields — nothing was backfilled or discarded. The trace remains immutable: still create + read only, no update path exists anywhere in the repository.

**Route**
- `/api/v2/recommendations/:id/decision-trace`

**HTTP method**
- `GET`

**Request body**
- None.

**Response schema**
- `{ id, recommendationId, inputEvidence: { rankingItem, matchedEvents, portfolioSnapshot, macroRegime }, rankingResult: { convictionScore, portfolioAction, symbolSource, action, concentrationTriggered }, confidenceCalculation: { qualityScore, qualityComponents, riskScore, riskLabel, conviction, uncertainty }, finalOutput: { action, expectedUpside, expectedDownside, positionSizeSuggestion, timeHorizon, reasoning }, committeeDebate: object|null, evidenceReferences: Array<EventEnvelope>|null, modelVersionMetadata: { eventEnvelopeVersion, contractVersion }|null, createdAt }`
  - `confidenceCalculation.conviction`: alias of `rankingResult.convictionScore`, included here so the full shared scoring vocabulary is readable from one object (see §3.44 below).
  - `confidenceCalculation.uncertainty`: 0-100, `computeUncertainty()` — distinct from confidence; reflects disagreement (evidence agreement + committee consensus), not signal strength.
  - `committeeDebate`: the exact sanitized debate object used at decision time (see 3.8) — an immutable snapshot, not a live pointer to the committee's current view.
  - `evidenceReferences`: each matched event projected onto the canonical Event Envelope (see §3.45), stored **alongside**, not instead of, `inputEvidence.matchedEvents`.
  - `modelVersionMetadata`: `{ eventEnvelopeVersion: "1.0.0", contractVersion: "1.0.0" }` — the schema versions in effect when this trace was created.

**Error responses**
- `404 { error: "Recommendation not found." }` when the recommendation id doesn't exist.
- `404 { error: "Decision trace not found." }` when the recommendation exists but has no trace (should not occur in normal operation — every engine-generated recommendation writes one).
- `500 { error: "Internal Server Error" }` otherwise.

**Authentication requirements**
- None.

**Validation rules**
- `:id` must be an existing recommendation id.

**Example request**
```http
GET /api/v2/recommendations/rec-id/decision-trace
```

**Example response**
```json
{
  "id": "trace-id",
  "recommendationId": "rec-id",
  "rankingResult": { "action": "BUY", "convictionScore": 84, "symbolSource": "market-scan", "concentrationTriggered": false },
  "confidenceCalculation": {
    "qualityScore": 82,
    "qualityComponents": { "sourceQuality": 95, "evidenceFreshness": 80, "portfolioRelevance": 40, "evidenceAgreement": 100, "dataCompleteness": 100, "modelConfidence": 84 },
    "riskScore": 30,
    "riskLabel": "Low",
    "conviction": 84,
    "uncertainty": 15
  },
  "finalOutput": { "action": "BUY", "expectedUpside": "10-16%", "expectedDownside": "-8% tactical stop", "timeHorizon": "1-3 months" },
  "committeeDebate": { "consensusLevel": 85, "disagreementLevel": 15, "expertVotes": [{ "agent": "Equity Analyst", "vote": "Buy", "confidence": 74 }] },
  "evidenceReferences": [
    { "eventId": "a1b2...", "eventType": "ai", "sourceType": "news", "sourceName": "Reuters", "symbols": ["NVDA"], "credibilityScore": 95, "freshnessScore": 100, "relevanceScore": 88, "deduplicationKey": "a1b2..." }
  ],
  "modelVersionMetadata": { "eventEnvelopeVersion": "1.0.0", "contractVersion": "1.0.0" },
  "createdAt": "2026-07-12T12:00:00.000Z"
}
```

---

### 3.44 Shared Scoring Vocabulary (Sprint 18A)

**Purpose**
- One documented contract for every score this platform computes, defined in `backend/services/scoringVocabulary.js` (`SCORE_DEFINITIONS`) and reused — not reimplemented — across the Recommendation Engine and the Investment Committee. This is not an HTTP endpoint; it documents the fields referenced throughout §3.39-3.43 and §3.8.

| Score | Range | Meaning | Formula/source | Fallback | API field |
|---|---|---|---|---|---|
| `confidence` | 0-100 | Strength of the engine's signal for the recommended action | Equal to `conviction` today (see note) | Always computed | `Recommendation.confidenceScore` |
| `conviction` | 0-100 | The engine's raw opportunity/risk/momentum blend that selects the action tier | `computeConvictionScore(rankingItem)` | Always computed | `DecisionTrace.rankingResult.convictionScore`, `confidenceCalculation.conviction` |
| `quality` | 0-100 | Weighted rollup of the six components below | Weighted average, `QUALITY_WEIGHTS` (15/15/20/20/10/20%) | Always computable | `Recommendation.qualityScore` |
| `risk` | 0-100 | Downside/volatility risk, folding in concentration and macro exposure | `computeSymbolRiskScore` | baseRisk defaults to 50 | `Recommendation.riskScore`/`riskLabel` |
| `relevance` | 0-100 | How directly evidence applies to this user's actual holdings/watchlist | `portfolioRelevance` component (100/70/40 base by symbol source) | 40 (market-scan) | `qualityComponents.portfolioRelevance` |
| `sourceCredibility` | 0-100 | Reliability of an evidence source | `sourceQualityScore(sourceName)` | 60 (unrecognized/missing) | `qualityComponents.sourceQuality` |
| `evidenceFreshness` | 0-100 | Recency of evidence, decayed over time | `recencyScore(publishedAt)` | 40 (missing `publishedAt`) | `qualityComponents.evidenceFreshness` |
| `evidenceAgreement` | 0-100 | Fraction of directional evidence supporting the action | `supportingCount / (supportingCount + opposingCount) * 100` | 50 (no directional evidence) | `qualityComponents.evidenceAgreement` |
| `uncertainty` | 0-100 | Genuine disagreement across evidence and committee opinion — distinct from confidence | `computeUncertainty()` — 100 minus the average of `evidenceAgreement` and the committee's `consensusLevel` | 50 (neither input available) | `confidenceCalculation.uncertainty` |

**Note on `confidence`/`conviction`/`modelConfidence`:** these three are currently the same underlying number under three names — an intentional, documented simplification (see `scoringVocabulary.js`), not a bug. Differentiating them requires real outcome-calibration data this platform does not yet have (see `FIVE_YEAR_ARCHITECTURE_ROADMAP.md`'s Alpha Attribution Engine milestone).

**UI representation:** `quality` renders as a pill (opportunity-colored ≥75, neutral ≥50, risk-colored below); `risk` renders as its label (`Low`/`Moderate`/`High`); `relevance` renders as the symbol-source badge, not the raw number; the remaining scores currently surface only via the decision-trace API, not a dedicated UI element.

---

### 3.45 Canonical Event Envelope (Sprint 18A)

**Purpose**
- The one event schema intelligence evidence is normalized into, defined in `backend/services/eventEnvelope.js` — frozen ahead of the Research Intelligence Engine build (`RESEARCH_INTELLIGENCE_ENGINE_DESIGN.md`) so multiple engines integrate against one locked shape. Not an HTTP endpoint on its own; it's the `EventEnvelope` type referenced by `evidenceReferences` in §3.43.

**Fields** (all 19 required — `validateEventEnvelope` checks presence, not non-emptiness):

`eventId, eventType, sourceType, sourceName, sourceUrl, publishedAt, ingestedAt, entities, symbols, sectors, countries, summary, rawReference, credibilityScore, freshnessScore, relevanceScore, confidence, provenance, deduplicationKey`

**Today's only real source:** `adaptLegacyFeedItemToEnvelope(feedItem, { symbol })` projects `autonomousMarketService`'s existing matched-event feed items onto this schema, reusing `classifyEventType`, `sourceQualityScore`, and `recencyScore` rather than new analysis. `credibilityScore`/`freshnessScore` come directly from the Shared Scoring Vocabulary (§3.44). `deduplicationKey` is a deterministic hash of `(sourceType, sourceUrl or headline, publishedAt)` — the same underlying evidence always produces the same key.

**Example**
```json
{
  "eventId": "a1b2c3...",
  "eventType": "ai",
  "sourceType": "news",
  "sourceName": "Reuters",
  "sourceUrl": "https://news.example.com/nvda-chip",
  "publishedAt": "2026-07-12T10:00:00.000Z",
  "ingestedAt": "2026-07-12T10:05:00.000Z",
  "entities": [],
  "symbols": ["NVDA"],
  "sectors": [],
  "countries": [],
  "summary": "Expands NVDA's data-center AI compute footprint.",
  "rawReference": "NVDA announces new AI chip partnership",
  "credibilityScore": 95,
  "freshnessScore": 100,
  "relevanceScore": 78,
  "confidence": 82,
  "provenance": { "sourceName": "Reuters", "sourceUrl": "https://news.example.com/nvda-chip" },
  "deduplicationKey": "a1b2c3..."
}
```

---

## 4. MVP-Missing Endpoint Contracts

The backend currently lacks the following MVP-required endpoints. These are required for a full productized MVP, but they are not present in the current implementation.

### 4.1 `POST /api/auth/signup`

**Purpose**
- Create a user account.

**Proposed request body**
- `{ email: string, password?: string, provider?: string }`

**Proposed response schema**
- `{ user: { id, email, name?, createdAt }, session?: object }`

**Auth requirement**
- None; this is the entry-point.

**Validation rules**
- Valid email required.
- Password required if not using OAuth.

**Current status**
- Missing.

---

### 4.2 `POST /api/auth/login`

**Purpose**
- Authenticate an existing user.

**Proposed request body**
- `{ email: string, password: string }`

**Proposed response schema**
- `{ user: { id, email, name? }, session: object }`

**Auth requirement**
- None.

**Validation rules**
- Valid credentials required.

**Current status**
- Missing.

---

### 4.3 `POST /api/auth/logout`

**Purpose**
- End the active session.

**Proposed request body**
- None.

**Proposed response schema**
- `{ success: true }`

**Auth requirement**
- Yes, should require an active session.

**Current status**
- Missing.

---

### 4.4 `GET /api/auth/me`

**Purpose**
- Return the current authenticated user.

**Proposed request body**
- None.

**Proposed response schema**
- `{ user: { id, email, name?, plan?, createdAt } }`

**Auth requirement**
- Yes, should require an active session.

**Current status**
- Missing.

---

### 4.5 `GET /api/onboarding/preferences` and `PUT /api/onboarding/preferences`

**Purpose**
- Persist investor profile, goals, and onboarding choices.

**Proposed request body**
- `{ style, horizon, riskTolerance, goals, sectors, watchlist? }`

**Proposed response schema**
- `{ preferences: object, updatedAt: string }`

**Auth requirement**
- Yes, should require an authenticated user.

**Validation rules**
- Known enum-like values for style/horizon/risk should be enforced.

**Current status**
- Missing.

---

### 4.6 Watchlist CRUD endpoints

**Purpose**
- Persist named watchlists and manage tickers server-side.

**Proposed routes**
- `POST /api/watchlist`
- `PATCH /api/watchlist/:id`
- `DELETE /api/watchlist/:id`

**Proposed request body**
- Create: `{ name: string, symbols: string[] }`
- Update: `{ name?: string, symbols?: string[] }`

**Proposed response schema**
- `{ watchlist: { id, name, symbols, createdAt, updatedAt } }`

**Auth requirement**
- Yes, should require an authenticated user.

**Current status**
- Missing.

---

### 4.7 `GET /api/settings` and `PUT /api/settings`

**Purpose**
- Persist notification, personalization, and account preferences.

**Proposed request body**
- `{ notifications, theme, dailyBriefTime, alertSensitivity, dataSourcePreferences }`

**Proposed response schema**
- `{ settings: object, updatedAt: string }`

**Auth requirement**
- Yes, should require an authenticated user.

**Current status**
- Missing.

---

### 4.8 Billing endpoints

**Purpose**
- Support plan discovery, upgrade, and billing portal access.

**Proposed routes**
- `GET /api/billing/plans`
- `POST /api/billing/checkout`
- `POST /api/billing/portal`

**Proposed request body**
- Checkout: `{ planId: string, billingCycle: "monthly" | "annual" }`
- Portal: `{}`

**Proposed response schema**
- Plans: `{ plans: Array<object> }`
- Checkout: `{ checkoutUrl: string }`
- Portal: `{ portalUrl: string }`

**Auth requirement**
- Yes, should require an authenticated user for checkout/portal.

**Current status**
- Missing.

---

### 4.9 `GET /api/intelligence/daily-brief/archive`

**Purpose**
- Return historical daily briefs for the archive screen.

**Proposed request body**
- None.
- Query parameters: `limit`, `from`, `to`.

**Proposed response schema**
- `{ briefs: Array<object> }`

**Auth requirement**
- Should match the main user context once auth exists.

**Current status**
- Missing.

---

## 5. Implementation Notes

- The current backend has strong read-only intelligence coverage.
- The largest MVP gaps are user identity, settings, billing, and watchlist persistence.
- The existing portfolio engine is the only persistent write path today.
- Any new auth or settings layer should preserve the current read-only intelligence contracts to avoid breaking the dashboard and AI screens.
