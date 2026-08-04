# Insider Data Strategy — SEC EDGAR, Finnhub, OpenInsider, and MVP/Production/Enterprise Recommendations

**Phase:** INSIDER-RESEARCH-001. Pure research/design — no production code was written. Directly evaluates the 4 named source categories from `INSIDER_RESEARCH.md` §9, expanded here into a concrete staged recommendation.

---

## 1. Source-by-source evaluation summary

| Source | Confirmed live this session? | What it actually provides | Real limitation |
|---|---|---|---|
| **SEC EDGAR** | **Yes** — `sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=4` confirmed live, showing genuine, real-time Form 4 filings as received, with a real documented RSS feed | The authoritative, ground-truth, free, no-auth source for every Form 3/4/5 filing ever made | No clean, pre-parsed, symbol-indexed REST API for transaction-level data (unlike the XBRL financial-statement API this engagement already confirmed live for the Valuation Agent) — requires either full-text search or raw XML-filing parsing, a real, non-trivial engineering lift |
| **Finnhub** | Not re-verified live this session, but this platform's own **existing, configured** Finnhub relationship (confirmed real via `finnhubService.js`) is a strong, direct grounding fact | A real, documented `/stock/insider-transactions` endpoint returning already-parsed records (name, share count, change, filing/transaction dates, transaction code, price) | Ultimately re-derived from the same SEC filings — coverage/latency/historical depth are vendor-dependent, not independently verified this session |
| **OpenInsider** | **No** — a direct fetch attempt returned only an ad-tracking redirect, inconclusive rather than confirmed-absent | A real, long-standing, free, browser-facing screener with genuinely useful cluster-buy views, based on well-established general knowledge of the site | Fundamentally a **screener website**, not a documented, stable, versioned API — historically accessed via scraping, a real ToS/stability risk distinct from a genuine vendor API relationship |
| **Other reliable providers** (Quiver Quantitative, Intrinio, 2iQ/Verity-class) | Not independently re-verified live this session — based on general market/domain knowledge | Real, known vendors offering documented APIs with pre-computed screening/cluster analytics (Quiver), a fundamentals-vendor insider-transactions line already partially evaluated for Valuation (Intrinio), or deep global/cross-market coverage (2iQ/Verity-class) | Pricing/exact coverage not independently re-verified this session — reconfirm directly before procurement, consistent with this whole research series' established honesty discipline for un-re-verified vendor facts |

---

## 2. MVP — cheapest path to a real, honest insider-trading capability

### 2.1 Reuse what's already configured, first

