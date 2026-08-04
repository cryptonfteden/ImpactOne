# Algorithmic Activity Intelligence — Research

**Phase:** ALGORITHMIC-ACTIVITY-RESEARCH-001. Pure research — no production code was written. **Explicit framing, repeated throughout this document per the mission's own instruction: the goal is never to identify *which* algorithm, *which* firm, or *whether* manipulation occurred — only to detect and score statistically significant signatures in the public tape that are *consistent with* systematic/algorithmic execution.** This is a scientifically meaningful, narrower, and more defensible goal than "algorithm detection," and every signal below is framed and confidence-scored accordingly.

This would be a genuinely **new, 14th agent category** — confirmed via direct registry inspection that none of this platform's existing 13 registered agents (3 real: technical/options/sentiment; 10 honest stubs: news/shortInterest/earnings/valuation/fibonacci/insider/etfFlow/**institutional**/macro/analystConsensus) cover this. The existing `institutionalAgent.js` stub is explicitly about **institutional-*ownership*** analysis (13F-style holdings positioning) — a completely different concept from institutional-*execution*-pattern detection in the live tape, which is what this mission asks for. The existing `backend/services/domainAgents/optionsFlowAgent/signalsAnalyzer.js`'s `institutionalActivity()` function (real, already shipped) detects block trades/sweeps **within the options tape only** — this research is the equities/broad-market-tape analog and complement, not a duplicate.

---

## 1. Market microstructure — required foundation

*(Full conceptual glossary in `MARKET_MICROSTRUCTURE_GUIDE.md`; summarized here only as needed to ground the signal-by-signal research below.)*

U.S. equity trading is fragmented across 16+ registered exchanges plus off-exchange venues (ATSs/dark pools, wholesaler internalization), consolidated into a single public "SIP" (Securities Information Processor) tape that most retail-tier vendors redistribute. Three fundamentally different data granularities exist, and **which granularity a vendor provides is the single biggest determinant of which signals below are even computable**:

| Granularity | What it contains | Who provides it |
|---|---|---|
| **L1 (top-of-book / NBBO)** | Best bid, best offer, last trade — one price level per venue, consolidated into a National Best Bid/Offer | Nearly every retail/pro-tier vendor (Massive.com, Tradier, Finnhub, Alpha Vantage) |
| **L2 (depth-of-book)** | All displayed price levels and their aggregate size, per venue | A meaningfully smaller set of vendors — Databento, dxFeed, direct exchange feeds (NASDAQ TotalView, NYSE OpenBook, CBOE PITCH) |
| **L3 (market-by-order, full message stream)** | Every individual order add/modify/cancel/execute message, order-by-order, not aggregated | Only direct exchange feeds and the small number of vendors that redistribute them raw (confirmed live this session: **Databento explicitly offers MBO — market-by-order — as a named schema**, and is a listed access vendor for NASDAQ TotalView data) |

This tiering directly determines the "required market data" and "confidence level" columns for every signal below — several of this mission's requested signals (quote stuffing, true iceberg confirmation) are **only rigorously detectable at L3**, not L1 or even L2.

---

## 2. Signal-by-signal research

Each entry specifies: required market data, whether/how it can be inferred from a lower data tier, a confidence level for that inference, and the real false-positive risks. **Scientific defensibility rating** (Strong / Moderate / Speculative) is stated for every signal per this mission's explicit requirement — see also `MARKET_MICROSTRUCTURE_GUIDE.md`'s dedicated section on this distinction.

### 2.1 VWAP-tracking execution

