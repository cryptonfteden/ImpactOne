# ETF Flow Data Strategy — ETF.com, VettaFi, Finnhub, SEC, Nasdaq, CBOE, and MVP/Production/Enterprise Recommendations

**Phase:** ETF-FLOW-RESEARCH-001. Pure research/design — no production code was written. Directly evaluates the 6 named source categories from `ETF_FLOW_RESEARCH.md` §11, expanded here into a concrete staged recommendation. **A pricing/coverage accuracy note, consistent with this whole research series' discipline**: several vendor-specific facts below were not independently re-verified live this session (marked accordingly) and should be reconfirmed directly before procurement.

---

## 1. Source-by-source evaluation summary

| Source | Confirmed live this session? | Real role for THIS platform | Real limitation |
|---|---|---|---|
| **ETF.com** | Not confirmed (a direct fetch returned a 404, inconclusive rather than confirmed-absent) | Based on general domain knowledge: a real, well-known ETF-focused financial media/screener site | Primarily editorial/screener in nature, not a documented, stable, programmatic flows API — same category of limitation this research series already identified for OpenInsider (`INSIDER_DATA_STRATEGY.md` §1) |
| **VettaFi** | **Yes, confirmed live** | A real B2B index-licensing/design/calculation and issuer-distribution/marketing platform (a subsidiary of TMX Group) — its genuinely useful role for this platform is most plausibly as a **thematic-ETF classification reference** (`ETF_FLOW_RESEARCH.md` §7's real, disclosed-as-subjective classification need), not as a flows-tracking data feed | **Confirmed, important finding**: VettaFi's own stated business is not positioned as a third-party-consumable flows API — treating it as a "flow data vendor" without independently confirming a specific, documented data-API product (distinct from its core index-services business) would be a real, avoidable misassumption |
| **Finnhub** | The general vendor relationship is confirmed real (`finnhubService.js`, already used for quotes/profile/metrics/insider-transactions per `INSIDER_DATA_STRATEGY.md`); the specific ETF-endpoint field list was not independently re-verified live this session | Based on general domain knowledge, a real, documented ETF-data product line (profile/holdings/sector-exposure) — the cheapest realistic path to real ETF *holdings* data (feeding `ETF_FLOW_RESEARCH.md` §6/§7's ownership-concentration and thematic-exposure needs), reusing an already-configured vendor relationship | Whether Finnhub's own product includes genuine, historical, daily shares-outstanding/flow time series (as opposed to just current holdings/profile data) needs direct reconfirmation before being relied upon as the primary flow-tracking source |
| **SEC** | Not re-fetched this session; grounded in well-established, stable regulatory facts | The authoritative primary source for real fund portfolio holdings (Form N-PORT) — free, official, permanent | A real, structural ~60-day public-disclosure delay (per `ETF_FLOW_RESEARCH.md` §11) — genuinely useful for historical/audit cross-checking, **not** a viable primary source for anything approaching real-time flow tracking |
| **Nasdaq** | Not re-fetched this session; grounded in this research series' own prior, independently-confirmed finding (`ALGORITHMIC_ACTIVITY_RESEARCH.md` §3) that Nasdaq operates real direct market-data infrastructure | A real, legitimate exchange-level source for daily shares-outstanding/NAV publication for Nasdaq-listed funds | Venue-specific — covers only Nasdaq-listed funds, not a universal cross-venue aggregator |
| **CBOE** | Not re-fetched this session; grounded in this research series' own prior confirmed findings (`OPTIONS_DATA_RESEARCH.md`/`ALGORITHMIC_ACTIVITY_RESEARCH.md`) | A real, legitimate but similarly venue-specific source | Same limitation as Nasdaq — a real source for its own listed funds, not a comprehensive flows aggregator on its own |
| **Other reliable providers** | Based on general domain knowledge | Each major ETF issuer (BlackRock/iShares, State Street/SPDR, Vanguard, Invesco) publishes its own real, free, **daily** holdings/shares-outstanding/NAV files directly on its own website — the single most authoritative, free, and (for the specific funds this platform actually needs, e.g. the 11 SPDR sector ETFs already mapped in `sectorEtfMap.js`) genuinely practical direct-ingestion path; dedicated fund-flow-tracking vendors (ETFGI, Morningstar Direct) exist specifically for comprehensive, cross-issuer flow analytics at an enterprise tier | Issuer-direct files require real per-issuer integration work (different file formats/schedules per issuer) — genuinely authoritative but fragmented, not a single unified API |

---

## 2. MVP — cheapest path to a real, honest ETF-flow capability

### 2.1 Scope the universe to what this platform already tracks and needs — the sector ETFs already mapped

Directly reusing this platform's own already-established "reuse the existing tracked universe, don't invent a second one" principle (per `OPTIONS_AGENT_ARCHITECTURE.md` §3, `ALGORITHMIC_ACTIVITY_SCORING.md` §6) — recommend the MVP scope its real flow-tracking coverage to the **11 SPDR sector ETFs already mapped in `sectorEtfMap.js`**, plus a small handful of major broad-market ETFs (e.g., `SPY`/`QQQ`/`IWM`) genuinely relevant to this platform's existing symbol universe, rather than attempting comprehensive coverage of the many thousands of ETFs that exist.

### 2.2 The one real data-acquisition gap: genuine shares-outstanding tracking

Per `ETF_FLOW_RESEARCH.md` §2's headline finding, **the single real new data requirement is a genuine shares-outstanding (or equivalent creation/redemption-unit) time series** — not price, not volume, both of which this platform already has easy access to via its existing price-history infrastructure. Recommend the cheapest realistic MVP path be:
- **Direct issuer files** for the specific 11 SPDR sector ETFs (all issued by State Street/SPDR, meaning this specific MVP scope requires integrating with **one issuer's** daily file format, not many — a materially smaller lift than a general "all ETF issuers" integration) — genuinely free, authoritative, and scoped tightly to what this platform's existing sector taxonomy already needs.
- **Finnhub's own ETF data product** (if directly reconfirmed to include genuine historical shares-outstanding/flow-relevant fields, per §1's caveat) as a supplementary or alternative path, reusing the already-configured vendor relationship.

### 2.3 What NOT to attempt at MVP

**Never substitute ordinary trading volume for genuine flow data, even temporarily, even as a labeled "estimate."** Per `ETF_FLOW_RESEARCH.md` §2's headline finding, these are categorically different concepts, and presenting a volume-derived proxy under a "Flow" label — even heavily caveated — carries real risk of being misread as genuine flow data by a user unfamiliar with the primary/secondary-market distinction. Recommend the MVP report an honest `insufficientData`/`flowTrackingNotYetConfigured` result for any fund without genuine shares-outstanding data, rather than a mislabeled volume-based proxy — the same "an honest zero-coverage stub is better than a mislabeled substitute" discipline this whole engagement has applied consistently (most recently, `SENTIMENT_SOURCE_STRATEGY.md` §1.3's identical treatment of social sentiment at MVP).

---

## 3. Production — broader universe and thematic-ETF coverage

- **Extend issuer-file ingestion to the other major issuers** (iShares/BlackRock, Vanguard, Invesco) once broader-than-sector-ETF coverage is a real, justified requirement — each requiring its own format-specific integration work, a real, incremental engineering cost, appropriately deferred past MVP.
- **VettaFi's real editorial/classification content** (ETF Database/etfdb.com specifically, per §1's confirmed finding about VettaFi's actual business) as a genuine reference for thematic-ETF-to-holdings mapping (`ETF_FLOW_RESEARCH.md` §7) — used explicitly as a **classification reference**, not a flows-data feed, with its inherent classification subjectivity (§7) disclosed to users rather than presented as objective fact.
- **A dedicated fund-flow-tracking vendor** (if Finnhub's own depth/history proves insufficient at this stage) for richer, pre-aggregated flow analytics beyond what direct issuer-file ingestion alone provides.

---

## 4. Enterprise — the deepest, broadest tier

- **A specialized, dedicated global ETF-flow-data vendor** (ETFGI/Morningstar-Direct-class) becomes the default recommendation at this tier — extending coverage to the full universe of thousands of listed ETFs (well beyond what direct issuer-file ingestion alone could practically cover) and to non-U.S.-listed funds with their own local disclosure regimes, the same "enterprise is a graduation point, not a default starting point" framing this research series has applied consistently across every prior phase.
- **SEC Form N-PORT ingestion, despite its real ~60-day lag (`ETF_FLOW_RESEARCH.md` §11), remains valuable at this tier as a permanent, free, authoritative historical cross-check** — directly analogous to this research series' own repeated recommendation (SEC EDGAR for Valuation, SEC Market Structure Data for Algorithmic Activity, SEC's real-time Form 4 feed for Insider) that a free, official regulatory source should be retained as a permanent validation layer even after a paid vendor becomes the primary path, never discarded once "good enough" commercial data exists.

---

## 5. Summary — recommended path

| Stage | Universe scope | Primary flow-data source | Thematic/classification source |
|---|---|---|---|
| MVP | The 11 SPDR sector ETFs already mapped in `sectorEtfMap.js`, plus a few major broad-market ETFs | State Street/SPDR's own direct daily issuer files (one issuer format), or Finnhub's ETF product if reconfirmed sufficient | None yet — thematic exposure explicitly deferred |
| Production | Broader coverage across the major issuers | Extended issuer-file ingestion (iShares/Vanguard/Invesco), or a dedicated flow-tracking vendor | VettaFi's real editorial/classification content (ETF Database), used explicitly as a classification reference, not a flows feed |
| Enterprise | Comprehensive, cross-market coverage | A specialized global ETF-flow-data vendor (ETFGI/Morningstar-Direct-class) | Same vendor, or a dedicated thematic-classification product |
| All stages | — | SEC Form N-PORT retained permanently as a free, authoritative — if ~60-day-delayed — cross-check | — |

**Explicitly not recommended at any tier:** substituting ordinary secondary-market trading volume for genuine primary-market flow data, at any stage, under any label — the single most important, repeatedly-emphasized guardrail across this entire research phase.

No code was written to implement any of the above — this document, together with `ETF_FLOW_RESEARCH.md` and `ETF_FLOW_SCORING_MODEL.md`, is the design/decision record for whenever a real implementation phase begins.
