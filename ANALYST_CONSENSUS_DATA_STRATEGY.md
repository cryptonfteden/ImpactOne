# Analyst Consensus Intelligence — Data Strategy

**Phase:** ANALYST-CONSENSUS-RESEARCH-001. Companion to [ANALYST_CONSENSUS_RESEARCH.md](ANALYST_CONSENSUS_RESEARCH.md) and [ANALYST_CONSENSUS_SCORING_MODEL.md](ANALYST_CONSENSUS_SCORING_MODEL.md). Pure research — staged recommendations only, no procurement or code has occurred.

**Framing note, unique to this phase:** like the Macro research immediately before it, MVP here is substantially **wiring/reuse work on an already-configured vendor**, not new vendor procurement — Finnhub already provides real, live recommendation-trend data in production. Unlike Macro, however, this domain's **multi-source cross-check architecture** (`analystConsensusService.js`) is real, well-designed, and ready to receive a genuine second vendor — it is currently blocked purely on licensing/cost, not on missing engineering.

---

## MVP

1. **Build the real `analystConsensusAgent.js` on top of the already-live Finnhub recommendation data** — wraps `finnhubService.js`'s existing `/stock/recommendation` call, computing Consensus Score (§1) and the `ratingRevisionTrend` half of Revision Score (§2) from data that is already fetched in production today, at effectively zero new integration cost.
2. **Add Finnhub's own real price-target endpoint** (not currently called anywhere, confirmed via grep) — a cheap, one-line addition to an already-configured vendor relationship, directly unlocking Target Score (§3) and the `targetRevisionTrend` half of Revision Score for the first time.
3. **Add Finnhub's own real EPS-estimate endpoint** (also not currently called) — closes the Earnings Estimate Revisions research topic (§6 of the research doc), one of the most rigorously academically supported signals in this whole domain, at the same low cost.
4. **Leave `analystConsensusService.js`'s multi-vendor cross-check (`crossCheckRatings()`) fixture-labeled and disabled in production at MVP** — do not silently promote its fixture data to look live; its own existing design already correctly refuses to fabricate a second vendor's opinion, and this MVP recommendation preserves that honesty rather than working around it.
5. **Coverage Score (§4)** is computable immediately from Finnhub's existing `analystCount` field, once peer-relative normalization (reusing this series' already-established peer-group infrastructure from the Valuation/Short-Interest research) is applied.
6. **Conviction Score (§5) ships at its reduced, disclosed 55/100 confidence ceiling** at MVP — action-type weighting (initiation vs. reiteration) is not realistically achievable without a real individual-rating-action feed, which is a Production-tier addition (below).

## Production

- **Connect one real second vendor to `analystConsensusService.js`'s already-built adapter contracts** (`finvizProvider.js`/`tipranksProvider.js`/`zacksProvider.js`, all real, contract-conforming, currently `UNCONFIGURED`) — this is the single highest-value Production-tier addition, since the disagreement-detection engineering is already done and merely needs one real, licensed data source to stop returning fixture output.
  - **TipRanks** — confirmed (via this codebase's own disclosed finding) to require a commercial, application-plus-contract enterprise license with no self-serve free tier — the least accessible of the three for an early-stage integration.
  - **MarketBeat** — not independently reconfirmed live this session (a fetch attempt failed to extract content) — based on general domain knowledge, historically offers a more self-serve-accessible developer API/pricing tier than TipRanks; **recommended as the first vendor to directly reconfirm** before committing to TipRanks' heavier enterprise-licensing path, given the lower expected friction.
  - **Finviz/Zacks** — the other two already-adapter-stubbed vendors; general domain knowledge suggests both similarly require paid tiers, not independently reconfirmed this session.
- **Add a real individual-rating-action event feed** (specific upgrade/downgrade/initiation/price-target-change events with real timestamps, rather than only Finnhub's period-aggregated counts) — required to fully realize Conviction Score's action-type weighting and to unlock Freshness Model's Tier B (near-real-time) ceiling. Likely available from whichever second vendor is connected above (TipRanks/MarketBeat/Zacks/Finviz all plausibly offer this as part of their core product), rather than requiring a third, separate vendor relationship.
- **Alpha Vantage's `AnalystTargetPrice`** (part of the already-integrated, if currently unconfigured, `alphaVantageService.js` `OVERVIEW` function per this series' own Valuation research) is a cheap, low-effort supplementary cross-check for Target Score specifically, reusing an already-partially-built integration rather than a new vendor relationship.

## Enterprise

- **Graduation criteria (consistent with this whole series' "enterprise is a graduation point, not a default" framing):** move beyond Finnhub + one Production-tier second vendor only once there is a demonstrated need for institutional-grade earnings-estimate-revision data specifically (§6 of the research doc) — Refinitiv I/B/E/S or FactSet Estimates are the real, industry-standard sources most professional desks actually use for this specific data type, but both are enterprise-only and not a realistic MVP/Production-stage option.
- **Do not default to enterprise tooling before MVP/Production have validated real usage and demand**, exactly as recommended for every prior domain in this research series.

## Cross-cutting recommendations

1. **Never silently promote `analystConsensusService.js`'s fixture data to look live** — its own existing design already correctly refuses to fabricate a second vendor's opinion; any production wiring must preserve, not work around, this honesty.
2. **Never let the Consensus Score average across a genuine, detected multi-vendor disagreement** — surface the disagreement itself (the specific high/low-rating sources) as a first-class fact, applying only a confidence penalty, directly reusing `crossCheckRatings()`'s own real, already-implemented logic.
3. **Every score in this domain must carry forward the already-shipped Phase E3.5 disclosure** ("third-party data — not an ImpactOne recommendation") — this whole domain is, by construction, a report of what Wall Street collectively believes, never this platform's own view, and this framing must be prominent wherever any Analyst Consensus evidence is ever presented.
4. **Weight revisions above static levels wherever both are available** — this research's own §10 finding (the real, well-documented academic asymmetry between weak static-consensus predictive value and stronger revision-momentum predictive value) should directly shape default score weightings once this platform accumulates enough of its own graded history to test this empirically.
5. **Reconfirm MarketBeat's and Finnhub's exact price-target/EPS-estimate endpoint terms directly before procurement** — both were not independently re-verified live this session (a MarketBeat fetch failed to extract content; Finnhub's price-target endpoint is grounded in this platform's own prior research sessions' domain knowledge, not re-fetched live this session).