- **What it is:** an execution algorithm that slices a large parent order into child orders sized to track a security's own historical/expected intraday volume curve, aiming for an average execution price near the day's Volume-Weighted Average Price.
- **Required market data:** trade prints (price, size, timestamp) for the full session; the security's own intraday volume profile (either observed live or a historical baseline).
- **Can it be inferred?** Yes, from L1 trade-tape data alone — no L2/L3 required. Computed by comparing the running average execution price of a *cluster* of same-direction trades (not necessarily from one single counterparty — the tape doesn't reveal who's behind a given print) against the security's own rolling VWAP, and measuring how tightly that cluster tracks it over the session.
- **Confidence level: Moderate.** A tight VWAP-tracking pattern is a real, measurable statistical fact, but the tape alone cannot attribute it to one order/desk — many *unrelated* market participants trading near VWAP simultaneously can produce a similar aggregate statistical footprint to one large VWAP algo. This is a structural, permanent limitation of consolidated-tape-only analysis, not a fixable data-quality gap.
- **False-positive risks:** a generally low-volatility, orderly trading day for any reason (not necessarily algorithmic) will *naturally* show prices tracking near VWAP; must be baselined against the security's own historical VWAP-tracking tightness, not an absolute threshold.
- **Scientific defensibility: Strong** (as a statistical description of *tape behavior*), **Moderate** (as an inference about *cause*).

### 2.2 TWAP-tracking execution

- **What it is:** slices a parent order into roughly equal-sized child orders at **regular time intervals**, independent of volume.
- **Required market data:** trade timestamps and sizes for a cluster of same-direction trades.
- **Can it be inferred?** Yes, from L1 trade-tape data alone. The key statistical test is **regularity of inter-trade timing** — computable via the autocorrelation function of trade inter-arrival times, or a periodogram/FFT of trade counts across fixed time buckets, looking for a dominant, non-random periodicity.
- **Confidence level: Moderate-to-Strong** for the *statistical regularity* itself (this is a directly measurable, well-defined time-series property); **Moderate** for attributing it specifically to a TWAP algorithm rather than another periodic, non-value-driven flow source (e.g., a scheduled corporate buyback program, which also often executes on a time-based schedule).
- **False-positive risks:** low-liquidity names naturally have sparser, more irregular trade timing that can spuriously resemble or obscure periodicity; market-open/close auction mechanics impose their own real, non-algorithmic periodicity that must be excluded from the analysis window.
- **Scientific defensibility: Strong** for detecting statistical periodicity; **Moderate** for the TWAP-specific attribution.

### 2.3 Iceberg orders

- **What it is:** a large resting limit order that displays only a small "tip," automatically replenished at the same price as each tip is filled, concealing the order's true total size.
- **Required market data (rigorous):** L2/L3 — the displayed size at a given price level, compared over time against the cumulative volume actually executed at that exact price. A true iceberg signature is: repeated executions at one price level whose *cumulative* traded volume substantially exceeds what the *displayed* size at that level could have supported without refilling.
- **Can it be inferred from L1/trade-tape alone?** Partially, with materially lower confidence — a proxy signature is repeated trade prints at the *exact same price*, in similar clip sizes, recurring over a short window, without any L2 confirmation that the displayed size never grew commensurately. This proxy cannot distinguish a true iceberg from coincidental repeated trading at a psychologically significant round-number price level (a real, common, non-algorithmic phenomenon).
- **Confidence level: Strong with L2/L3 data; Weak-to-Moderate from trade-tape alone.**
- **False-positive risks:** round-number price clustering (a well-documented, purely psychological/human phenomenon, not evidence of iceberg orders); options market-maker delta-hedging activity that recurs at a stable price; the closing/opening auction's own price-discovery mechanics.
- **Scientific defensibility: Strong at L2/L3; Speculative from trade-tape-only inference** — this distinction should be surfaced explicitly to any consumer of this signal, never blurred into one confidence number regardless of which data tier produced it.

### 2.4 Hidden liquidity / dark-pool activity

