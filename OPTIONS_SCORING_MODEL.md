# Options Scoring Model — Normalization, Confidence, Weighting, Freshness & Caching

**Phase:** OPTIONS-DATA-RESEARCH-001. Pure research/design — no production code was written or modified. Extends, rather than replaces, the confidence model already designed in `OPTIONS_AGENT_ARCHITECTURE.md` §6 and already implemented in `backend/services/optionsAgent/optionsAnomalyConfidence.js` (real, tested code: `computeAnomalyScore()`, `classificationStrengthFor()`, `computeSizeScore()`, `oiConfirmationAdjustment()`, `skewCorroborationAdjustment()`). This document adds the vendor-sourcing dimension that research phase surfaced (`OPTIONS_DATA_RESEARCH.md`) — provider reliability, coverage gaps, freshness, and caching — which the existing confidence model does not yet account for.

---

## 1. Data normalization strategy

Per the architecture's pipeline (`INGEST → NORMALIZE → AGGREGATE → DETECT → SCORE → EXPLAIN → PUBLISH`), normalization is the one stage that must fully absorb vendor-specific shape differences so every downstream stage (detectors, confidence, explanation) is written once against **one canonical shape**, never against a vendor's raw response. This is already the real, working contract in `optionsFlowNormalizer.js` — the recommendations below are about *how a real vendor integration should extend that contract*, not a new design.

### 1.1 Canonical contract identity

Every normalized print/snapshot must key off the same **contract identity tuple** regardless of vendor: `(underlyingSymbol, expiryDate, strike, right)` where `right` is `CALL`/`PUT` — never a vendor-specific OCC option symbol string used as the join key directly (vendors format OCC symbols inconsistently — padding, root-symbol edge cases for multi-class underliers — so the normalizer must parse into the 4-field tuple immediately on ingest, matching `OPTIONS_AGENT_DATA_MODEL.md`'s already-defined `OptionsFlowPrint` shape).

### 1.2 Field-level normalization rules

| Canonical field | Normalization rule |
|---|---|
| `exchangeId` | Map every vendor's own exchange code (which differ vendor-to-vendor — e.g. a raw OPRA exchange ID vs. a vendor's friendlier enum) to one fixed internal enum (CBOE/NASDAQ/NYSEAmerican/MIAX/BOX/etc.) — required for sweep detection's "≥2 distinct exchanges" test (§5c of the architecture) to work identically regardless of which vendor supplied the print. |
| `bidAtTrade` / `askAtTrade` | Only trust a vendor's own "prevailing NBBO at execution" field if it is explicitly documented as captured at trade time (not a same-second approximation) — if a vendor only supplies a periodic quote snapshot, the normalizer must mark `bidAtTradeConfidence: "approximate"` rather than silently presenting it as exact; this metadata feeds the confidence model's provenance discount (§3.4 below). |
| `timestamp` | Normalize to UTC with explicit precision metadata (`timestampPrecisionMs`) — some vendors supply millisecond precision, others only second-level, and sweep detection's "≤2 second window" clustering rule (§5c) is only meaningful if the ingested timestamp precision is actually sub-second; a vendor supplying only second-level precision should be flagged (`timestampPrecisionMs: 1000`) and the sweep detector should widen its clustering tolerance accordingly rather than silently under-detecting. |
| `size` / `notionalValue` | `notionalValue` must always be **computed** by the normalizer (`size × price × 100` for standard equity options), never trusted as a vendor-supplied field verbatim, since some vendors report notional at the underlying's price rather than the option premium — a real, easy-to-get-wrong unit-confusion risk. |
| `oiSnapshotDate` | Always the exchange's own OI-as-of date (typically T-1 relative to when it's fetched), never the fetch/ingest timestamp — conflating these two dates would silently break the OI-confirmation staging logic (§5e), which depends on knowing precisely which session's OI a given snapshot represents. |

### 1.3 Provenance tagging (new, vendor-research-driven addition)

Every normalized record should carry a `dataProvenance` object: `{ vendor, vendorTier, ingestLatencyMs, isDelayed, delayMinutes }`. This does not exist yet in the current implementation and is the most important normalization-layer addition this research phase recommends, because:

- A future multi-vendor world (e.g. a cheap delayed feed for OI/baseline work per `OPTIONS_DATA_RESEARCH.md` §3, alongside a real-time feed for sweep/block detection per §4) means two different records for the same contract could originate from two different vendors/tiers on the same day — confidence scoring (§3) and freshness handling (§4) both need to know this to behave correctly, rather than silently treating all ingested data as equally fresh/reliable.

---

## 2. Signal weighting

Extends `optionsAnomalyConfidence.js`'s real, already-implemented rollup formula:

