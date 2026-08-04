# Institutional Data Strategy — SEC EDGAR, WhaleWisdom, Finnhub, Nasdaq, Fintel, and MVP/Production/Enterprise Recommendations

**Phase:** INSTITUTIONAL-RESEARCH-001. Pure research/design — no production code was written. Directly evaluates the 6 named source categories from `INSTITUTIONAL_RESEARCH.md` §10, expanded here into a concrete staged recommendation.

---

## 1. Source-by-source evaluation summary

| Source | Confirmed live this session? | Real role for THIS platform | Real limitation |
|---|---|---|---|
| **SEC EDGAR** | Not re-fetched this specific session; grounded in stable regulatory facts and this research series' own prior confirmed EDGAR findings (real-time Form 4 feed, XBRL API) | The authoritative, free, primary source for every 13F filing (structured XML since 2013) | No clean, pre-parsed, symbol-indexed REST API for 13F holdings (same category of gap as Form 4 in `INSIDER_RESEARCH.md`); compounded by the inherent ~45-135-day staleness no processing speed can fix |
| **WhaleWisdom** | **Yes, confirmed live** — a real, substantial, purpose-built platform (940,473+ indexed matches observed), with a real documented Developer API, a real "13F Fund Performance Evaluator," "13F Stock Screener," "13F Heat Map," and published pricing | The single most purpose-fit vendor evaluated in this whole research phase — built specifically around exactly this domain | Exact API pricing/rate limits/historical depth not independently re-verified — reconfirm directly before procurement |
| **Finnhub** | The general vendor relationship is confirmed real (`finnhubService.js`, already reused for Valuation/Insider); the specific institutional-ownership endpoint was not independently re-verified this session | Based on general domain knowledge, a real institutional/fund-ownership data product exists — the cheapest realistic MVP path if reconfirmed sufficient, reusing an already-configured vendor relationship | Depth/history/cadence not independently re-verified this session |
| **Nasdaq** | Not re-fetched this session; grounded in this research series' own prior confirmed findings about Nasdaq's real data infrastructure | Real, known institutional-ownership-analytics products aimed at corporate IR teams | Enterprise/IR-market-oriented, likely a heavier integration than a pure data-API vendor |
| **Fintel** | Not confirmed (a direct fetch returned an HTTP 403, inconclusive rather than confirmed-absent) | Based on general domain knowledge, a real, well-known dedicated institutional/13F/insider/short-interest tracking site, a plausible WhaleWisdom alternative | Not independently confirmed live this session |
| **Other reliable providers** | Based on general domain knowledge | Bloomberg/Refinitiv-class enterprise terminals offer comprehensive institutional-ownership data | Genuinely enterprise-tier, appropriate only at that stage |

---

## 2. MVP — cheapest path to a real, honest institutional-ownership capability

### 2.1 Reuse what's already configured, first

Per `INSTITUTIONAL_RESEARCH.md` §10, this platform **already has a real, configured Finnhub relationship** (reused across Valuation and Insider research in this same series). If Finnhub's own institutional-ownership product is directly reconfirmed to include genuine, historical, fund-level position data (not just an aggregate ownership percentage), this is the cheapest realistic MVP path — no new vendor contract, no raw 13F XML parsing required.

### 2.2 WhaleWisdom as a real, purpose-built supplement or alternative

Given WhaleWisdom's confirmed-live, genuinely purpose-built nature (§1) — meaningfully more clearly "the right tool for this specific job" than any vendor evaluated in the immediately preceding ETF Flow research phase — recommend directly evaluating its real, documented Developer API as either the primary MVP source (if its pricing proves accessible) or a strong Production-tier upgrade over a more generic Finnhub-only approach.

### 2.3 SEC EDGAR as a permanent, free, authoritative cross-check

Directly reusing this research series' own repeated pattern (SEC EDGAR for Valuation, SEC Market Structure Data for Algorithmic Activity, SEC's real-time Form 4 feed for Insider, SEC Form N-PORT for ETF Flow) — recommend the real 13F XML filings be wired in as a **permanent, free, official validation layer**, even after a paid vendor becomes primary, specifically to independently verify vendor-parsed data against the authoritative filed source.

