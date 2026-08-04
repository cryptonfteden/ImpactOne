# Options Provider Comparison Matrix

**Phase:** OPTIONS-DATA-RESEARCH-001. Companion to `OPTIONS_DATA_RESEARCH.md` (full narrative reasoning) and `OPTIONS_SCORING_MODEL.md` (how ingested data should be scored/cached regardless of vendor chosen). Pure research — no code written. Two facts below (marked ✅ **live-verified**) were independently re-confirmed against the vendors' own current public pages during this research; all other figures are drawn from general market/domain knowledge and are marked accordingly — **re-confirm directly with vendor sales before procurement**, consistent with this codebase's own "never present an unverified number as fact" discipline.

---

## 1. Master comparison table

| Provider | Real-time trade prints | Delayed/EOD chain | Historical depth | Rate limit model | Coverage | Reliability signal | Entry cost | Verification |
|---|---|---|---|---|---|---|---|---|
| **Databento** | Yes (OPRA is a named dataset) | Yes | 16+ yrs L0 all plans; 1yr L1/1mo L2-L3 on Standard | Usage-based ($/GB or $/msg), not a hard call-count cap | US equities, equity options, options-on-futures, index options via CBOE/CFE | Public status/dedicated-connectivity messaging; self-service billing/usage dashboard | **$199/mo (Standard)** | ✅ live-verified |
| **Massive.com (formerly Polygon.io)** | Options product exists as separate line item from Stocks | Yes (their Stocks tiers confirm 15-min delayed at low tiers) | Stocks: 2/5/10/20+ yrs by tier (confirmed); Options depth not independently confirmed | Confirmed tiered: free tier "5 calls/min," paid tiers "Unlimited" | US equities + options + indices + currencies + futures | Public system-status page (`massive.com/system`) | Stocks tiers confirmed $0/$29/$79/$199/mo; options add-on priced separately, not independently confirmed | ✅ rebrand + stocks pricing live-verified; options-specific pricing not verified |
| **Tradier** | Yes, via brokerage-grade Market Data API (real-time/delayed/historical + streaming) | Yes | Not independently confirmed this session | Streaming avoids poll-rate concerns; REST limits documented but not re-verified | US equities + options; full brokerage/trading API alongside data | Public status page (`status.tradier.com`) | Historically bundled with brokerage account tiers, not sold as data-only | ✅ product description live-verified; pricing not independently re-verified |
| **CBOE DataShop / LiveVol** | Yes (CBOE is a primary listing exchange, not just a redistributor) | Yes | Very deep (over a decade of LiveVol historical archives, longstanding industry knowledge) | Enterprise contract, not self-service | Strongest specifically for CBOE-listed index products (SPX/VIX) plus broad OPRA redistribution | Enterprise SLA (custom) | Custom quote, typically higher entry cost | Domain knowledge, not independently re-verified this session (page fetch failed to resolve during this research) |
| **dxFeed** | Yes, real-time OPRA-based | Yes | Deep historical archive as a separate product | Enterprise contract | Broad; well known for powering broker-embedded options-flow tools | Enterprise SLA (custom) | Custom quote | Domain knowledge, not independently re-verified this session |
| **Intrinio** | Yes, named options product line | Yes | Multi-year | Tiered, self-service | US equities + options | Developer-friendly public docs | Low-to-medium tiered, not independently re-verified this session | Domain knowledge, not independently re-verified this session |
| **Unusual Whales / Cheddar Flow / FlowAlgo / Market Chameleon (retail "unusual activity" vendors)** | Indirectly — sell **already-detected** sweep/block/dark-pool signals, not raw OPRA prints | Varies | Typically shallow (recent months–~2 yrs) | Consumer-app oriented, not built for high-frequency programmatic polling | Broad for liquid/popular names; thinner for illiquid names | Generally weaker public SLA transparency than infrastructure vendors | Consumer-tier monthly pricing, low-to-medium | Domain knowledge, not independently re-verified this session — treat as approximate |
| **CBOE public delayed quotes / Yahoo Finance unofficial chain / IEX Cloud** | No | Free, but not a real API/no SLA (CBOE/Yahoo); **IEX Cloud is confirmed permanently shut down (Aug 2024)** | N/A | N/A | Chain-snapshot only | None (unofficial/scrape or defunct) | $0 | IEX Cloud shutdown is well-established public knowledge |

---

## 2. Scoring against this platform's specific requirements

Each row scored 1 (poor fit) – 5 (excellent fit) against the 5 detectors this engine actually needs (`OPTIONS_AGENT_ARCHITECTURE.md` §5), plus cost-transparency and philosophical fit with this platform's "build explainable detection, never resell a black-box verdict" principle (§4 of `OPTIONS_DATA_RESEARCH.md`).

| Provider | Volume/baseline (§5a) | Skew (§5b) | Sweep (§5c) | Block (§5d) | OI (§5e) | Cost transparency | Explainability fit |
|---|---|---|---|---|---|---|---|
| Databento | 5 | 5 | 5 | 5 | 5 | 5 (fully self-service published) | 5 (raw data, this platform builds its own detection) |
| Massive.com (Polygon) | 5 | 5 | 4 (real-time trade prints exist per product line, exact latency/exchange-ID granularity not independently confirmed) | 4 | 5 | 4 (Stocks tiers published; Options tier needs direct confirmation) | 5 (raw data) |
| Tradier | 4 | 4 | 3 (real-time exists, but sweep detection's cross-exchange/tight-window requirements not independently confirmed for their specific feed) | 3 | 4 | 3 (bundled with brokerage account, not a clean data-only quote) | 5 (raw data) |
| CBOE DataShop/LiveVol | 5 | 5 | 5 (CBOE is a primary exchange, strong for exactly this) | 5 | 5 | 2 (custom quote only) | 5 (raw data) |
| dxFeed | 4 | 4 | 5 | 5 | 4 | 2 (custom quote only) | 5 (raw data) |
| Intrinio | 4 | 4 | 3 (unconfirmed trade-level granularity) | 3 | 4 | 4 | 5 (raw data) |
| Retail unusual-activity vendors | 2 (baseline/history usually not exposed) | 2 | 4 (they specialize in exactly this, but as a finished signal) | 4 | 1 (OI reasoning usually hidden inside their own black-box scoring) | 4 (consumer-tier published pricing) | **1 (directly conflicts with this platform's explainability principle — buys a verdict, not evidence)** |
| Free/delayed-only sources | 3 (usable for baseline/OI only) | 3 | 1 (structurally incapable) | 1 | 3 | 5 (free) | 5 (raw, just too coarse for 3 of 5 detectors) |

---

## 3. Recommended path (cross-referenced from `OPTIONS_DATA_RESEARCH.md` §10)

| Stage | Provider | Monthly cost (approx.) | Trigger to move to next stage |
|---|---|---|---|
| MVP / prototype | Databento Standard | $199 (confirmed live) | Once real beta users would see options-derived evidence, or once external redistribution is needed |
| Production | Databento Plus (or a confirmed equivalent Massive.com options tier, quoted side-by-side) | ~$1,750 + license fees (confirmed live for Databento) | Once scale/compliance requirements exceed a self-service SaaS vendor's standard terms |
| Enterprise | CBOE DataShop, dxFeed, or Databento Unlimited | $4,500+/mo (Databento, confirmed live) or custom quote (CBOE/dxFeed) | Only once genuinely warranted by volume/compliance — explicitly not a default starting point |

**Not recommended as the primary source at any stage:** retail "unusual options activity" vendors, for the explainability/philosophical-fit reason scored above — may be considered later, explicitly labeled, as an independent cross-check signal only, never as the source of record.