```
anomalyScore = sizeScore*0.35 + classificationStrength*0.30
             + oiConfirmationAdjustment + skewCorroborationAdjustment
```

### 2.1 What this research adds: a provenance-aware weighting discount

The existing formula assumes every input is equally trustworthy. Real vendor research surfaces 2 cases where that assumption breaks:

- **Delayed-vs-real-time provenance discount**: if a print's `dataProvenance.isDelayed = true` (per §1.3), the resulting signal's `anomalyScore` should be capped at a maximum value (proposed: 60/100) regardless of how extreme its raw sizeScore/classificationStrength would otherwise compute — because a genuinely urgent, time-sensitive signal (a sweep) discovered 15 minutes late is categorically less actionable-as-evidence than the same signal discovered in real time, and presenting it at full confidence would misrepresent its practical value. This is a **new proposed adjustment term**, not yet implemented in `optionsAnomalyConfidence.js` — should be added as `provenanceCapAdjustment` alongside the existing `oiConfirmationAdjustment`/`skewCorroborationAdjustment` pattern, following the exact same "small, named, bounded, disclosed" convention those two already use.
- **Cross-vendor corroboration bonus (future, once/if a second vendor is ever added)**: if the same anomaly is independently observed by two different vendors, that is meaningfully stronger evidence than a single vendor's report — proposed as a small positive adjustment, symmetric in spirit to the existing `skewCorroborationAdjustment`, but explicitly scoped as **future work, not needed for a single-vendor MVP** (§10 of the research doc recommends starting with one vendor, Databento).

### 2.2 Detector-level weighting rationale (documented, not just formula)