### 2.4 The single most important MVP design decision: ship `SmartMoneyScore` heavily ceilinged, near-zero by default

Directly implementing `INSTITUTIONAL_SCORING_MODEL.md` §5's central recommendation — **do not** launch any version of this agent that labels specific funds "smart money" based on reputation/name-recognition. Recommend the MVP ship `SmartMoneyScore` at its disclosed, low default ceiling (20/100) for every fund, honestly reflecting that this platform has not yet built genuine, sample-size-gated track-record verification — the same "an honest, low-confidence default is better than a mislabeled substitute" discipline this whole research series has applied consistently (most recently, `ETF_FLOW_DATA_STRATEGY.md` §2.3's identical treatment of volume-as-flow-proxy).

### 2.5 What NOT to attempt at MVP

Raw 13F XML parsing (an in-house parser for the SEC's own structured filing format) is explicitly **not** recommended for MVP, for the same reason `INSIDER_DATA_STRATEGY.md` §2.3 gave for Form 4 — a real, non-trivial engineering effort that an existing vendor relationship (Finnhub) or a purpose-built vendor (WhaleWisdom) makes unnecessary at this stage.

---

## 3. Production — richer coverage and fund-level analytics

- **WhaleWisdom's full Developer API** (fund performance evaluation, historical position-change tracking across many funds) as the primary source, if MVP-stage evaluation confirms its pricing/terms are viable at production scale.
- **Begin building this platform's own real, sample-size-gated fund-performance-verification history** — the necessary precondition for ever raising `SmartMoneyScore` above its heavily-ceilinged MVP default (§2.4) — reusing this platform's existing `Outcome`/`calibrationReportService.js` infrastructure, not a new, parallel mechanism.
- **Fintel** (or a comparable alternative, pending direct reconfirmation of its real product/API terms) as a secondary source/cross-check, given its real, known focus on the same data domain.

---

## 4. Enterprise — the deepest, broadest tier

- **A Bloomberg/Refinitiv-class enterprise data relationship** becomes the default recommendation at this tier, extending coverage to the deepest available historical depth, richer fund-level analytics, and potentially real (if imperfect) supplementary data on non-13F-disclosed exposure (e.g., aggregated derivatives/short-interest context from other regulatory or market sources) — the same "enterprise is a graduation point, not a default starting point" framing this research series has applied consistently across every prior phase.
- **A genuinely mature `SmartMoneyScore`, no longer heavily ceilinged**, becomes appropriate only once this platform's own accumulated track-record-verification history (begun at Production, §3) reaches real, statistically meaningful sample sizes for a meaningful number of tracked funds — this should remain an earned, gradual graduation, never a one-time unlock.

---

## 5. Summary — recommended path

| Stage | Primary source | Cross-check / supplemental source | Smart Money Score treatment |
|---|---|---|---|
| MVP | Finnhub's existing, already-configured institutional-ownership product (if reconfirmed sufficient) | SEC EDGAR's real 13F filings, wired in as a permanent free validation layer | Heavily ceilinged (20/100 default), near-zero for every fund — no reputation-based labeling |
| Production | WhaleWisdom's real, purpose-built Developer API | Fintel (pending reconfirmation) as a secondary cross-check | Begin building this platform's own real, sample-size-gated track-record verification, reusing existing `Outcome` infrastructure |
| Enterprise | A Bloomberg/Refinitiv-class enterprise data relationship | SEC's own filings retained permanently as a free, authoritative (if inherently ~45-135-day-delayed) cross-check | A genuinely earned, no-longer-heavily-ceilinged score, contingent on real accumulated verification history, not a default unlock |

**Explicitly not recommended at any tier:** labeling any specific fund "smart money" purely from external reputation/fame, without this platform's own independently earned, sample-size-gated verification — the single most important guardrail across this entire research phase, directly paralleling `SENTIMENT_SOURCE_STRATEGY.md`'s identical "never surrender explainability to a black-box vendor score" discipline, applied here to reputation-based labeling instead of vendor-score opacity.

No code was written to implement any of the above — this document, together with `INSTITUTIONAL_RESEARCH.md` and `INSTITUTIONAL_SCORING_MODEL.md`, is the design/decision record for whenever a real implementation phase begins.