- **What it is:** liquidity that never displays on the lit order book — true off-exchange dark-pool/ATS executions (reported to the tape via a Trade Reporting Facility with a distinct venue/exchange code), plus non-displayed "reserve" portions of orders resting on lit exchanges.
- **Required market data:** trade prints tagged with exchange/venue identifiers (a TRF/FINRA-ADF code is a **direct, observable fact**, not an inference, whenever a vendor exposes venue codes) — this is the one signal in this whole list requiring the *least* inference, since it's often a labeled fact on the tape itself.
- **Can it be inferred?** The venue-level fact (was this trade dark or lit) needs no inference at all if venue codes are present. **The reserve-order-on-a-lit-exchange variant** (part of a displayed order is hidden) does require L2 comparison (execution at a price level where cumulative volume exceeds displayed size, similar to iceberg detection above).
- **Confidence level: Strong** for the labeled dark/lit fact; **Moderate** for the lit-exchange-reserve-order variant (same L2-dependency caveat as icebergs).
- **A genuinely free, official, live-verified data source exists for the aggregate version of this signal:** FINRA publishes weekly ATS (dark pool) volume transparency data publicly, for free, per security — this is the single best "MVP-tier, zero-cost" data point in this entire research for a real, officially-sourced dark-pool-participation percentage, even before any paid trade-level vendor is chosen.
- **False-positive risks:** low; the main risk is treating a normal, unremarkable level of dark-pool participation (which exists for essentially every liquid U.S. stock, typically in the 30-45% range of total volume as a matter of routine market structure, not a signal of anything unusual) as if it were itself alarming — the *level relative to that security's own baseline*, not the mere presence of any dark volume, is the real signal.
- **Scientific defensibility: Strong** for the labeled-venue fact; **Moderate** for the reserve-order inference.

### 2.5 Liquidity sweeps (equity-tape analog of the Options Agent's sweep detector)

- **What it is:** a marketable order (or coordinated set of orders) that consumes multiple price levels and/or executes across multiple venues within a very tight time window, "sweeping" through displayed liquidity to fill size quickly. Reg NMS formally defines the **Intermarket Sweep Order (ISO)** order type for exactly this purpose, and some data feeds expose an explicit ISO flag.
- **Required market data:** trade prints with real exchange identifiers and sub-second timestamps, at minimum; an explicit ISO flag (where a vendor exposes it) removes essentially all ambiguity.
- **Can it be inferred?** Yes, with the same methodology already designed and implemented for the Options Agent (`OPTIONS_AGENT_ARCHITECTURE.md` §5c): cluster prints by (security, tight time window) where ≥2 distinct exchanges are represented and each executes at/through the prevailing NBBO at trade time.
- **Confidence level: Strong** when an explicit ISO flag is present; **Moderate** when inferred purely from cross-exchange timestamp clustering without the flag (timestamp precision/clock-sync differences across venues introduce real noise at sub-second resolution).
- **False-positive risks:** SIP-vs-direct-feed latency/synchronization differences can make unrelated trades on different exchanges *appear* simultaneous; a genuinely thin/illiquid stock can show an apparent "sweep" that's really just the entire visible order book being small, not a large aggressive order.
- **Scientific defensibility: Strong.** This is the single most scientifically well-grounded signal in this entire list, since Reg NMS gives it a precise, official, non-ambiguous definition.

### 2.6 Quote stuffing

- **What it is:** rapid submission and near-immediate cancellation of a very large number of orders/quotes, without genuine intent to trade — a real, documented phenomenon in academic market-microstructure literature (studies of abnormal message-to-trade ratios preceding specific market events).
- **Required market data:** **full order-message-level data (L3) — every new order, every modify, every cancel** — not just trades, and not even just L2 depth snapshots (which only show the *current* aggregate state, not the churn rate of individual orders behind it).
- **Can it be inferred from a lower tier?** Only very crudely. A **quote-update-rate proxy** (how often the NBBO itself changes, from an L1/top-of-book quote stream) is a real, weaker signal that correlates with but does not confirm quote stuffing specifically — high NBBO update frequency has many innocent causes (genuinely fast-moving, high-interest news-driven trading being the most common).
- **Confidence level: Strong only with true L3 order-message data (enterprise tier); Weak from any lower tier.** This is the single most data-intensive, hardest-to-rigorously-detect signal in the entire mission list.
- **False-positive risks:** market-maker quote updates during fast markets, legitimate high-frequency market-making activity (providing continuous liquidity is not the same as stuffing), and options-market-maker hedging-driven equity quote activity can all inflate a naive quote-to-trade ratio without any stuffing occurring.
- **Scientific defensibility: Strong as an academically-documented phenomenon; Speculative to detect reliably without true L3 data** — recommend this signal be explicitly labeled low-confidence/unavailable at MVP and re-evaluated only once enterprise-tier order-message data is actually connected, rather than shipped as a crude, weak proxy presented with unwarranted confidence.

