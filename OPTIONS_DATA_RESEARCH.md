# Options Data Research — Provider Landscape & Sourcing Strategy

**Phase:** OPTIONS-DATA-RESEARCH-001. Pure research — no production code was written. Grounds every recommendation in this repository's real, already-built Unusual Options Agent architecture (`OPTIONS_AGENT_ARCHITECTURE.md`, `OPTIONS_AGENT_DATA_MODEL.md`, and the real, tested backend services in `backend/services/optionsAgent/`) plus the existing, honestly-stubbed provider boundary (`backend/services/providers/definitions/optionsFlowProvider.js`, gated on `OPTIONS_FLOW_PROVIDER_API_KEY`, currently unconfigured). This document exists to decide **what real vendor eventually goes behind that stub** — it does not propose a second, parallel ingestion path.

**A note on pricing accuracy:** vendor pricing/plan names change frequently and several figures below (particularly for retail-facing "unusual options activity" services) are from general market knowledge rather than a freshly re-verified quote, since that class of vendor doesn't publish a stable, scrapable pricing page the way infrastructure-grade data vendors do. Two provider facts below **were independently re-verified live** during this research (Databento's current published plan pricing/coverage, and the fact that **Polygon.io has rebranded to Massive.com**, `polygon.io/pricing` now redirects there) — everything else should be re-confirmed directly with the vendor's sales team before any procurement decision, consistent with this codebase's own "never present unverified numbers as fact" discipline (`altDataService.js`'s `fallback` labeling, `scoringVocabulary.js`'s disclosed-estimate convention).

---

## 1. What "options flow data" actually requires

Per `OPTIONS_AGENT_ARCHITECTURE.md` §3/§5, the 5 detectors this engine needs (volume-vs-baseline, call/put skew, sweep detection, block trades, open-interest analysis) require, at minimum:

- **Options chain / quotes**: strike, expiry, bid/ask, last, implied volatility, Greeks, per contract — needed for baseline classification (ATM/OTM, notional value).
- **Trade prints**: contract, size, price, exchange ID, timestamp, bid/ask *at the moment of execution* — required specifically for sweep detection (§5c), since aggressor-side and cross-exchange clustering cannot be inferred from OHLC/aggregate bars.
- **Open interest (OI)**: per-contract, end-of-day — required for §5e's new-position-vs-closing disambiguation. OI is fundamentally a T+1 (next-session) fact everywhere; no vendor, free or paid, publishes same-day OI, because the OCC (Options Clearing Corporation) itself only settles/publishes it once per session.
- **Underlying quote/price**: already real and live in this codebase via Finnhub (`altDataService.js`) — no new sourcing needed for this piece.

All U.S.-listed options trade data ultimately originates from **OPRA (Options Price Reporting Authority)** — the consolidated tape for every U.S. options exchange (Cboe, Nasdaq, NYSE American/Arca, MIAX, BOX, etc.). Every vendor below is, at some level, a redistributor of OPRA (or a subset of exchange-direct feeds) with different degrees of raw-vs-processed data, latency, and licensing terms layered on top. There is no way to get real trade-level options data (sweeps, block prints) without eventually paying OPRA redistribution/licensing fees, either directly or bundled into a vendor's own subscription — this is the single most important cost driver in this whole research.

---

## 2. Best free providers

**Bottom line: there is no free, no-auth source for trade-level options flow (prints, sweeps, blocks) — confirms and extends the honest conclusion already reached in `SOURCE_INTELLIGENCE_CRITIC_REPORT.md` and `optionsFlowProvider.js`'s own header comment.** Free tiers exist only for **options chain snapshots** (current bid/ask/IV/Greeks/OI-as-of-last-session), not trade prints.

