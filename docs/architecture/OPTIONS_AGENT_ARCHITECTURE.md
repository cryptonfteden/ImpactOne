# Unusual Options Agent — Architecture (Phase AI-ENGINE-001)

**Status:** Architecture only. Nothing in this document is implemented. No code was written, no migration was run, no provider was wired up. Every reference to an existing file/service below is real and was read directly from this repository to ground the design — every new module/table/endpoint named below is proposed, not built.

## 1. What this is, and what it deliberately is not

The **Unusual Options Agent** is a new **signal-detection module** inside the existing "Autonomous Market/Impact Intelligence Engine" family (see `INTELLIGENCE_PLATFORM_BLUEPRINT.md`'s five-engine map, confirmed real in `backend/services/autonomousMarketService.js` + `backend/services/providers/`). It watches options-market activity (volume, sweeps, blocks, open interest, call/put skew) for a tracked symbol universe and turns genuine statistical anomalies into **evidence** — never into a standalone trading verdict.

This distinction is not stylistic — it is the single most important architectural constraint, and it is already enforced elsewhere in this codebase for exactly this reason:

- `backend/services/canonicalVerdict.js`'s `FORBIDDEN_COMMITTEE_KEYS` denylist exists specifically to stop a second subsystem from ever emitting `action`/`decision`/`verdict`/`recommendation` fields alongside the one canonical `Recommendation.action`. The Options Agent is bound by the same rule: it **never** emits an action field. It emits an `OptionsSignal` — direction-labeled (bullish/bearish leaning), scored, explained — that becomes one more piece of evidence the existing Recommendation Engine, Committee, and human user can weigh.
- Phase E3.5 already had to retroactively relabel a third-party signal (Finnhub's analyst consensus) from "Recommendation" to "Wall Street Analyst Consensus — Third-party data, not an ImpactOne recommendation" after it read as a second verdict. The Options Agent's UI surface is designed from day one with that exact lesson applied: every place it appears is labeled **"Unusual Options Activity — a signal, not a recommendation."**

## 2. Where this sits in the real platform

This is **not** a sixth independent engine sitting beside Committee/Recommendation/Portfolio. It is a new **provider + detector pair** feeding the same pipeline the platform already has for every other market signal:

```
Options vendor (new)  ─┐
Wire news, SEC, COT,   ─┼─► providerRegistry.js (existing) ─► eventEnvelope.js (existing)
Reddit, Congress, etc  ─┘        │                                    │
                                  ▼                                    ▼
                     providerIngestionService.js (existing) ──► CanonicalEvent (existing table)
                                                                        │
                                                                        ▼
                                                    autonomousRecommendationEngine.findMatchedEvents (existing)
                                                                        │
                                                                        ▼
                                                DecisionTrace.evidenceReferences (existing, additive JSONB)
```

Concretely: this repo already has a **registered, honestly-stubbed** provider for exactly this data — `backend/services/providers/definitions/optionsFlowProvider.js` (added Sprint 37), whose own header comment states real unusual-options data "requires a specialized paid vendor... no free, no-auth equivalent exists," and whose `fetch` is `honestStubFetch` (returns `[]`). This architecture is the design for what runs **behind** that provider once a real vendor relationship exists — it does not propose a second, parallel ingestion path.

## 3. Required data sources

| Data need | Real source today | Gap |
|---|---|---|
| Options trade prints (contract, size, price, exchange, timestamp, bid/ask at execution) | None — `optionsFlowProvider.js` is an honest stub | Requires a paid options-flow vendor or a direct OPRA (Options Price Reporting Authority) feed license. No free/no-auth equivalent exists, confirmed by this codebase's own prior research (`SOURCE_INTELLIGENCE_CRITIC_REPORT.md`). |
| Open interest (OI), per contract, end-of-day | None | Same vendor typically supplies this; if not, a secondary source (e.g. OCC's public end-of-day OI file) is a plausible free supplement — to be confirmed once a vendor is chosen. |
| Underlying quote/price (for notional value, ATM/OTM classification) | **Real, already live** — Finnhub via `marketApi`/`altDataService.js` | None — reuse as-is. |
| Historical per-contract/per-symbol baseline volume | None — must be built from this engine's own accumulated history (see §5a) | Cannot be sourced externally on day one; the engine bootstraps its own baseline over its first weeks of real ingestion, and must **honestly report "insufficient baseline history"** rather than fabricate a Z-score during that bootstrap window — same discipline as `altDataService.js`'s `fallbackCot()` labeling fallback data `source:"fallback"`. |
| Symbol universe to scan | Reuse existing `AUTONOMOUS_SCAN_UNIVERSE`/watchlist/portfolio symbols (`autonomousMarketService.js`, `useWatchlist`) | Do **not** invent a second hardcoded universe — this repeats a known, already-flagged anti-pattern (`ADAPTIVE_INTELLIGENCE_AUDIT.md`'s selection-bias finding on the existing static scan universe). |

**Explicit, disclosed limitation:** until a real vendor is connected, every endpoint and UI surface described below returns the same honest `{status:"not_connected", provider:"pending"}` shape `altDataService.buildOptionsPlaceholder()` already returns today — this architecture does not change that user-facing honesty, it defines what replaces it once real data exists.

## 4. Event pipeline

```
1. INGEST     optionsFlowProvider.fetch() → raw trade prints + OI snapshots
                 (via providerIngestionService.js's existing per-provider
                  rate-limited scheduling — see §9)
2. NORMALIZE  raw vendor shape → OptionsFlowPrint rows (see OPTIONS_AGENT_DATA_MODEL.md)
                 contract identity: symbol + expiry + strike + right (CALL/PUT)
3. AGGREGATE  group prints by (symbol, expiry, strike, right) over rolling windows
                 (intraday: 5-min buckets; daily: full session)
4. DETECT     run the 5 detectors in §5 against each aggregate window
5. SCORE      combine detector outputs into one OptionsSignal via the
                 confidence model (§6) — never fabricated when a detector
                 has insufficient data (a detector that can't compute
                 simply contributes nothing, exactly like
                 scoringVocabulary.js's per-component fallback discipline)
6. EXPLAIN    generate a real, per-signal explanation (§7) — never a
                 shared template
7. PUBLISH    project the signal onto the canonical Event Envelope
                 (eventEnvelope.js) → persist as CanonicalEvent AND as the
                 new OptionsSignal row (§ data model) → becomes:
                   a) evidence: matchable by
                      autonomousRecommendationEngine.findMatchedEvents,
                      stored in DecisionTrace.evidenceReferences
                   b) a Decision Center item (new source, see §10.3)
                   c) a WorldMemoryRecord (§8) so Outcome-grading can
                      later ask "did this signal predict a real move?"
```

Every step above reuses an existing, already-tested module rather than inventing a parallel one — `providerIngestionService.js` for scheduling/rate-limiting, `eventEnvelope.js` for the canonical shape, `findMatchedEvents` for evidence matching, `WorldMemoryRecord`/`Outcome` for outcome-grading. The only genuinely new code this design requires is the 5 detectors (§5), the confidence rollup (§6), the explanation generator (§7), and the new tables in `OPTIONS_AGENT_DATA_MODEL.md`.

## 5. Signal detection

Each detector is a **pure function** over already-ingested data — never fetches its own network data, never fabricates a result when its required input is missing (same contract discipline as `frontend/src/components/chart/overlayRegistry.js`'s documented indicator contract and `alertTypeRegistry.js`'s evaluator contract). A detector that lacks sufficient data returns `null`/no signal, not a guessed value.

### 5a. Volume vs. historical baseline

- **Definition:** today's (or this rolling window's) contract or symbol-level options volume, expressed as a multiple of that same contract/symbol's own trailing baseline (e.g. 20-session average volume for that specific strike+expiry, or aggregate call/put volume for the underlying if per-contract history is too thin).
- **Trigger:** volume ≥ a configurable multiple of baseline (e.g. 5×) **and** a minimum absolute size floor (avoids flagging a contract that went from 2 contracts to 20 — mathematically a 10× multiple, but not economically unusual).
- **Honest gap:** baseline requires this engine's own accumulated history (§3). During the bootstrap window (first N sessions), this detector reports `insufficientBaselineHistory: true` rather than a fabricated multiple — mirrors `qualityDashboardService.js`'s existing "honestly null when undersampled" convention.

### 5b. CALL vs. PUT anomalies (skew)

- **Definition:** the real-time call-volume/put-volume ratio (or call-OI/put-OI ratio) for a symbol, compared against that same symbol's own historical put/call ratio baseline (not a market-wide constant — every symbol has its own normal skew).
- **Trigger:** the day's ratio deviates from the symbol's baseline by more than a configured number of standard deviations (a Z-score approach, consistent with how `newsSourceScoringService.js`/calibration work elsewhere in this codebase already reasons in relative-to-baseline terms rather than fixed thresholds).
- **Directional label:** unusually call-heavy → bullish-leaning skew; unusually put-heavy → bearish-leaning skew. This label feeds the confidence model's corroboration term (§6) but is never surfaced as a standalone action.

### 5c. Sweep detection

- **Definition (real market microstructure term):** a **sweep** is a single logical order for one contract that a broker splits and routes across multiple exchanges simultaneously to guarantee an immediate, aggressive fill — a strong "buyer/seller wants in *now*" signal.
- **Detection logic:** cluster `OptionsFlowPrint` rows by (contract, tight time window — e.g. ≤2 seconds) where: (a) ≥2 distinct exchanges are represented, (b) each print executes at or through the prevailing ask (for a buy-side sweep) or bid (for a sell-side sweep) at trade time, (c) the summed size clears a minimum threshold. Aggressor side is inferred by comparing `price` to `bidAtTrade`/`askAtTrade` on each print (a print at/above ask is aggressor-buy; at/below bid is aggressor-sell) — never guessed from price alone without the recorded bid/ask.
- **Requires:** trade-level data with real exchange identifiers and prevailing bid/ask at execution time — a real data-source requirement flagged in §3, not assumed to be free.

### 5d. Block trades

- **Definition:** a single, large-size print (contract count or notional-value threshold, e.g. ≥100 contracts or ≥$100,000 notional) — typically a negotiated, off-exchange-facilitated cross, distinct from a sweep (a sweep is defined by exchange-splitting + urgency; a block is defined by size in one print, and may be executed at the midpoint rather than aggressively through the book).
- **Detection logic:** a single `OptionsFlowPrint` row whose `size`/`notionalValue` exceeds the threshold. Sweep and block are **not mutually exclusive labels** — both are recorded on `OptionsSignal.signalType`/flags where applicable (a large sweep can also individually contain a block-sized child print).

### 5e. Open interest (OI) analysis

- **Definition:** the change in total outstanding contracts for a specific contract from one session's OI snapshot to the next.
- **Purpose:** disambiguates "new position opening" from "existing position closing/rolling" — the single most important qualitative distinction unusual-volume detection cannot make on its own. A volume spike **with** a subsequent OI increase of comparable size suggests genuinely new, informed positioning; a volume spike **without** an OI increase (or with a decrease) suggests unwinding/rolling, a materially weaker signal.
- **Timing constraint, disclosed honestly:** OI is published end-of-day by the options exchanges/OCC, one session in arrears. This detector therefore cannot confirm same-day — every signal is created with `oiConfirmationStatus: PENDING` and is re-evaluated the following session once the next OI snapshot lands, at which point it transitions to `CONFIRMED_NEW_POSITION`, `CONFIRMED_CLOSING`, or (if the position was already closed/expired) `UNCONFIRMED`. This is a real, staged-confidence design, not same-day certainty dressed up as immediate.

## 6. Confidence model

Documented in the exact same shape and location as every other scored concept in this platform: a **new entry proposed for `backend/services/scoringVocabulary.js`'s `SCORE_DEFINITIONS`**, not a parallel scoring system.

```js
optionsAnomalyConfidence: {
  range: [0, 100],
  meaning: "How strongly this options-activity anomaly resembles genuine informed positioning, as opposed to routine hedging/rolling/noise.",
  formula: "sizeScore*0.35 + classificationStrength*0.30 + oiConfirmationAdjustment + skewCorroborationAdjustment, clamped 0-100.",
  fallback: "Reported only once at least the volume-vs-baseline detector (§5a) can compute a real multiple; never fabricated during the baseline bootstrap window.",
  apiField: "OptionsSignal.anomalyScore",
  uiRepresentation: "Reuses the existing 4-band ConfidenceBadge vocabulary (Low/Moderate/High/Very High) from Badge.jsx's confidenceBand — no new confidence taxonomy invented.",
}
```

Component definitions:

- **`sizeScore`** (0–100): a bounded, monotonic transform of the volume-vs-baseline multiple from §5a (e.g. `min(100, (multiple / triggerMultiple) * 60)`), so a 5× trigger multiple maps to 60 and a 15×+ event saturates near 100.
- **`classificationStrength`** (0–100): a fixed base score per detector combination — sweep-with-block ≥ sweep-alone ≥ block-alone ≥ volume-spike-alone — reflecting how much stronger a coordinated, aggressive, urgent execution pattern is as evidence of informed trading versus a raw size anomaly.
- **`oiConfirmationAdjustment`**: `0` while `PENDING`; `+15` once `CONFIRMED_NEW_POSITION`; `-20` once `CONFIRMED_CLOSING` (closing/rolling activity is a materially weaker directional signal, and should visibly score lower once confirmed, not just be silently relabeled); `-10` if `UNCONFIRMED` past a reasonable window (matches `autonomousMarketService.recencyScore`'s existing decay-over-time philosophy).
- **`skewCorroborationAdjustment`**: `+10` when a same-direction §5b skew anomaly co-occurs; `-10` when a contradicting skew exists — a direct reuse of `scoringVocabulary.js`'s existing `evidenceAgreement` concept (fraction of directional evidence that agrees), applied within this one signal instead of across a whole recommendation's evidence set.

**Honest, explicitly disclosed simplification** (mirroring `scoringVocabulary.js`'s own documented note on `conviction`/`confidence`/`modelConfidence` today being "the same underlying number under three names... pending real calibration data"): until enough graded `Outcome`-style history exists for options signals specifically (see §8), the weights above are fixed, hand-set constants, not the product of a fitted model. This is stated in the UI/API documentation itself, not hidden.

## 7. AI explanation pipeline

The single most important design constraint here is one this platform has repeatedly, expensively re-learned the hard way: **Daily Feed's explanation-template-collision bug** (memory: identical "Rate Hikes 88%"/"Covid 42%" sentences reused verbatim across unrelated headlines, confirmed unresolved across 4+ review sessions) must not recur here.

Design rule: the explanation generator's function signature **requires** the specific numeric fields of the signal that produced it as arguments — it cannot compile/run against a generic "signal happened" shape. Example (illustrative, not implementation):

```
buildOptionsSignalExplanation({
  symbol, optionType, strike, expiry, signalType,
  volumeMultiple, notionalValue, sweepExchangeCount,
  oiConfirmationStatus, putCallSkewZScore, aggressorSide,
}) → string
```

Every one of those fields is per-signal, per-contract, per-session data — there is no shared "category" bucket a second, unrelated signal could accidentally collide into (unlike the Daily Feed bug, where several different-symbol headlines shared one historical-similarity-cluster string). The explanation reads roughly like: *"NVDA Jan-17 $150 calls traded 8.4× their 20-session average volume today ($2.1M notional), with 3 of the largest prints executing as a cross-exchange sweep at the ask — consistent with aggressive, urgent buying. Open interest confirmation is pending until tomorrow's session."* — every clause traces to a real field on the signal, nothing is boilerplate.

This mirrors `decisionTraceExplainabilityService.js`'s existing single-decision traceability pattern (recommendation → committee → evidence → confidence → outcome) — the Options Agent's explanation is one more link the same explainability chain can already display, not a new, separate narrative system.

## 8. Governance — "signal, never a verdict"

- The Options Agent's output object **never contains** any of `canonicalVerdict.js`'s `FORBIDDEN_COMMITTEE_KEYS` (`action`, `decision`, `verdict`, `finalDecision`, `recommendation`). This is enforced the same way that module enforces it for the Committee: a sanitization step strips any of those keys before an `OptionsSignal` is ever included in an API response, as a structural guard independent of what the detectors happen to compute.
- When an `OptionsSignal` is cited as evidence for an existing `Recommendation` (via `DecisionTrace.evidenceReferences`), it participates in `evidenceAgreement`/`uncertainty` exactly like any other matched event — it does not get a privileged, larger vote just because it is exciting-sounding data.
- **Outcome grading, reused not reinvented:** once a signal is later confirmable against real price action, it is written as a `WorldMemoryPrediction` (existing table, already designed for "what prediction did we make") pointed at the new `OptionsSignal.id` (see `OPTIONS_AGENT_DATA_MODEL.md`), so the existing `Outcome` grading pipeline (`TimeWindow`, `GradeLabel`, `methodologyVersion`) grades it with the same honest, already-built discipline (including the existing `UNGRADEABLE` category for delisted/halted symbols) — this design does not build a second, parallel grading system.
- **Compliance framing, matching `TradingPrinciple`'s existing precedent:** no field on any table in this design has any relation to `Portfolio`, `Order`, or `Trade`, and nothing in this design places a trade or influences position sizing directly. The Options Agent informs; it never executes.

## 9. Background jobs

Follows the exact single-instance `node-cron` pattern already used by `schedulerService.js` / `providerScheduler.js` / `alertScheduler.js` / `themeSnapshotScheduler.js` — one in-process trigger, no queue/broker, `start()`/`stop()`/`runNow()`/`getStatus()` shape, started only from `server.js`.

Two schedulers, not one, because ingestion and OI-confirmation happen on genuinely different real-world cadences:

- **`optionsFlowIngestionScheduler.js`** — every 3–5 minutes **during market hours only** (options flow is time-sensitive; the existing 15-minute `providerScheduler.js` cadence, tuned for wire news, is too slow for a "sweep just happened" signal to still be useful). Market-hours gating reuses whatever the app already has for "Market: Open 🟢" (visible in `Header.jsx` today) rather than a second clock.
- **`optionsOiConfirmationScheduler.js`** — once daily, shortly after options-market close + OI publication lag, re-evaluates every `PENDING` `OptionsSignal` from the prior session against the new OI snapshot, mirroring `themeSnapshotScheduler.js`'s "once daily, just after a fixed real-world data-availability point" pattern.

**Retention/pruning:** raw `OptionsFlowPrint` rows are the ingestion detail, not the durable record — the durable, queryable artifact is `OptionsSignal` (+ its `evidenceSnapshot` JSON, which preserves the specific prints that triggered it). A pruning job (same shape as the other schedulers) can safely drop `OptionsFlowPrint` rows older than the longest detection window once no longer needed (proposed default: 30 days), keeping the hot ingestion table small while `OptionsSignal` (much lower volume — anomalies, not every print) accumulates indefinitely like `DecisionTrace`/`WorldMemory*`.

## 10. Scalability considerations

- **Realistic universe size, stated honestly:** a serious options-flow feed is not "all US equities" at launch — it is the existing tracked universe (portfolio + watchlist + `AUTONOMOUS_SCAN_UNIVERSE` symbols), the same bounded, disclosed set already used elsewhere (§3). Expanding beyond it is a deliberate, future, cost-scoped decision, not an assumed default.
- **Rate limits:** `providerFactory.js`'s existing `rateLimit: { maxPerMinute }` contract already applies to `optionsFlowProvider.js` (currently `20`) — real vendor rate limits will need to be re-confirmed once a vendor is chosen, but the enforcement mechanism already exists and needs no new code.
- **Write volume:** raw trade prints are the highest-volume table in this design by a wide margin. The detectors are designed to run against **aggregated windows**, not to re-scan the full print history on every pass — an incremental, watermark-based scan (a proposed `lastProcessedPrintId`/timestamp cursor per symbol) avoids O(n²) rescans as history grows, the same incremental-processing shape `providerIngestionService.js` already uses for dedup via `CanonicalEvent.deduplicationKey`.
- **Queue extension point, already precedented:** `providerScheduler.js`'s own header comment explicitly states its sequential per-provider loop is "the framework's explicit extension point for a future queue: swapping this sequential loop for 'enqueue one job per provider' is the only change a real queue would require." The Options Agent's ingestion/detection steps are designed as the same kind of discrete, stateless, idempotent unit of work (one unit = one symbol's detection pass for one window), so the same future BullMQ/Redis-style upgrade path applies without a redesign.
- **Known, disclosed non-goal:** this design does **not** attempt real-time (sub-second) sweep detection at launch — the 3–5 minute polling cadence in §9 means a sweep is detected within minutes, not milliseconds. True tick-level streaming would require a persistent websocket/feed connection and a materially different ingestion architecture; that is out of scope for this phase and should be revisited only once a real vendor relationship and its actual data-delivery mechanism (REST polling vs. streaming) are known.

## 11. Integration points

### 11.1 Mission Control (`frontend/src/screens/MissionControlHomeScreen.jsx`)

A new section, **built from the same certified NOVA components already used there** (`Card`, `Badge`, `ConfidenceBadge`, `EmptyState`, `Table`) and following the exact discipline the X12C.1/X12C.1.1 review cycle just enforced on that screen: the label appears once (Card eyebrow only, never repeated in a Badge), buttons use the certified `Button` component, and — critically — **an absent signal renders `EmptyState`, never a fabricated 0-value score** (the same lesson as that screen's now-fixed "Portfolio Risk" defect). Proposed section: "Unusual Options Activity" — a small table of the day's highest-`anomalyScore` signals across tracked symbols, each row explicitly subtitled "Signal, not a recommendation," linking through to the existing "Open Recommendations"-style CTA pattern.

### 11.2 Intelligence Workspace (`WatchlistFoldersScreen.jsx` / `workspaceService.js`)

`workspaceService.getWorkspace()` already composes several real, independently-fetched signals per workspace folder (`marketPositioningService`, `impactGraphService`, alert/notification summaries), each wrapped in its own `.catch(() => null)` so one failing signal never blocks the rest. This design adds one more composed field, `optionsActivitySummary`, following that exact pattern — a real count of the workspace's tracked symbols with an active `OptionsSignal` in the last N hours, honestly `null` (not `0`) when unavailable, exactly like `workspaceService.js`'s existing `health`/`performance` fields.

### 11.3 Portfolio Workspace (`PortfolioEngineScreen.jsx` / `portfolioEngineService.js`)

Unusual options activity on a **held** symbol is materially more relevant than on an unheld one. This design adds one more derived, never-fabricated row to `PortfolioScreen.jsx`'s existing `buildAdvisorInsights()` function — e.g. `optionsActivityOnHoldings: "NVDA (held, 8% of portfolio) shows unusual call sweep activity today."` — computed the same way every other row in that function already is (from data this screen already has, nothing newly fetched client-side). When a signal on a held symbol crosses a materiality threshold, it also becomes a new Decision Center source (§11.4), so it surfaces where the user already looks for "what needs my attention today," not only buried in the Portfolio screen.

### 11.4 Decision Center (`decisionCenterService.js`)

`decisionCenterService.js`'s `SOURCE_LABELS` today has two real sources (`priceAlert`, `aiRecommendationChanged`) plus two honestly-disclosed unavailable ones. This design proposes a third real source, `unusualOptionsActivity`, gated to signals on symbols the user actually holds or tracks (same `heldSymbols`/`symbolToFolderNames` context `loadContext()` already builds) — never surfaced for an untracked symbol, matching this screen's existing "never a generic market-wide feed" design intent.

### 11.5 Future Stock Page (`StockSidePanel.jsx` today, and its eventual full-page successor)

Two integration surfaces, both additive to what already exists:

- **A new panel section**, positioned alongside the existing Opportunity Score/Market Positioning sections, following the exact same per-section honest-error-state pattern already in that file (`opportunityError`/`EmptyState` conditional rendering) — never a silent blank area.
- **A new chart overlay registry entry** in `frontend/src/components/chart/overlayRegistry.js`, following the exact "architecture-only, `implemented: false`" convention already used for `AI_SIGNALS`/`NEWS_EVENTS`/`EARNINGS`:
  ```js
  UNUSUAL_OPTIONS: {
    label: "Unusual Options Activity",
    category: OVERLAY_CATEGORY.SIGNAL,
    implemented: false,
    pane: "price",
    dataDependency: "Would mark bars aligned to real OptionsSignal.detectedAt timestamps for this symbol, once the options-flow vendor (§3) is connected.",
  }
  ```
  This is the correct place for it precisely because `symbolIntelligenceService.js` (the real, existing per-symbol composition layer already feeding `StockSidePanel`) is the natural place to add a sixth composed field (`unusualOptionsActivity`, alongside its existing `impactGraph`/`marketPositioning`/`opportunityScore`/`aiSummary`/`alerts`) once a "Future Stock Page" replaces the side-panel with a dedicated route — the composition point does not need to change, only its consumer.

## 12. Known gaps and honest limitations (disclosed up front, not discovered later)

- **No real data source exists today.** This entire design is inert until a real options-flow vendor or OPRA license is procured — exactly the state `optionsFlowProvider.js`'s own comment already discloses. Nothing here should be represented to a user as "live" before that happens.
- **Baseline bootstrap period.** §5a's volume-vs-baseline detector cannot honestly report a multiple until this engine has accumulated its own history — there is no external source for "this specific contract's 20-session average volume" on day one.
- **OI confirmation is always one session late**, by the real structure of how OI is published — not a limitation of this design, but one that must be surfaced honestly in the UI (`oiConfirmationStatus: PENDING`) rather than presented as same-day certainty.
- **Fixed, hand-set confidence weights until real Outcome history exists** — stated in §6, not hidden.
- **Sweep detection requires tick-level, per-exchange data** — a materially higher vendor-cost tier than end-of-day OI or daily aggregate volume; if only lower-fidelity data is affordable at launch, §5c should be honestly marked `unavailable` rather than approximated from aggregate volume alone (which cannot actually detect a sweep, only a spike).