### 2.7 Momentum ignition

- **What it is:** a documented (including in SEC enforcement actions and post-2010-Flash-Crash academic literature) alleged strategy where an algorithm initiates a burst of orders/trades intended to trigger a rapid price move, which other momentum-following/algorithmic strategies then reinforce, allowing the initiator to profit from a position established beforehand.
- **Required market data:** trade prints with volume and timestamps; ideally L2 to distinguish "genuine" liquidity-driven moves from thin-book-driven ones.
- **Can it be inferred?** Only as an **observable proxy pattern**: a rapid, sharp price move on unusually *low* initiating volume, immediately followed by a volume surge in the *same* direction (the "pile-on"), often followed by partial reversion. This proxy is consistent with momentum ignition but is equally consistent with several entirely legitimate causes (a genuine news break, a large legitimate order revealing new information, a short squeeze).
- **Confidence level: Weak-to-Moderate at best, even with rich data.** Unlike sweeps (§2.5, which has a precise regulatory definition) or dark-pool participation (§2.4, a labeled fact), momentum ignition's defining element is **intent** — something no amount of public tape data can directly observe. This is, by a wide margin, the most speculative signal in the entire mission list.
- **False-positive risks:** the single highest false-positive risk of any signal here — genuine news, legitimate large-order information leakage, and short squeezes all produce statistically similar tape signatures to the alleged ignition pattern, and cannot be reliably distinguished from it using market data alone (a news feed cross-check, already available in this platform via existing providers, is a *necessary*, not optional, corroborating input before this signal should ever be surfaced with meaningful confidence).
- **Scientific defensibility: Documented as a real phenomenon in enforcement/academic literature; Speculative as a live, general-purpose detection signal.** This should be the **lowest-confidence-ceiling signal in the entire scoring model** (see `ALGORITHMIC_ACTIVITY_SCORING.md` §2) and should never be presented to a user without an explicit, prominent "consistent with, not proof of" disclaimer — the single most important labeling discipline in this whole research.

### 2.8 Liquidity imbalance / Order Book Imbalance (OBI)

- **What it is:** the relative difference between resting bid-side and ask-side size (`OBI = (bidSize − askSize) / (bidSize + askSize)`), one of the most heavily studied, empirically validated short-term price-impact metrics in the academic market-microstructure literature (e.g., the well-known Cont/Kukanov/Stoikov line of research on order-book-event price impact).
- **Required market data:** L2 depth-of-book (ideally multiple levels, not just top-of-book) for the rigorous version; a cruder top-of-book-only version is computable from L1 bid/ask *size* (not just price), which some but not all L1 feeds expose.
- **Can it be inferred?** Yes, directly — this is a straightforward, well-defined arithmetic computation over real order-book data, not really an "inference" at all once the data exists.
- **Confidence level: Strong.** This is, alongside sweep detection (§2.5), one of the two most scientifically defensible signals in this entire research, precisely because it is directly measured (not inferred from a proxy) and has a large, credible academic evidentiary base for its short-term predictive value.
- **False-positive risks:** low, but imbalance alone says nothing about *why* — a genuine large resting order from one long-term institutional buyer produces the same imbalance signature as a coordinated multi-participant pattern; this signal should be described as "the book is currently imbalanced," never over-interpreted as revealing a specific cause.
- **Scientific defensibility: Strong.**

### 2.9 Abnormal quote-to-trade ratios