| Provider | What's actually free | Real limitations |
|---|---|---|
| **CBOE delayed quotes (cboe.com)** | Public, no-auth delayed options chain (15-min delayed) for browsing | Not an API — HTML/scrape only, no programmatic SLA, unsuitable for an automated pipeline, and against most exchanges' terms of service to scrape at scale |
| **Yahoo Finance options chain (unofficial)** | Options chain (strike/bid/ask/IV/OI as of last close) via unofficial/community libraries | Not an official API, no SLA, has been shut down/rate-limited/changed shape without notice multiple times historically — not viable for a production financial product that already has a "never depend on an undocumented scrape" discipline (this codebase's own `providerFactory.js` pattern requires a real, documented contract) |
| **Massive.com (formerly Polygon.io) free tier** | A genuine free-tier options endpoint exists (options chain snapshot, reference data) | Confirmed via this research: Massive's real free tier for **stocks** is "5 API calls/minute, end-of-day data only, 2 years history" — the options product (`massive.com/options`) is a separately-priced add-on with the same shape of restriction; free tier is unsuitable for anything beyond prototyping against delayed/EOD data |
| **IEX Cloud** | Historically had a free options-adjacent tier | **IEX Cloud shut down entirely in August 2024** — no longer usable, must not be assumed available; flagging explicitly since this repo's own `altDataService.js`/`providerRegistry.js` don't currently reference it, so no cleanup needed, but it should not be considered as an option in any future research |
| **CBOE DataShop sample files** | CBOE publishes limited free sample historical files for evaluation | Sample-only, not a live feed, useful only for offline backtesting/algorithm validation before a paid contract |

**Recommendation for this repo's MVP bootstrap window:** use a free/delayed **options chain snapshot** (not flow) purely to seed OI baselines and validate the normalizer/detector pipeline end-to-end against real (if delayed) shapes, while the real trade-print vendor decision (§4) is being made — this mirrors the exact "honest bootstrap, no fabrication" pattern `optionsAnomalyConfidence.js` already implements for the volume-baseline detector.

---

## 3. Delayed providers

"Delayed" (typically 15-minute) options data relaxes exchange real-time-distribution licensing requirements and is meaningfully cheaper — often free or low-cost — but is **structurally unsuitable for sweep detection** (§5c requires sub-2-second cross-exchange clustering, impossible on a 15-minute-delayed feed) and only partially suitable for block-trade/volume-baseline detection (usable for a daily/EOD cadence, not intraday alerting).

| Provider | Delay | Real use case for this engine | Cost class |
|---|---|---|---|
| Massive.com (Polygon) Options Starter/Developer tiers | 15-min delayed (their stocks-tier convention; options-tier delay should be confirmed directly) | Chain snapshots + EOD aggregates for baseline-building and OI reconciliation | Low ($29-$79/mo range based on their confirmed stocks-tier pricing structure) |
| Tradier Market Data (delayed mode) | 15-min delayed, confirmed real (their own docs state "real-time, delayed, and historical market data" as one of 3 explicit data modes) | Same as above; Tradier is unusual in that it's a full brokerage API, so delayed data is effectively free with a funded/sandbox account | Low-to-free (bundled with a brokerage account, no separate options-data-only plan) |
| CBOE delayed data products | 15-min delayed | Chain-level, EOD/near-EOD analytics | Low-Medium |

**Recommendation:** delayed feeds are a legitimate, cheap way to build and validate the **volume-vs-baseline** and **OI-analysis** detectors (§5a, §5e) — both are inherently daily/EOD-cadence anyway — but must never be the source for sweep/block detection, which requires real-time trade-level data regardless of budget tier. This is a real architectural fork, not just a cost tradeoff: **delayed data can honestly power 2 of the 5 detectors, never the other 3.**

---

## 4. Professional (real-time, trade-level) providers

This is the tier that can actually power sweep/block detection (§5c/§5d). All require a paid contract; costs and terms vary enormously by how much OPRA licensing is bundled versus billed separately.

| Provider | Real-time trade prints? | Historical depth | Notable terms | Approx. cost class |
|---|---|---|---|---|
| **Databento** | Yes — real, confirmed live: OPRA is a named, first-class dataset in their coverage list, alongside CME/Eurex/ICE options-on-futures | Confirmed live: **16+ years of L0 (top-of-book) history on all plans**; L1/L2/L3 depth-of-history varies by plan | Confirmed live: **Standard plan = $199/month** (includes live data, no separate exchange license fee at this tier); **Plus = $1,750/month + license fees** (external redistribution allowed, enhanced live data); **Unlimited = $4,500/month + license fees** (full history in all schemas); usage-based historical-only pricing also available (pay-as-you-go by GB) | Low entry ($199/mo) scaling to enterprise ($1,750-$4,500+/mo) — the only vendor in this research with fully transparent, self-service published pricing at every tier |
| **Massive.com (formerly Polygon.io)** | Options product exists (`massive.com/options`) as a distinct line item from Stocks | Their confirmed stocks-tier pattern is 2/5/10/20+ years by plan tier; options tier depth should be confirmed directly, but the same tiering convention is very likely to apply | Confirmed real rebrand: **the company operating as "Polygon.io" now operates as "Massive.com"** — `polygon.io/pricing` redirects there live as of this research. Any future reference to "Polygon" in this codebase's docs/env-var names should be understood as the same company/API, now under the Massive brand. | Likely similar-to-Databento entry pricing based on their confirmed Stocks-tier structure ($0/$29/$79/$199 tiers), options add-on priced separately |
| **Tradier** | Yes, via their brokerage-grade Market Data API, confirmed live: explicitly documents "real-time, delayed, and historical market data" plus streaming (HTTP + WebSockets) | Historical options data available; exact depth not independently confirmed this session | Distinctive: Tradier is a **licensed broker-dealer**, so its market-data API is bundled with (and arguably secondary to) its trading API — attractive if this platform ever wants a real order-routing story, unusual if pure data is the only goal | Data-only pricing historically bundled with account tiers rather than sold standalone — needs direct confirmation |
| **CBOE DataShop / LiveVol** | Yes — CBOE is itself the primary exchange operator for a large share of U.S. options volume, and DataShop is their direct historical+real-time distribution arm | Very deep (CBOE has offered LiveVol historical options data covering well over a decade) | Enterprise-grade licensing, typically requires a sales conversation, not self-service | Medium-to-high, typically requires a custom quote |
| **Intrinio** | Options data available as a named product line | Multi-year historical | Self-service developer-friendly docs, individual API-key model similar to Massive/Databento | Low-to-medium, tiered |
| **dxFeed** | Yes, real-time OPRA-based feed, widely used by professional/retail-broker platforms (e.g. powers several brokers' own options-flow tools) | Deep historical archives available as a separate product | Enterprise-oriented, typically requires a sales conversation | Medium-to-high |
| **"Unusual options activity" retail vendors** (Unusual Whales, Cheddar Flow, FlowAlgo, Market Chameleon, BlackBoxStocks) | Yes, in the specific sense of **already-detected** sweeps/blocks/dark-pool-prints — several of these vendors do their **own** detection and sell the *output* (a "signal," not raw prints) | Typically shallower/less standardized historical export than infrastructure vendors above | **Important architectural distinction**: these vendors sell a pre-computed signal, not raw OPRA-derived prints — using one of them would mean this codebase's own 5 detectors (§5 of the architecture doc) become largely redundant, since the vendor has already done the sweep/block classification. This is a real fork in strategy (build detection in-house on raw data vs. buy a vendor's already-detected signal) that should be an explicit decision, not a default | Low-to-medium for retail-tier subscriptions (typically consumer-priced, monthly, no enterprise API self-service in most cases) — **not independently re-verified this session**, treat as approximate |

**Key strategic fork surfaced by this research, not previously named in `OPTIONS_AGENT_ARCHITECTURE.md`:** the architecture document assumes this engine performs its **own** sweep/block/skew detection over raw trade prints (§5 of that doc). An entirely different, materially cheaper path exists: license a retail-tier "unusual options activity" vendor's **already-computed signals** and skip building/maintaining detectors 5c/5d in-house entirely, at the cost of losing control over methodology, explainability (this platform's whole differentiation thesis per `IMPACTONE_DIFFERENTIATION_REPORT.md`), and the ability to apply this platform's own confidence/governance model to a black-box third-party signal. Given this platform's explicitly stated architectural principle (`canonicalVerdict.js`'s "never re-emit a black-box verdict as if it were reasoned" discipline, and the Phase E3.5 Finnhub-relabeling precedent), **building detection over licensed raw data (Databento/Massive/dxFeed tier) is the philosophically consistent choice** — a black-box vendor "signal" would repeat the exact anti-pattern this platform has already had to correct once (Wall Street Analyst Consensus mislabeling). This should be a deliberate, disclosed decision if a retail vendor is ever chosen instead, not a silent shortcut.

---

## 5. API costs summary (approximate, by tier)

| Tier | Monthly cost range | What it buys |
|---|---|---|
| Free/delayed | $0 | Chain snapshots, 15-min delayed, EOD-only — enough for baseline/OI detectors, never sweep/block |
| MVP/entry real-time | ~$199/mo (Databento Standard, confirmed live) | Real-time OPRA trade prints + 16+ years L0 history — enough to build and validate all 5 detectors against real data at low volume/single-team scale |
| Growth/production | ~$1,750/mo + license fees (Databento Plus, confirmed live) or equivalent Massive/dxFeed/Intrinio production tier | External redistribution rights (needed once this data reaches real paying users, not just internal dev), enhanced live data, dedicated support |
| Enterprise | ~$4,500+/mo + license fees (Databento Unlimited, confirmed live), or a custom CBOE DataShop/dxFeed enterprise contract | Full historical depth in every schema, dedicated connectivity, account management — appropriate once volume/reliability/compliance requirements exceed what a self-service plan guarantees |

**Important cost caveat specific to real-time options data**: OPRA itself levies **per-user/per-device exchange redistribution fees** on top of most vendors' own subscription price once real-time data is shown to more than one internal, non-professional user (the same "professional vs non-professional" distinction Massive.com's own pricing page explicitly flags for equities, and which options data inherits from the same OPRA/exchange framework) — this is a real, easy-to-miss cost that scales with **user count**, not just data volume, and must be confirmed with any chosen vendor before this data is ever shown to real ImpactOne beta users (who are non-professional retail investors, which is favorable, but still requires the vendor to confirm the correct license class).

