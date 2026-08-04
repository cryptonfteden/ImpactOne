# Short Interest Intelligence — Data Strategy

**Phase:** SHORT-INTEREST-RESEARCH-001. Companion to [SHORT_INTEREST_RESEARCH.md](SHORT_INTEREST_RESEARCH.md) and [SHORT_INTEREST_SCORING_MODEL.md](SHORT_INTEREST_SCORING_MODEL.md). Pure research — staged vendor recommendations only, no procurement or code has occurred.

---

## MVP

- **Primary:** FINRA's own official short-interest data — **free**, and the only source needed to compute the **Short Interest Score** (§1 of the scoring model) at all, since it is direct regulatory ground truth. Reconfirm the exact current settlement/publication schedule directly against FINRA's own catalog before implementation (this session's own fetch attempt hit a content-extraction error rather than a clean failure — inconclusive, not confirmed-absent).
- **Secondary (if Finnhub coverage reconfirms sufficient):** reuse this platform's already-configured `finnhubService.js` relationship if it exposes an official-cadence short-interest data point — the cheapest possible path to a working Short Interest Score, consistent with this whole series' repeated MVP recommendation to exhaust an already-paid-for vendor relationship first (Valuation's `/stock/metric`, Insider's `/stock/insider-transactions`, Institutional's institutional-ownership product, ETF Flow's ETF profile/holdings product) — **not independently re-verified live this session for short-interest coverage specifically; must be reconfirmed before relying on it.**
- **What MVP cannot deliver:** the Borrow Stress Score, Squeeze Score, and Crowdedness Score all require commercial securities-lending-market data (borrow fee, utilization) that neither FINRA nor (most likely) Finnhub's basic tier provides — these three scores should honestly report `UNAVAILABLE` at MVP stage, exactly following the `institutionalSpecialistMember.js` precedent for an honestly-disclosed missing-data condition rather than a fabricated or approximated substitute.

## Production

- **Primary recommendation: ORTEX**, on the strength of this session's own extensive live verification (`SHORT_INTEREST_RESEARCH.md` §11) — a real, documented REST API (`api.ortex.com/v1/short-interest/{ticker}`), confirmed live pricing tiers:
  - **ORTEX Basic ($49/mo, or $39/mo billed annually):** "delayed short interest, cost to borrow & days to cover" — sufficient to unlock the Borrow Stress Score and Crowdedness Score's proxy inputs, but only at Tier A/official-adjacent freshness (`SHORT_INTEREST_SCORING_MODEL.md` §6), since "delayed" is explicitly named in ORTEX's own plan description.
  - **ORTEX Advanced ($149/mo, or $99/mo billed annually):** "real-time short interest & cost to borrow," with API access included — required to unlock Tier B (near-real-time, model-estimated) freshness for the Borrow Stress Score and the fast-moving inputs to the Squeeze Score.
  - This two-tier pricing structure is itself a real, useful, independent confirmation of this research's own two-tier Freshness Model design (§6 of the scoring model) — ORTEX's own product segmentation directly mirrors the "delayed vs. real-time" distinction this research proposes formalizing internally.
- **Alternative/supplementary: S3 Partners** — a real, well-established, more institutional/enterprise-oriented securities-finance analytics firm; likely a stronger fit if/when this platform reaches an Enterprise-tier need for deeper, more comprehensive lending-market coverage or direct desk-level support — **pricing and exact product terms not independently re-verified live this session; reconfirm directly before any procurement decision, especially given its more enterprise-facing positioning relative to ORTEX's more directly self-serve platform.**
- **Recommended staging:** start with ORTEX Basic to validate the Borrow Stress/Crowdedness score designs against real (if delayed) commercial data cheaply, then graduate to ORTEX Advanced specifically to unlock genuine Tier B freshness for the Squeeze Score's time-sensitive inputs once the underlying scoring logic is validated — avoiding a premature jump to the more expensive real-time tier before the scoring model itself has been proven out.

## Enterprise

- **Graduation criteria (consistent with this whole series' "enterprise is a graduation point, not a default" framing):** move beyond ORTEX Advanced only once there is a demonstrated need for either (a) S3 Partners-class institutional depth/support, (b) IHS Markit/S&P Global Market Intelligence-class enterprise securities-finance data (a real, known alternative at this tier, per the research doc's vendor table), or (c) bulk/enterprise API licensing beyond ORTEX's own standard developer API — ORTEX itself explicitly offers an enterprise tier ("Full-day downloads... high-volume ingestion and custom delivery pipelines, with dedicated support and SLAs"), meaning a genuine enterprise upgrade path may not even require switching vendors, only upgrading within ORTEX's own product line.
- **Do not default to enterprise tooling before MVP/Production have validated real usage and demand**, exactly as recommended for every prior domain in this research series.

## Cross-cutting recommendations

1. **Never let the Borrow Stress, Squeeze, or Crowdedness Scores silently substitute official short-interest data for commercial securities-lending data, or vice versa** — these are two structurally different data-generating processes (§10 of the research doc), and conflating them would misrepresent both the freshness and the certainty of whichever score is emitted.
2. **Always disclose ORTEX-class "real-time" short interest as a model-based estimate**, not a directly measured regulatory fact — this is a genuine, live-confirmed distinction (ORTEX's own site: *"Short Interest Estimates"*), not a hypothetical caution.
3. **The Squeeze Score's non-predictive scope restriction should be enforced at the schema/type level**, not merely in documentation — e.g., disallow any field name or downstream consumer framing implying "squeeze probability" or "squeeze timing," consistent with `canonicalVerdict.js`'s existing enforcement pattern for forbidden directive language.
4. **Reconfirm FINRA's current settlement/publication schedule and Finnhub's actual short-interest coverage directly before implementation** — both remain open, disclosed verification gaps from this specific research session.