The existing `CLASSIFICATION_STRENGTH` constants (`SWEEP+BLOCK: 90, SWEEP: 75, BLOCK_TRADE: 60, VOLUME_SPIKE: 40`) are disclosed hand-set weights, not fitted — this research recommends these remain hand-set at MVP (no real graded-outcome sample exists yet to fit them against, matching this whole platform's existing "don't calibrate against too small a sample" discipline from `CALIBRATION_REVIEW.md`/`AI_LEARNING_REVIEW.md`), **but recommends the exact same outcome-grading pipeline already built for Recommendations (`Outcome`, `WorldMemoryPrediction`, `calibrationReportService.js`) be reused for `OptionsSignal` once enough graded history exists** — i.e., do not invent a second, parallel calibration mechanism; extend the one this codebase already has and already understands the sample-size/non-independence pitfalls of (per `LEARNING_LOOP_REVIEW.md`'s dataset-integrity findings).

---

## 3. Confidence scoring (extending the existing rollup)

### 3.1 What already exists and is sound (credited, not re-designed)

`optionsAnomalyConfidence.js`'s `computeAnomalyScore()` already: (a) returns `null` rather than a fabricated number when no real classification signal exists, (b) treats the volume-baseline bootstrap window honestly (`computeSizeScore` returns `null` on invalid/missing multiple), (c) uses small, named, bounded, disclosed adjustment terms rather than an opaque model. This is the correct foundation and should not be redesigned.

### 3.2 New addition: OI-confirmation timing discount (data-freshness-driven)

Per §5e of the architecture, OI confirmation is inherently T+1. This research recommends the *initial* (same-day, `PENDING`) signal be tagged with an explicit `provisionalConfidence` distinct from its eventual `confirmedConfidence` (the value after the next session's OI snapshot resolves `oiConfirmationStatus`) — surfaced to consumers (Decision Center, evidence matching) as two distinct, honestly-labeled values rather than one number that silently changes value overnight without explanation. This mirrors this platform's own established "visible belief revision, never a silent overwrite" principle (`IMPACTONE_ANTI_PATTERNS.md`'s explicit anti-pattern #9: "silent overwrite of a prior verdict/rating with no visible revision trace") — applying that same principle to the Options Agent's own confidence value, not just to Claims/Recommendations.

### 3.3 New addition: vendor-tier confidence ceiling

Recommend a documented, disclosed ceiling table mapping `dataProvenance.vendorTier` to a maximum permissible `anomalyScore`, so a cheaper/lower-fidelity vendor tier can never produce a signal that reads as equally authoritative as one from a full trade-level real-time feed:

| Vendor tier (per `OPTIONS_DATA_RESEARCH.md`) | Max permissible anomalyScore |
|---|---|
| Free/delayed chain snapshot (no trade prints) | N/A — cannot compute sweep/block detectors at all; only feeds baseline/OI detectors |
| Delayed real-time-adjacent (15-min) | 60 (per §2.1's provenance discount) |
| Real-time trade-level (MVP/production tier, e.g. Databento Standard) | 100 (no cap) |
| Real-time trade-level, enterprise tier with redistribution rights | 100 (no cap; this tier differs from the one above in licensing terms, not data fidelity) |

### 3.4 New addition: bid/ask-precision confidence discount

Per §1.2's `bidAtTradeConfidence: "approximate"` normalization flag — a sweep signal built on approximate (not trade-time-exact) bid/ask data should carry a disclosed, smaller `classificationStrength` (proposed: apply a flat -15 adjustment when `bidAtTradeConfidence !== "exact"`) rather than silently reusing the full weight defined for exact data — the sweep detector's whole premise (aggressor-side inference) is only as reliable as the bid/ask it's compared against.

---

## 4. False-positive reduction

Beyond what `optionsAnomalyConfidence.js` already does structurally (never fabricating a score, requiring a minimum absolute size floor per §5a of the architecture to avoid flagging small-contract-count multiples), this research recommends 4 additional, vendor-research-grounded false-positive guards:

1. **Roll/spread-order suppression.** A single large "print" that is actually one leg of a multi-leg spread order (e.g. a covered-call roll, a calendar spread) can look identical to a genuine directional block trade at the single-leg level. Recommend the normalizer attempt multi-leg correlation (same underlying, same timestamp window, offsetting/paired contracts) using whatever multi-leg/complex-order flag the chosen vendor exposes (Databento and most professional-tier vendors expose an order-type/complex-order flag on OPRA-sourced prints) — a detected multi-leg component should suppress or heavily discount the block/sweep classification for that leg, since it is far more likely routine risk management than informed directional positioning. This is a real, named gap not currently addressed in the architecture doc's §5c/§5d detector definitions and should be added there once a vendor's exact complex-order flag is confirmed.
2. **Market-maker/hedging-flow suppression.** Large prints routed through known market-maker/liquidity-provider firm identifiers (where a vendor exposes a firm/participant ID) are a weaker informed-trading signal than the same size routed through a retail/institutional order flow identifier — recommend this eventually feed a discount similar to the OI-confirmation adjustment, but explicitly scoped as **future work contingent on a vendor exposing participant-level data**, since not every tier does (only enterprise-grade feeds typically expose this).
3. **Earnings/event-window suppression.** A volume/skew anomaly immediately before a scheduled earnings date or other known catalyst (this platform already tracks earnings dates via `earningsProvider.js`) is expected, not anomalous, and should have its `classificationStrength` discounted or explicitly re-labeled (`"EXPECTED_EVENT_POSITIONING"` rather than `"UNUSUAL"`) — reuse the already-existing earnings-calendar data this codebase has rather than building a second one.
4. **Illiquid-underlying floor.** Per `OPTIONS_DATA_RESEARCH.md` §8's coverage finding (thin data quality for illiquid names regardless of vendor), recommend an explicit minimum-liquidity gate (e.g. a minimum average daily options volume for the underlying, over a trailing window) below which the volume-baseline detector always reports `insufficientBaselineHistory: true` rather than computing a headline-grabbing but statistically meaningless multiple (a jump from 3 to 30 contracts on an illiquid name is a 10x multiple but is not economically meaningful) — this is the same principle already correctly applied to bootstrap-window thinness, extended to apply to permanently-thin names too, not just new ones.

---

## 5. Data freshness strategy

### 5.1 Per-detector freshness requirements (not one blanket policy)

The architecture's 5 detectors have genuinely different freshness needs, and this research recommends the freshness strategy be explicit about that rather than applying one uniform "how fresh is fresh enough" rule:

| Detector | Real freshness requirement | Consequence of stale data |
|---|---|---|
| Volume vs. baseline (§5a) | Intraday rolling (5-min buckets per the architecture's own aggregation window) | Moderate — a few minutes of staleness delays alerting but doesn't invalidate the signal |
| Call/put skew (§5b) | Same intraday cadence | Same as above |
| Sweep detection (§5c) | Near-real-time (seconds, not minutes) — this is the ONE detector where freshness is existential to the signal's meaning | A "sweep" detected 15 minutes late has already lost almost all of its value as an actionable evidence signal — this is the concrete mechanism behind §2.1's provenance-based confidence cap |
| Block trades (§5d) | Near-real-time preferred, but retains meaningful value even at moderate delay (a large block is still informative evidence hours later, unlike a sweep whose whole signal is urgency) | Low-to-moderate |
| Open interest (§5e) | Inherently T+1 — freshness ceiling is fixed by the exchange/OCC publication schedule regardless of vendor | None beyond the already-disclosed, architecturally-expected `PENDING` staging |

### 5.2 Staleness labeling, not silent use

Recommend every `OptionsSignal` carry an explicit `dataAgeMs`/`isStale` pair computed at read time (not write time), following the exact convention `providerHealthService.js` and `altDataService.js`'s freshness-labeling already use elsewhere in this codebase — a signal built from data older than its detector-specific freshness requirement (table above) should be labeled `"stale"` in its evidence/Decision-Center presentation rather than presented identically to a fresh one.

---

## 6. Caching strategy

### 6.1 What NOT to do: reinvent a new cache

This codebase already has 5+ independent in-process TTL caches (`finnhubCache`/`altDataService`'s cache/`intelligenceCache`/2 AI caches — flagged as real technical debt in `SPRINT17_MASTER_PLAN.md`/`PLATFORM_TECH_DEBT.md`'s TD-series findings, since each is process-local and breaks horizontal scaling). This research explicitly recommends the Options Agent **not** add a 6th independent cache implementation — reuse whatever shared cache utility already exists, or at minimum follow `altDataService.js`'s exact TTL/fallback-labeling pattern rather than inventing a new one.

### 6.2 Recommended TTLs by data type (grounded in §5's per-detector freshness table)

| Cached artifact | Recommended TTL | Rationale |
|---|---|---|
| Options chain snapshot (strike/bid/ask/IV/Greeks) | 1-5 minutes during market hours, unbounded (last-known) after close | Matches typical vendor refresh cadence; no value in re-fetching faster than the vendor itself updates |
| OI snapshot | 24 hours (until the next session's snapshot is published) | OI is fundamentally a once-per-session fact (§5.1) — caching it for any shorter period wastes vendor quota for zero freshness benefit |
| Trade prints (raw, pre-aggregation) | Not cached in the traditional sense — these are ingested once and persisted to `OptionsFlowPrint` (per `OPTIONS_AGENT_DATA_MODEL.md`), not re-fetched/re-cached; the "cache" here is really the retention/pruning policy already designed (raw prints pruned after 30 days per this engagement's own prior memory note on the data model) | Avoids paying twice (storage + re-fetch) for data that's already durably persisted |
| Computed baseline (rolling average volume per contract/symbol) | Recomputed once per session close, cached until the next close | Recomputing intraday would be wasted work — the baseline is, by definition, a slower-moving statistic than the intraday signals compared against it |
| Vendor health/rate-limit-budget state | Short TTL (30-60s), following `providerHealthService.js`'s existing convention | Needed to make real-time scheduling decisions (§7 of the research doc's rate-limit findings) without hammering the vendor's own status endpoint |

### 6.3 Cache-invalidation-on-correction (new consideration)

If a vendor issues a corrected/adjusted trade print (exchanges occasionally issue post-trade corrections/busts) — recommend the normalizer treat a correction as a new, explicitly-flagged event (`correctionOf: <originalPrintId>`) rather than silently mutating the original cached/persisted record, preserving this platform's established append-only, no-silent-mutation discipline (`DecisionTrace`'s immutability convention, `WorldMemoryRecord`'s append-only satellites) — a signal already published as evidence/to a user should never be silently altered after the fact; a correction should instead flow through the same visible-revision mechanism already designed for Claims (`IMPACTONE_ANTI_PATTERNS.md`'s anti-pattern #9).

---

## 7. Summary of concrete, actionable additions to the existing architecture

This research does not replace `OPTIONS_AGENT_ARCHITECTURE.md`'s design — it adds the following specific, named extensions for whenever real implementation resumes:

1. Add `dataProvenance` (`vendor`, `vendorTier`, `isDelayed`, `delayMinutes`, `timestampPrecisionMs`) to the normalized print/snapshot shape.
2. Add a `provenanceCapAdjustment` term to `computeAnomalyScore()`, capping delayed-data signals at 60/100.
3. Add a `bidAtTradeConfidence` field and a -15 classification-strength discount when not `"exact"`.
4. Split `anomalyScore` into `provisionalConfidence`/`confirmedConfidence` around the existing OI-confirmation staging, surfaced as 2 distinct values, never a silent overwrite.
5. Add multi-leg/spread-order suppression, market-maker-flow suppression (vendor-data-permitting), earnings-window re-labeling, and an illiquid-underlying minimum-liquidity gate to the false-positive-reduction layer.
6. Add per-detector-specific `dataAgeMs`/`isStale` labeling at read time.
7. Reuse an existing cache utility/pattern rather than building a 6th independent in-process cache; adopt the TTL table in §6.2.
8. Treat vendor trade corrections as new, explicitly-linked correction events, never silent mutation of an already-published signal.

No code was written to implement any of the above — this document is the design/decision record for whenever a real vendor (per `OPTIONS_DATA_RESEARCH.md`'s recommendation: Databento for MVP) is actually connected.