---

## 6. Reliability

- **Databento**: publishes a real, live status/uptime story as part of its enterprise positioning (dedicated connectivity, PCAP-level raw capture) — the most operationally transparent of the vendors reviewed, consistent with its confirmed self-service, engineer-facing pricing model.
- **Tradier**: publishes a real, public status page (`status.tradier.com`, confirmed live) — meaningful because it's independently checkable, matching this codebase's own existing `providerHealthService.js` philosophy of tracking real uptime rather than assuming it.
- **Massive.com (Polygon)**: publishes a public system-status page (`massive.com/system`, confirmed live in the footer navigation).
- **CBOE DataShop/dxFeed**: enterprise-grade SLA agreements are typical but not self-service-published; reliability terms would need to be a contract negotiation point.
- **Retail "unusual activity" vendors**: reliability/SLA transparency is generally weaker and not independently verifiable via a public status page in most cases — a real, additional risk specific to that vendor class, on top of the black-box-methodology risk already named in §4.

**Recommendation:** whichever vendor is chosen, this platform's own existing `providerHealthService.js` (per-provider `lastRunAt`/`lastStatus`/`successRate` tracking, already real and working for the other 15 registered providers) should track the options vendor identically from day one — do not special-case it, and do not conflate "the vendor's fetch succeeded" with "the vendor returned real, non-empty data" (the same "false success" pattern already flagged in this repo's own memory history for the existing 14 honest-stub providers, where 100% uptime coexisted with 0% real data).