- **What it is:** the ratio of quote updates (or order messages) to actual executed trades — a real, regulator-recognized metric (some European venues under MiFID II impose actual order-to-trade ratio limits, confirming this is treated as a legitimate, quantifiable market-quality concept, not an informal heuristic).
- **Required market data:** a real-time NBBO/quote-update stream (moderate tier — more than a bare trade tape, materially less than full L3 order messages).
- **Can it be inferred?** The ratio itself needs no inference once a quote-update stream exists — it's a direct count. What *is* inferential is deciding what counts as "abnormal" for a given security, which requires a real historical baseline (per-security, since quote activity varies enormously by liquidity tier).
- **Confidence level: Strong** for the metric itself; **Moderate** for the "abnormal" threshold, which is baseline-dependent and should never be a single fixed constant across all securities.
- **False-positive risks:** genuinely fast-moving, high-interest names (heavy retail/news attention) naturally sustain higher quote-to-trade ratios without anything algorithmic or manipulative occurring; earnings/FOMC/major-news windows spike this ratio for entirely legitimate reasons across the whole market simultaneously, not just for one security — must be normalized against a market-wide baseline for the same time window, not just the security's own historical average.
- **Scientific defensibility: Strong** (the SEC's own MIDAS-derived public "Market Structure Data Downloads" — confirmed live this session — explicitly computes and publishes trade-to-order-ratio-style statistics as a matter of official market-quality research, a strong external validation that this is a scientifically legitimate, not merely informal, metric).

### 2.10 Trade fragmentation

- **What it is:** the degree to which a security's volume is split across many small trades (rather than a few large ones) and/or across many venues (rather than concentrated on one) — a well-documented, decades-long market-structure trend substantially *driven by* the rise of algorithmic execution (average U.S. equity trade size has fallen dramatically since the pre-decimalization/pre-algo era).
- **Required market data:** trade prints with size and venue — L1 trade-tape data is fully sufficient.
- **Can it be inferred?** Directly computable, not really inferential — average trade size vs. the security's own historical baseline, and a Herfindahl-style concentration index of venue-level volume shares.
- **Confidence level: Strong** for the statistic itself; **Moderate** for attributing a change specifically to *increased* algorithmic activity versus other causes (e.g., a broad market-wide volatility spike also tends to fragment trade sizes for reasons unrelated to any one security's own algorithmic footprint).
- **False-positive risks:** market-wide (not security-specific) shifts in trading behavior (a general volatility regime change, a market-wide venue-routing change) can move this metric for every security simultaneously — must be benchmarked against a market-wide baseline, not treated as security-specific evidence in isolation.
- **Scientific defensibility: Strong.**

### 2.11 Execution speed

- **What it is:** the observable pace of trading for a security — inter-trade time distribution, computable directly from trade timestamps.
- **Required market data:** trade prints with timestamps — L1 trade-tape data is sufficient for this specific, honestly-scoped version of the signal.
- **An important, explicit epistemic boundary:** the strict HFT-industry meaning of "execution speed" (microsecond-level infrastructure/decision-loop latency of a specific participant's trading system) is **categorically unobservable from any consolidated or SIP-derived feed, at any data tier, including enterprise**. The SIP itself introduces its own latency and jitter, and no amount of public market data reveals a specific participant's internal decision latency. **This must be disclosed as a hard, permanent boundary, not a data-tier upgrade path** — the only honestly-computable version of "execution speed" for this platform is the security's own observable inter-trade-time statistic, not a claim about any participant's true technological speed.
- **Confidence level: Strong** for the honestly-scoped inter-trade-time statistic; **not applicable / out of reach** for the stricter HFT-infrastructure-latency meaning, at any tier.
- **False-positive risks:** low for the honestly-scoped version; the real risk is over-claiming what this signal actually measures.
- **Scientific defensibility: Strong** for the scoped metric; explicitly **out of scope, not just "speculative,"** for the stricter interpretation.

### 2.12 Institutional execution patterns

- **What it is:** a large parent order worked over time by an institutional desk (via VWAP/TWAP/participation-rate/implementation-shortfall algorithms, or a human trader), typically visible as a sustained series of same-direction trades spread over an extended window, often multi-venue, with opportunistic (not uniformly aggressive) price behavior.
- **Design decision, stated explicitly:** this is **not a 15th independent detector** — it is a **composite/derived signal**, synthesized from §2.1 (VWAP-tracking), §2.2 (TWAP-tracking), §2.10 (fragmentation), and venue-diversity statistics already computable from the same trade-tape data. Treating it as an independent primary detector would risk double-counting the same underlying evidence twice under two different names — the exact kind of duplicated-logic anti-pattern this engagement has repeatedly found and fixed elsewhere in this codebase (e.g. the historically duplicated `statusTone()`/attention-threshold logic across screens, later consolidated into `claimPresentation.js`/`intelligenceEngine.js`).
- **Confidence level: Moderate** — inherits the confidence ceiling of its lowest-confidence contributing component.
- **Scientific defensibility: Moderate**, as a composite of Strong/Moderate underlying signals.

---

## 3. Data source evaluation

| Provider | L1 | L2 | L3 (MBO) | Notable for this mission | Cost class |
|---|---|---|---|---|---|
| **Databento** | Yes | Yes | **Yes — confirmed live: MBO (market-by-order) is a named, real schema; explicitly listed as a real access vendor for NASDAQ TotalView data** | The only vendor reviewed here offering genuine, self-service L3 order-by-order data — the single most versatile option for this mission, capable of powering every signal in §2 including quote stuffing and rigorous iceberg confirmation | $199/mo entry (Standard, confirmed live per `OPTIONS_DATA_RESEARCH.md`), scaling to enterprise |
| **dxFeed** | Yes | Yes | Enterprise-tier depth products available | Real-time OPRA/equities + depth-of-book; widely used in broker-embedded infrastructure; not independently re-verified live this session for exact L3/MBO availability | Enterprise, custom quote |
| **NASDAQ TotalView (/ TotalView+)** | N/A (this is itself a depth product) | **Yes — confirmed live: "full order book depth... every single quote and order at every price level," 20x+ the liquidity of L1** | TotalView itself is the depth/L2-class product; NASDAQ's ITCH raw feed underneath it is the true L3 message stream | Confirmed live: also publishes the real-time **Net Order Imbalance Indicator (NOII)** for opening/closing crosses — a genuinely valuable, official, already-labeled imbalance signal, directly relevant to §2.8 | Enterprise-tier direct feed; also available via Nasdaq Data Link APIs and market-data vendors (Databento confirmed as one) |
| **NYSE OpenBook (Ultra)** | N/A | **Yes — confirmed live: "event-based depth of book feed... aggregate limit-order volume and individual event-by-event volume, action and price information for all bid and offer prices," microsecond-latency, self-healing message format** | NYSE's own venue-specific depth/event feed — same category and purpose as TotalView, for NYSE/NYSE American-listed and -executed volume specifically | Enterprise-tier direct feed |
| **Polygon / Massive.com** | Yes (real-time trades/quotes/aggregates, confirmed live per `OPTIONS_DATA_RESEARCH.md`) | Not confirmed as a genuine full L2/L3 product — appears to be an L1-class (top-of-book + trades + aggregates) vendor | Not confirmed | Good, cost-effective source for §2.1/2.2/2.9/2.10/2.11 (all L1-sufficient signals); **not sufficient alone** for rigorous iceberg confirmation (§2.3), quote stuffing (§2.6), or true multi-level OBI (§2.8) | $29-$199+/mo tiers, confirmed live |
| **CBOE (PITCH feeds / DataShop)** | Yes | Yes, for CBOE-family venues (BZX/BYX/EDGX/EDGA) | Enterprise-tier available for CBOE's own venues | Same venue-specific-depth category as TotalView/OpenBook, for the CBOE exchange family specifically; also, per `OPTIONS_DATA_RESEARCH.md`, CBOE is a primary options-listing exchange with deep historical LiveVol archives | Enterprise, custom quote |
| **SEC** | N/A — not a real-time vendor at all | N/A | N/A | **Confirmed live this session: `sec.gov/data-research/market-structure-data` publishes real, free, no-cost, official aggregate microstructure datasets** — "Market Activity Data Series" (metrics by individual security, by security-and-exchange, summary-by-exchange, by market-cap/price/volatility/turnover decile) and "Quote Life Data Series" (quote-lifetime hazard/survivor/cumulative-distribution functions, conditional cancel-and-trade distributions) — **this is a uniquely valuable, zero-cost source specifically for *baselining* what "normal" quote-to-trade ratios and quote lifetimes look like across the whole market**, exactly the kind of ground-truth calibration data a confidence model (§`ALGORITHMIC_ACTIVITY_SCORING.md`) needs and would otherwise have to estimate from scratch | Free |
| **FINRA (not named in the mission's list, added as a materially important omission)** | N/A | N/A | N/A | Publishes free, weekly, official per-security ATS (dark pool) volume transparency data — confirmed as the standard, well-known industry source for §2.4's dark-pool-participation baseline; a direct live re-fetch of FINRA's specific data-catalog page failed this session (content-extraction error, not a confirmed-absent page) — recommend re-confirming the exact current URL/download format before implementation | Free |

### Explicit note on the mission's premise

The mission lists Databento/dxFeed/TotalView/OpenBook/Massive/CBOE/SEC as things to "evaluate" — this research finds they are **not mutually exclusive alternatives, but different layers of the same real market-data stack**: SEC/FINRA provide free, official, aggregate calibration data; Massive/Polygon-class vendors provide affordable L1 for the signals that only need it; Databento is the one vendor reviewed here that can *itself* provide genuine L3/MBO access (including, per its own site, as a redistribution path for NASDAQ's own TotalView data) — meaning **a single Databento relationship can plausibly cover the full data-tier spectrum needed for every signal in §2**, from L1 fragmentation statistics up to L3 quote-stuffing analysis, without requiring separate direct relationships with NASDAQ/NYSE/CBOE unless enterprise-scale cost or redundancy requirements eventually justify it.

---

## 4. Recommendations

### MVP

- **Free/official calibration layer:** SEC Market Structure Data Downloads (confirmed live, free) + FINRA weekly ATS data (free, standard industry source) — used to establish real, market-wide baselines for quote-to-trade ratios, quote lifetimes, and dark-pool-participation norms *before* any live signal is scored against them. This is a genuinely free, immediately actionable first step requiring no vendor contract at all.
- **Live L1 trade/quote tape:** Massive.com or a comparably-priced L1 vendor — sufficient for §2.1 (VWAP-tracking), §2.2 (TWAP-tracking), §2.9 (quote-to-trade ratio, if quote-stream access is included in the tier), §2.10 (fragmentation), §2.11 (execution-speed/inter-trade-time).
- **Explicitly deferred at MVP, and disclosed as such:** rigorous iceberg confirmation (§2.3), quote stuffing (§2.6), and true multi-level order-book imbalance (§2.8) all require L2/L3 data this MVP tier does not include — these should ship as either fully absent, or clearly labeled "low-confidence / limited-data" versions built from the trade-tape-only proxies described in §2, never silently presented at the same confidence as the L1-sufficient signals above.

### Production

- **Databento Standard/Plus tier** (per `OPTIONS_DATA_RESEARCH.md`'s already-confirmed live pricing: $199/mo entry, $1,750/mo+license fees for external-redistribution rights) — unlocks genuine L2/L3 (MBO) access, enabling rigorous iceberg confirmation, true multi-level OBI, and a meaningfully stronger (though still not enterprise-grade) attempt at the quote-to-trade-ratio-based portion of quote-stuffing detection.
- Continue running the SEC/FINRA free calibration layer permanently alongside the paid vendor — these remain the authoritative, independent baseline sources regardless of which paid vendor is chosen, exactly the same "keep the free official source as a permanent cross-check" recommendation `VALUATION_RESEARCH.md` made for SEC EDGAR XBRL data.

### Enterprise

- Direct exchange-operator relationships (NASDAQ TotalView/ITCH, NYSE OpenBook Ultra, CBOE PITCH) once genuine production scale, redundancy, or the deepest-possible L3 rigor for quote-stuffing detection specifically justifies the added cost/complexity of managing 3 separate direct-feed relationships instead of one vendor (Databento) redistributing similar underlying data — the same "enterprise tier is a graduation point, not a default starting point" framing already established in `OPTIONS_DATA_RESEARCH.md` §10.
- At this tier, quote stuffing (§2.6) becomes genuinely, rigorously detectable for the first time in this whole research — every lower tier's version of this signal should remain honestly labeled low-confidence until this point is reached.