Per `INSIDER_RESEARCH.md` §9, this platform **already has a real, configured Finnhub relationship**, already used for quotes/profile/metrics elsewhere in this codebase. Finnhub's own documented `/stock/insider-transactions` endpoint is the cheapest possible real MVP path — no new vendor contract, no raw SEC XML parsing required, and a genuinely usable, pre-structured data shape (name, role-adjacent fields, share count, transaction code, dates, price) directly compatible with the scoring model's own required inputs (`INSIDER_SCORING_MODEL.md`'s transaction-code-dependent scoring, role-based `ExecutiveScore`, date-pair-dependent freshness model).

### 2.2 SEC EDGAR as a permanent, free, authoritative cross-check — not just an MVP stopgap

Directly mirroring this research series' own established pattern (SEC EDGAR XBRL as a permanent cross-check for the Valuation Agent, per `VALUATION_RESEARCH.md` §10; SEC Market Structure Data as a permanent calibration source for the Algorithmic Activity Agent, per `ALGORITHMIC_ACTIVITY_RESEARCH.md` §4) — recommend the real-time Form 4 feed confirmed live this session be wired in as a **permanent, free, official validation layer**, even after Finnhub becomes the primary data path, specifically to (a) independently verify Finnhub's own parsed data against the authoritative filed source, and (b) catch any vendor-side latency or coverage gaps.

### 2.3 What NOT to attempt at MVP

Raw SEC Form 4 XML parsing (building an in-house parser for the underlying ownership-document XML structure) is explicitly **not** recommended for MVP — this is real, non-trivial engineering effort that Finnhub's existing, already-parsed endpoint makes unnecessary at this stage. Recommend this be revisited only if Finnhub's coverage, latency, or transaction-code fidelity proves insufficient at real production scale (§3).

---

## 3. Production — richer coverage and pre-computed cluster analytics

- **Quiver Quantitative** (or a comparable alt-data aggregator) as a supplemental source for pre-computed cluster/screening analytics beyond Finnhub's raw transaction-level feed — reduces the in-house engineering burden of building `ClusterScore`'s own distinct-insider/window-based aggregation from scratch, though this platform's own disclosed, hand-set weighting (`INSIDER_SCORING_MODEL.md` §3) should still be applied on top of any vendor-supplied pre-aggregation, not substituted for it — consistent with this platform's "never adopt a vendor's opaque pre-computed score as a substitute for this platform's own disclosed, explainable methodology" discipline (directly mirroring `SENTIMENT_SOURCE_STRATEGY.md` §4's identical recommendation against surrendering explainability to a black-box vendor score).
- **Direct in-house SEC Form 4 XML parsing** becomes worth revisiting at this tier specifically if Finnhub's real-world latency (time between an SEC filing landing and Finnhub reflecting it) proves too slow for this platform's own freshness requirements (`INSIDER_SCORING_MODEL.md` §6's 30-day relevance window is itself fairly forgiving, but same-day or next-day latency still matters for genuinely fresh cluster detection) — the real-time EDGAR feed confirmed live this session is the natural fallback/primary source if so.

---

## 4. Enterprise — the deepest, broadest tier

- **A specialized global insider-ownership data vendor** (2iQ Research/Verity-class) becomes the default recommendation at this tier, extending coverage to non-U.S. markets with their own local insider-disclosure regimes (which do not file with the SEC at all, and would otherwise be entirely invisible to a purely EDGAR/Finnhub-based pipeline) — appropriate only once genuine international-market coverage is a real, justified product requirement, not a default starting point, the same "enterprise is a graduation point" framing this research series has applied consistently (`OPTIONS_DATA_RESEARCH.md` §10, `ALGORITHMIC_ACTIVITY_RESEARCH.md` §4, `SENTIMENT_SOURCE_STRATEGY.md` §3).
- **A dedicated, licensed real-time filing-alert feed** (rather than polling a vendor's own refresh cadence) if genuinely same-minute cluster-detection latency becomes a real product requirement — the SEC's own real-time feed (confirmed live this session) remains the authoritative baseline this could be benchmarked against even at enterprise scale.

---

## 5. Summary — recommended path

| Stage | Primary source | Cross-check / supplemental source | New engineering required |
|---|---|---|---|
| MVP | Finnhub's existing, already-configured `/stock/insider-transactions` endpoint | SEC EDGAR's real, confirmed-live Form 4 feed, wired in as a permanent free validation layer | Transaction-code-aware scoring logic (`INSIDER_SCORING_MODEL.md`) applied on top of Finnhub's data — no new vendor integration, no raw XML parsing |
| Production | Same Finnhub relationship, or upgraded tier | Quiver Quantitative (or comparable) for pre-computed cluster analytics, cross-checked against this platform's own disclosed methodology | Possible in-house SEC Form 4 XML parsing if Finnhub's latency proves insufficient |
| Enterprise | A specialized global insider-ownership vendor (2iQ/Verity-class) | SEC EDGAR's real-time feed as the enduring domestic-coverage benchmark | A dedicated, licensed real-time filing-alert integration, if same-minute latency becomes a genuine requirement |

**Explicitly not recommended at any tier as the sole source:** an unofficial, scraped, undocumented path (OpenInsider-class) as the primary data pipeline — real, valuable as a cross-check or a source of screening *ideas*, but carrying real ToS/stability risk this platform's own established vendor-reliability discipline (already applied identically across every prior research phase in this series) recommends against relying on as a primary, production-critical data path.

No code was written to implement any of the above — this document, together with `INSIDER_RESEARCH.md` and `INSIDER_SCORING_MODEL.md`, is the design/decision record for whenever a real implementation phase begins.
