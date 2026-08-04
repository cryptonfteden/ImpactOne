# Macro Intelligence — Architecture Research

**Phase:** MACRO-RESEARCH-001. Pure research — no production code was written. Confirmed via direct source read: `backend/services/agentOrchestrator/agents/macroAgent.js` is an **honest stub** (`createStubAgent({ id: "macro", category: "MACRO", priority: 5 })`, own comment: *"macro analysis exists today only as a committee member (macroEconomistMember.js) over a shared evidence matrix, not a standalone, per-symbol-callable agent"*).

**The single most important finding of this entire research phase**: unlike every prior blank-slate research phase in this series (Options/Insider/ETF-Flow/Institutional/Short-Interest all started with *zero* real backend infrastructure), **a real, live, already-working macro data source already exists in this codebase** — `backend/services/altDataService.js`'s `getMacroData()` — but it is **not wired into the one consumer whose job is macro**. Direct source read of `backend/services/intelligenceCommittee/members/macroEconomistMember.js` confirms its own header comment: *"Only NEWS and COT are actually wired into the evidence matrix today — rates/inflation/employment/bonds/dollar have no real integration yet."* This is a genuine, disclosed, "real capability built but not connected" gap — directly continuing this whole engagement's own recurring finding pattern (the Options Agent's real backend with zero routes; the underused `detectSupportResistance()` pivot data) — and is the central architectural fact this whole research is built around.

---

## 0. What already exists (grounding facts, verified via direct source read)

- **`altDataService.getMacroData()`** is real and live: calls `fetchFredSeries()` for 5 series — `FEDFUNDS` (federal funds rate), `CPIAUCSL` (CPI index), `UNRATE` (unemployment rate), `M2SL` (M2 money supply), `DGS10` (10-year Treasury yield) — via FRED's public chart-export CSV endpoint (`fred.stlouisfed.org/graph/fredgraph.csv?id=...`), **not** the officially documented, API-key-based FRED REST API (confirmed live this session — see §Data source evaluation).
- **`deriveMacroRegime()`** is a real, simple, 2-4-input rule-based classifier producing `riskMode` (risk-on/risk-off), `inflationPressure` (low/moderate/high), `recessionRisk` (low/medium/high — from just unemployment level + fed funds level), `liquidityTrend` (improving/tightening — from M2's raw change sign only).
- **`fallbackMacroRegime()`** returns honestly-labeled (`source: "fallback"`) static placeholder numbers on fetch failure — correctly disclosed, unlike the undisclosed-fallback anti-pattern found in this series' own Valuation research (`alphaVantageService.js`'s silent fake-OHLC fallback).
- Caching: 12-hour TTL on success, 45-minute TTL on fallback — reasonable given macro data's genuinely slow-moving nature.
- **`macroEconomistMember.js` does not call `getMacroData()` at all.** It only reads `NEWS` and `COT` rows from the shared committee evidence matrix, and explicitly, honestly lists `rates`/`inflation`/`employment`/`bonds`/`dollar` as `UNCOVERED_MACRO_INPUTS: "not yet wired into the evidence matrix"` in every output.
- **CFTC Commitment of Traders (COT) data is real and live** (`altDataService.getCotData()`, confirmed live in an earlier session's audit) — covers futures positioning in `GOLD`, `SILVER`, `CRUDE OIL`, `NASDAQ MINI`, `US DOLLAR INDEX` (`cftcCotProvider.js`'s `DEFAULT_MARKETS`). This is **speculative futures positioning data, not spot price/return data** for oil/gold/USD — an important, real distinction for this research's Oil/Gold/USD topics.
- **No VIX data source exists anywhere** — confirmed via a direct code comment in `marketSentimentScorers.js`: *"never implied-vol/VIX — no such data source exists."*
- **"Yield curve" and "credit spread" exist today only as fixed scenario-headline strings** (`autonomousMarketService.js`'s `AUTONOMOUS_SCAN_UNIVERSE`: `"Yield curve steepening"`, `"Credit spread widening"`, `"Dollar liquidity squeeze"`) — synthetic scenario labels, **not** derived from any real computed yield-curve-spread or credit-spread calculation, consistent with this whole engagement's established finding that this catalog is a fixed set of scenario names, not distinct real data-source outputs.
- **No GDP series is fetched anywhere** (`getMacroData()`'s 5 series omit `GDP`/`GDPC1`).
- **No PCE series is fetched** — only CPI (`CPIAUCSL`). This is a real, important gap: the Federal Reserve's own official inflation target is **PCE**, not CPI.
- **No short-end Treasury yield is fetched** (e.g., 3-month or 2-year) — only the 10-year (`DGS10`). Without a second point, no real yield-curve-spread (10Y-3M or 10Y-2Y) can be computed today, even though the ingredient half-exists.

---

## 1. Federal Reserve

- **Required data:** FOMC meeting statements, the Summary of Economic Projections ("dot plot"), the effective federal funds rate, Fed officials' public speeches/testimony.
- **Reliability:** the single highest-authority source for US monetary policy — a primary-source regulatory/policy body, not a data vendor.
- **Reporting delay:** FOMC decisions are announced on a fixed, publicly known 8-meetings-per-year calendar (real, schedulable, not random) — effectively zero delay for the rate decision itself; dot-plot projections are published quarterly alongside 4 of the 8 meetings; meeting minutes are released with a fixed ~3-week lag.
- **False-positive risks:** unscheduled/off-cycle Fed communication (speeches, testimony) is real but far more prone to market overreaction/misinterpretation than a formal FOMC statement — should be weighted lower and never treated with the same confidence as a scheduled policy decision.
- **Scientific defensibility:** **Yes**, as a primary-source record of actual policy actions/statements — the risk is entirely in interpretation, not in the source's authority.

## 2. Interest rates

- **Required data:** the effective federal funds rate (already fetched live via `FEDFUNDS`), the full Treasury yield curve across multiple maturities, real (inflation-adjusted) rates.
- **Reliability:** high — rates are directly, unambiguously observable market/policy data.
- **Reporting delay:** near-real-time for market-traded Treasury yields; FEDFUNDS itself (the *effective* rate, a daily-computed market average, distinct from the *target* range the FOMC sets) updates daily with a short lag via FRED.
- **False-positive risks:** conflating the *target range* (an FOMC-announced band) with the *effective* rate (a market-realized daily average) — they are related but not identical, a real, easy-to-make error.
- **Scientific defensibility:** **Yes** — directly observable, unambiguous data.

## 3. Inflation (CPI/PCE)

- **Required data:** the Consumer Price Index (`CPIAUCSL`, already fetched) and the Personal Consumption Expenditures price index (`PCEPI`, **not currently fetched** — a real, disclosed gap).
- **Reliability:** high — both are official, primary-source government statistics (CPI from BLS, PCE from BEA).
- **Reporting delay:** CPI is published monthly, ~2 weeks after month-end; PCE is published monthly, ~4 weeks after month-end (later than CPI, since PCE derives partly from more comprehensive business-survey data BEA needs additional time to compile).
- **False-positive risks:** **using CPI alone as if it were the Fed's own target measure is a real, disclosed methodological gap in this codebase today** — the Fed's own stated 2% inflation target is explicitly a **PCE** target, not CPI; CPI and PCE can and do diverge (different market-basket weighting, different substitution-effect treatment) — a genuine "two similar-sounding metrics that are not interchangeable" risk, directly continuing this whole series' recurring naming-collision pattern (ETF volume-vs-flow, short interest official-vs-commercial).
- **Scientific defensibility:** **Yes**, for both metrics individually — the risk is entirely in only using one when the Fed itself targets the other.

## 4. Employment

- **Required data:** the unemployment rate (`UNRATE`, already fetched), nonfarm payrolls (change in jobs, not currently fetched), labor force participation rate.
- **Reliability:** high — official BLS statistics, among the most closely watched and rigorously constructed government data series that exist.
- **Reporting delay:** the BLS Employment Situation report (including both the unemployment rate and nonfarm payrolls) is published on a fixed, well-known schedule — the **first Friday of the following month** — a real, fast, predictable cadence relative to most other macro series in this research.
- **False-positive risks:** the unemployment rate alone can mask real trends (e.g., a falling unemployment rate driven by workers leaving the labor force rather than genuine hiring) — nonfarm payrolls and labor force participation should be read together, not the unemployment rate in isolation.
- **Scientific defensibility:** **Yes** — rigorous, primary-source government statistics with a long, well-understood revision history.

## 5. GDP

- **Required data:** real GDP growth rate (`GDPC1` or `GDP` FRED series) — **not currently fetched anywhere in this codebase**, a real, disclosed gap.
- **Reliability:** high in the long run, but GDP is published in **three successive estimates** (Advance, Second, Third) over the ~3 months following each quarter's end, each one a real, sometimes-material revision of the last — the single **slowest-updating and most heavily revised** signal in this whole research area.
- **Reporting delay:** the Advance estimate is published ~1 month after quarter-end; the Third/"final" estimate ~3 months after quarter-end — and even the "final" estimate is later subject to annual/comprehensive BEA revisions.
- **False-positive risks:** treating any single GDP print (especially the Advance estimate) as a stable, unrevisable fact — a real, disclosed risk given GDP's own multi-revision publication design.
- **Scientific defensibility:** **Yes**, as an official BEA statistic — but any GDP-based score must disclose which estimate vintage (Advance/Second/Third) it reflects, and that even the latest available vintage remains provisional.

## 6. Yield curve

- **Required data:** at minimum, one short-maturity Treasury yield (e.g., 3-month `DGS3MO` or 2-year `DGS2`) alongside the already-fetched 10-year (`DGS10`), to compute a real 10Y-3M or 10Y-2Y spread.
- **Reliability:** high — a well-established, decades-old, academically studied (real New York Fed recession-probability model built directly on the 10Y-3M spread) leading indicator.
- **Reporting delay:** near-real-time, market-traded data.
- **False-positive risks:** yield-curve inversion is a real, historically strong leading recession indicator, but **the exact timing between an inversion and any subsequent recession has varied widely across history (anywhere from several months to over two years)** — a real, honest, "real documented mechanism, timing not reliably predictable" caveat directly analogous to this series' own Short Squeeze and Momentum Ignition findings.
- **Scientific defensibility:** **Yes**, for the spread itself as a descriptive/leading-context statistic; **caution required** for any specific-timing recession-prediction framing.

## 7. Credit spreads

- **Required data:** a corporate-bond-yield-minus-Treasury-yield spread (e.g., FRED's `BAA10Y`, Moody's Baa-rated corporate bond yield relative to the 10-year Treasury) or a high-yield option-adjusted spread (ICE BofA indices, also on FRED).
- **Reliability:** high — a well-established financial-stress indicator; widening spreads reflect the market's own real-time pricing of default/credit risk.
- **Reporting delay:** near-daily, market-based data via FRED.
- **False-positive risks:** credit-spread widening can reflect genuine broad credit-market stress **or** a narrower, sector-specific event (e.g., one large issuer's distress skewing an index) — should be read alongside breadth/dispersion context, not as a single number in isolation.
- **Scientific defensibility:** **Yes** — this codebase currently computes **zero** credit-spread data (confirmed absent), a real, addressable gap this research recommends closing.

## 8. USD

- **Required data:** a broad USD index (e.g., FRED's `DTWEXBGS`, the Fed's own Broad Dollar Index) — not currently fetched.
- **Reliability:** high — a standard, well-established measure of dollar strength against a broad trading-partner currency basket.
- **Reporting delay:** near-daily.
- **False-positive risks:** the already-real CFTC COT `US DOLLAR INDEX` futures-positioning data (§0) is a genuine, useful **speculative-positioning** signal but is **not the same as the spot/index level itself** — conflating the two would repeat this series' recurring "positioning data mistaken for price data" pattern.
- **Scientific defensibility:** **Yes** for both the spot index and the COT positioning data, as long as they are clearly labeled as two different things.

## 9. Oil

- **Required data:** WTI crude spot/futures price (FRED's `DCOILWTICO`, or a live quote from an already-configured market-data vendor).
- **Reliability:** high — a liquid, continuously-traded global commodity.
- **Reporting delay:** near-real-time for futures/spot pricing; FRED's own daily WTI series has a short daily lag.
- **False-positive risks:** oil-price moves reflect a mix of genuine macro-demand signal and idiosyncratic supply-shock/geopolitical events — should not be read as a pure "risk-on/risk-off" macro gauge without disclosing this mixed causality.
- **Scientific defensibility:** **Yes**, as a directly observable price; the already-real CFTC COT `CRUDE OIL` positioning data (§0) is a useful supplementary speculative-positioning signal, again distinct from spot price.

## 10. Gold

- **Required data:** gold spot/futures price (FRED's `GOLDAMGBD228NLBM`, the LBMA gold price, or a live vendor quote).
- **Reliability:** high — a liquid, continuously-traded global commodity, traditionally read as a real-rates/USD-strength/risk-aversion proxy.
- **Reporting delay:** near-real-time for futures pricing.
- **False-positive risks:** gold is popularly framed as a simple "fear gauge," but its price is genuinely driven by a mix of real-interest-rate expectations, USD strength, and central-bank reserve-buying activity — a single-cause "fear" framing would be a real oversimplification.
- **Scientific defensibility:** **Yes**, as a directly observable price; the already-real CFTC COT `GOLD` positioning data (§0) is a useful supplementary signal.

## 11. VIX

- **Required data:** the CBOE Volatility Index (VIX) level and its term structure (VIX9D/VIX/VIX3M).
- **Reliability:** high — a well-established, widely-used, real-time market-implied-volatility gauge.
- **Reporting delay:** real-time during market hours.
- **False-positive risks:** VIX measures the market's *implied* near-term volatility expectation, not a forecast of actual realized future volatility or direction — a real, well-documented distinction (VIX is not itself directional).
- **Scientific defensibility:** **Yes**, for the index itself — **this codebase currently has zero VIX data source anywhere** (confirmed absent via direct code comment), a real, disclosed gap this research recommends closing (see §Data Strategy — a real market-data vendor, not FRED, is required, since VIX itself is CBOE-licensed real-time index data rather than a FRED-hosted government statistic).

## 12. Liquidity

- **Required data:** M2 money supply (`M2SL`, already fetched), the Fed's own balance sheet size (`WALCL`, not fetched), the Overnight Reverse Repo Facility usage (`RRPONTSYD`, not fetched), bank reserves.
- **Reliability:** high — all are official Fed/FRED-published series.
- **Reporting delay:** M2 is published monthly (~5-6 week lag); `WALCL` and `RRPONTSYD` are published **weekly**, materially faster than M2 — an important freshness distinction within this one topic.
- **False-positive risks:** `deriveMacroRegime()`'s current `liquidityTrend` is derived from `M2.change`'s raw sign alone (improving if positive, tightening if negative) — a real, disclosed oversimplification; Fed balance-sheet and reverse-repo trends are a faster-moving, more complete liquidity picture than M2 alone.
- **Scientific defensibility:** **Yes**, for each individual metric — the current single-input heuristic should be disclosed as a simplification, not treated as a complete liquidity assessment.

## 13. Monetary policy

- **Required data:** the federal funds rate/target range (already fetched), the Fed's own forward guidance language, the dot plot (§1).
- **Reliability:** high — directly observable policy actions and statements.
- **Reporting delay:** effectively real-time for the rate decision itself (fixed FOMC calendar); qualitative guidance/dot-plot changes are inherently harder to score numerically than a rate level.
- **False-positive risks:** treating a single Fed statement's tone as a fully quantified signal risks overstating precision — qualitative stance (hawkish/dovish) is a real, useful signal but is inherently softer/more interpretive than a hard rate number.
- **Scientific defensibility:** **Moderate-to-Strong** for the rate level itself; **Moderate** for any qualitative tone-scoring layered on top.

## 14. Economic cycle

- **Required data:** GDP growth trend (§5, not fetched), unemployment trend (`UNRATE`, already fetched), yield-curve spread (§6, only half-available), possibly a composite leading-indicator index.
- **Reliability:** the underlying components are individually reliable; a composite *cycle stage* classification (expansion/peak/contraction/trough) is inherently a modeled interpretation, not a directly observable fact.
- **Reporting delay:** inherits the slowest component's delay — since GDP is the slowest-updating input here (§5), any cycle classification that includes GDP inherits GDP's own multi-month, multiply-revised cadence.
- **False-positive risks:** `deriveMacroRegime()`'s current `recessionRisk` field is derived from just 2 inputs (unemployment level + fed-funds level) — a real, disclosed oversimplification of a genuinely multi-factor concept; formal recession dating (the NBER's own business-cycle-dating process) is itself a retrospective, multi-month-delayed committee judgment, not a real-time computable fact — any "economic cycle" score in this platform should be explicitly framed as **this platform's own probabilistic estimate**, never presented as if it were an official NBER recession call.
- **Scientific defensibility:** **Moderate** — the individual ingredients are each well-established, but the composite classification is an interpretive model, and must be disclosed as such.

---

## 15. Data source evaluation

| Source | Confirmed live this session? | What it actually provides | Real limitation |
|---|---|---|---|
| **FRED** | **Yes — extensively, both via existing code and a fresh fetch this session** | Confirmed real: this codebase already successfully calls FRED's public `fredgraph.csv` chart-export endpoint (undocumented but functional, no API key). Independently confirmed live this session that FRED **also** publishes a fully documented, officially supported REST API (`fred.stlouisfed.org/docs/api/fred/`, JSON responses, versions 1 and 2) requiring a **free** API key (`fred.stlouisfed.org/docs/api/api_key.html`) | The current integration uses the **undocumented CSV export URL**, not the officially supported, key-based API — works today, but is a real, disclosed technical-debt/reliability risk (an unofficial endpoint can change without notice); recommended migration path in the Data Strategy doc |
| **Federal Reserve** | Not independently re-fetched this session; grounded in well-established, stable, primary-source knowledge (FOMC's own public calendar/statements) | The authoritative policy source itself — statements, dot plot, meeting minutes, official calendar | Primary-source text/qualitative content, not itself a structured numeric API — best consumed via FRED's own hosted series (e.g., `FEDFUNDS`) or a dedicated calendar feed |
| **BLS** | Not independently re-fetched this session; grounded in well-established knowledge of the real, official Employment Situation/CPI release schedule | Official source for employment (nonfarm payrolls, unemployment rate) and CPI — most of this data is already re-published via FRED (`UNRATE`, `CPIAUCSL`), making direct BLS API integration mostly redundant given FRED already exists as this codebase's real integration | Direct BLS API access requires a separate registration; low incremental value given FRED already re-publishes the same series |
| **BEA** | Not independently re-fetched this session | Official source for GDP and PCE — again, both are also re-published via FRED (`GDP`/`GDPC1`, `PCEPI`), making direct BEA integration similarly low-incremental-value given the existing FRED relationship | Same redundancy-with-FRED consideration as BLS |
| **Treasury** | Not independently re-fetched this session | The U.S. Treasury's own daily Treasury par yield curve rates (treasury.gov) — again, the same yields are already re-published via FRED (`DGS10`, and the not-yet-fetched short-end series) | Same redundancy-with-FRED consideration; Treasury.gov is a reasonable direct/backup source but FRED is almost certainly the simpler single integration point given it already covers Fed, BLS, BEA, and Treasury series through one interface |
| **CME** | Partially confirmed live this session (redirect to a real, working QuikStrike-hosted embedded tool page, consistent with CME FedWatch being a real, live, widely-used product) | The CME FedWatch Tool — a well-known, real, free tool deriving market-implied probabilities of future Fed rate decisions from 30-Day Fed Funds futures pricing — a genuinely different, forward-looking signal not covered by any of FRED's backward-looking series | Not independently re-verified beyond the redirect this session; the tool itself is web-embedded (QuikStrike), not obviously a simple developer-friendly REST API — needs direct confirmation of any raw-data/API access path before procurement |
| **Finnhub** | The general vendor relationship is confirmed real (`finnhubService.js`, already reused across Valuation/Insider/Institutional/ETF-Flow research); the specific economic-calendar/macro-indicator endpoint coverage was not independently re-verified live this session | Finnhub's own real, documented `/calendar/economic` and general economic-indicator products likely cover much of this domain (Fed decisions, CPI/NFP release dates and figures) as a possible single-vendor alternative to direct-government-source integration | Needs direct reconfirmation of exact coverage/accuracy before relying on it in place of FRED's already-proven-live integration |
| **Other reliable providers** | Based on general domain knowledge | A real-time market-data vendor (e.g., this platform's already-evaluated Databento/Massive from the Options/Algorithmic-Activity research) would be required for VIX/oil/gold real-time pricing, since these are not FRED-hosted government statistics | Not independently re-verified this session; cross-reference the already-completed Options Data research's vendor evaluation before procurement |

---

## 16. Summary of concrete, evidence-grounded findings driving this research's design

1. **A real, live, working macro data pipeline already exists** (`altDataService.getMacroData()`), but is **not consumed by the one committee member whose job is macro** — the single most actionable, concrete finding of this whole phase.
2. The existing FRED integration uses an **undocumented CSV endpoint**, not FRED's own officially documented, key-based REST API — functional today, but a disclosed technical-debt risk.
3. **CPI is fetched, PCE is not** — a real, disclosed gap given the Fed's own inflation target is explicitly PCE-based.
4. **No GDP series is fetched anywhere** — the single slowest-cadence, most-revised data type in this whole domain, and currently entirely absent.
5. **No VIX data source exists anywhere** in this codebase (confirmed via an existing code comment) — a real market-data vendor, not FRED, is required to close this gap.
6. **"Yield curve" and "credit spread" exist today only as fixed scenario-headline strings**, not real computed data — the raw yield-curve ingredient half-exists (10-year yield only; no short-end yield fetched), and credit spreads have zero existing computation.
7. **Real, live CFTC COT futures-positioning data already covers Gold/Silver/Crude Oil/US Dollar Index** — a genuine, reusable signal, but must never be confused with spot/index price data for the same assets.
8. Macro is, like this series' own recently-researched Sentiment Agent, a naturally **market-wide (not per-symbol)** signal — the existing architecture's design (a shared evidence-matrix row, a symbol-agnostic `getMacroData()` call) is already structurally appropriate for this, and should be preserved rather than redesigned into a false per-symbol shape.