---

## 7. Rate limits

| Provider | Rate limit character |
|---|---|
| Massive.com (Polygon) free tier | Confirmed live: explicitly capped (their Stocks Basic free tier states "5 API Calls / Minute") — paid tiers state "Unlimited API Calls" |
| Databento | Usage-based (pay per GB/message) rather than a hard requests-per-minute ceiling — a materially different cost model than a call-count limit, relevant to this platform's own `agentScheduler`/`providerIngestionService` rate-limiting design, since "rate limit" here really means "cost per unit ingested," not a 429-style throttle |
| Tradier | Real-time streaming (WebSockets) avoids polling-rate-limit concerns entirely for live data; REST endpoints have documented per-minute limits (exact figures not independently re-verified this session, should be confirmed directly) |
| Retail unusual-activity vendors | Typically consumer-app-oriented, not built for high-frequency programmatic polling — a real constraint if this engine intends sub-minute ingestion cadence |

**Architectural implication for this repo:** `providerIngestionService.js` already has a real, working per-provider scheduling/rate-limit pattern (per `OPTIONS_AGENT_ARCHITECTURE.md` §9's own citation) — the options vendor should be onboarded through that same mechanism rather than a bespoke poller, and the specific rate-limit shape (usage-based vs. per-minute-cap) should determine whether ingestion is a tight polling loop (Databento-style usage billing tolerates this) or a carefully-budgeted one (a hard per-minute cap does not).

---

## 8. Coverage

- **U.S. equity/ETF options (OPRA-covered)**: every professional-tier vendor reviewed (Databento, Massive, Tradier, CBOE, dxFeed, Intrinio) covers this — it is the baseline product for all of them.
- **Index options** (SPX, VIX, etc.): covered by CBOE directly (as the primary listing exchange) and by every OPRA-redistributing vendor; confirm explicitly since some retail vendors focus only on the most liquid equity names and may have thinner index-options coverage.
- **Options on futures** (e.g. CME/Eurex): only relevant if this platform ever expands beyond equities; Databento explicitly covers this today (confirmed live: "options on futures" is a named top-level product category) — worth knowing this optionality exists even though out of scope for ImpactOne's current equity-only universe.
- **Small-cap/illiquid-underlying options**: every vendor nominally covers "the full OPRA tape," but real practical data quality (print frequency, quote depth) will be thin for genuinely illiquid names regardless of vendor — this is a data-availability fact, not a vendor-selection problem, and reinforces §5a's bootstrap-honesty requirement (a detector must report insufficient baseline history for thin names, never fabricate a Z-score from too little data).

---

## 9. Historical availability

| Provider | Confirmed historical depth |
|---|---|
| Databento | Confirmed live: **16+ years of L0 (top-of-book) history**, with L1/L2/L3 depth varying by plan (1 year of L1 on the Standard $199/mo plan; deeper depth requires Plus/Unlimited) |
| Massive.com (Polygon) | Confirmed live for their Stocks product line (2/5/10/20+ years across tiers); the options-specific depth should be confirmed directly but is very likely to follow a similar tiered pattern |
| CBOE DataShop | Historically offers over a decade of LiveVol historical options data — the deepest, most authoritative historical archive of the vendors reviewed, since CBOE is itself a primary exchange, not just a redistributor |
| Tradier | Historical options data available; exact depth not independently confirmed this session |
| Retail unusual-activity vendors | Typically much shallower (often just recent months to ~1-2 years), since these products are built for live alerting, not backtesting infrastructure |

**Relevance to this repo:** deep historical trade-level data is valuable specifically for **bootstrapping the volume-vs-baseline detector's history requirement on day one** (§5a of the architecture doc) instead of waiting weeks for the engine to accumulate its own baseline live — a vendor with several years of historical trade prints available for backfill (Databento, CBOE DataShop) can eliminate or drastically shorten the disclosed "insufficient baseline history" bootstrap window, a genuine, previously-unconsidered product benefit worth weighing against the higher cost of the deeper-history tiers.

---

## 10. Recommendations

### MVP provider: **Databento (Standard plan, ~$199/month)**

Reasoning: the only vendor in this research with fully transparent, self-service, immediately-actionable published pricing; includes real-time OPRA trade prints (enables all 5 detectors, unlike any free/delayed option); 16+ years of top-of-book history available for bootstrap backfill even at the entry tier; usage-based historical-only pricing is also available for a cheaper pure-backtesting spike before committing to the monthly plan. Directly satisfies `optionsFlowProvider.js`'s already-defined `isConfigured()` contract (an API key) with no code changes beyond setting `OPTIONS_FLOW_PROVIDER_API_KEY` and implementing the two already-named, already-contract-shaped `fetchTradePrints()`/`fetchOpenInterestSnapshots()` functions.

### Production provider: **Databento (Plus tier, ~$1,750/month + license fees) or Massive.com's equivalent production options tier**

Reasoning: the Standard tier's terms should be re-confirmed for external-redistribution rights before this data (or signals derived from it) is shown to real paying/beta users beyond internal development — Databento's own tier structure explicitly gates "external distribution" behind the Plus tier, and per §5's OPRA per-user licensing note, this is exactly the kind of term that must be right before real users see the data. Massive.com's confirmed real-time equities tiering pattern (their $199/mo "Advanced" tier unlocks real-time + full history) suggests a comparably-priced options tier likely exists there too, worth a side-by-side quote before committing.

### Enterprise provider: **CBOE DataShop / dxFeed, or Databento Unlimited**

Reasoning: once this platform's scale/compliance requirements exceed what a self-service SaaS vendor's standard terms cover (dedicated connectivity, custom SLAs, the deepest possible historical depth across every schema), a direct exchange-operator relationship (CBOE, the primary source for a large share of listed options volume) or a dedicated-infrastructure vendor (dxFeed) becomes the appropriate tier — this is explicitly a "when you've outgrown self-service," not a "start here," recommendation.

### Explicitly NOT recommended as the primary data source

Retail "unusual options activity" vendors (Unusual Whales, Cheddar Flow, FlowAlgo, etc.) as a **replacement** for raw trade-level data — per §4's strategic-fork finding, using one would mean buying a black-box third-party verdict rather than building this platform's own explainable, governed detection, directly contradicting this platform's own established anti-pattern discipline (Phase E3.5's Finnhub-relabeling precedent, `canonicalVerdict.js`'s denylist). They may be worth a future, explicitly-labeled **cross-check/validation** role (comparing this engine's own detected signals against an independent vendor's published ones, purely as a quality-assurance signal) but should not be the source of record.
