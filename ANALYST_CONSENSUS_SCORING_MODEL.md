# Analyst Consensus Intelligence — Scoring Model

**Phase:** ANALYST-CONSENSUS-RESEARCH-001. Companion to [ANALYST_CONSENSUS_RESEARCH.md](ANALYST_CONSENSUS_RESEARCH.md). Pure research/design proposal — no code, no `scoringVocabulary.js` edits. Every score below is non-directive, evidence-only per `canonicalVerdict.js`'s `FORBIDDEN_COMMITTEE_KEYS` denylist, and must carry forward the already-shipped Phase E3.5 disclosure ("third-party data — not an ImpactOne recommendation") — this whole domain is, by construction, a report of *what Wall Street collectively believes*, never this platform's own view.

---

## 1. Consensus Score (0-100, with a separate signed `consensusLean`)

**Purpose:** the aggregate Buy/Hold/Sell distribution, expressed as a magnitude + separately-signed lean — directly reusing `analystConsensusService.js`'s real, already-implemented `RATING_SCALE` (`STRONG_SELL`=1 .. `STRONG_BUY`=5), never inventing a parallel scale.

- **Composition:** `consensusLean` = the analyst-count-weighted average `scaleValue` across all recognized ratings, normalized to 0-100 for the magnitude component; the signed lean itself (bearish/neutral/bullish) is reported separately, mirroring this whole series' established magnitude-vs-direction separation discipline.
- **Critical design constraint, directly extending `analystConsensusService.js`'s own real `crossCheckRatings()` logic:** when ratings are sourced from **multiple** providers and a genuine disagreement is detected (spread >= the existing `DISAGREEMENT_THRESHOLD` of 2), the Consensus Score must **never silently average across the disagreement** — the disagreement itself must be surfaced as a first-class, visible fact (the specific `highRating`/`lowRating` sources, exactly as `crossCheckRatings()` already returns them), with only a *confidence* penalty applied (§Confidence Model below), not a hidden blending of the underlying values.
- **Mandatory disclosure on every emission:** the well-documented, real structural Buy-skew bias in sell-side research (§1 of the research doc) — the Consensus Score must never be presented as an unbiased "market view," only as "what covering analysts have published, with a known bias toward Buy."

## 2. Revision Score (0-100, with separate `ratingRevisionTrend` and `targetRevisionTrend` sub-axes)

**Purpose:** the momentum of *change*, not the static level — directly operationalizing this research's own §10 finding that revisions carry materially more predictive signal than static consensus levels.

- **Two genuinely distinct sub-axes, never blended into one number** (directly extending this series' own established "keep genuinely distinct freshness/signal axes separate" discipline from `FIBONACCI_SCORING_MODEL.md`/`INSIDER_SCORING_MODEL.md`):
  - **`ratingRevisionTrend`** — period-over-period change in the Buy/Hold/Sell distribution (§8 of the research doc, "Consensus trend"), computable **today** from Finnhub's already-real recommendation-trend series with no new vendor required.
  - **`targetRevisionTrend`** — aggregated `RAISED`/`LOWERED`/`UNCHANGED` counts, directly reusing `analystConsensusService.js`'s real, already-implemented `targetRevision` computation, once real (not fixture) current/prior price-target data is wired in.
- **Weighting:** upgrades/downgrades (§3 of the research doc) should be weighted more heavily than routine reiterations of an already-known rating — a genuine, information-dense event versus a low-information restatement, directly mirroring the Insider Score's own discretionary-vs-routine-transaction weighting principle.
- **False-positive guard:** a rating-distribution shift caused by analyst *turnover* (a bearish analyst dropping coverage, not any existing analyst changing their mind, §8 of the research doc) should be flagged distinctly from a genuine sentiment-shift-driven trend, if the underlying data can distinguish the two.

## 3. Target Score (0-100, with a signed `impliedUpsidePct`)

**Purpose:** the current price's discount/premium to the analyst consensus price target — an "implied upside" metric.

- **Design:** use the **median**, not the mean, price target across covering analysts — outlier-robust, standard practice, directly consistent with this research's own recommendation (§4 of the research doc) and this series' own established "median over mean for robustness" precedent (e.g., the Valuation research's own peer-multiple normalization).
- **Mandatory disclosure on every emission:** the well-documented, real optimism bias in published price targets (§4 of the research doc) — average/median targets have historically tended to run above eventual realized prices, especially in bull-market conditions; the Target Score must disclose this as a structural bias, never presented as an unbiased forecast.
- **Data dependency:** **not computable at all today** — this codebase currently fetches zero price-target data anywhere (confirmed via grep); this score's very existence depends on the cheap, one-line Finnhub price-target-endpoint addition recommended in the Data Strategy doc.

## 4. Coverage Score (0-100)

**Purpose:** a peer-relative measure of how broadly a stock is covered by sell-side analysts, directly reusing this series' own established peer-relative-normalization pattern (Valuation, Short Interest research).

- **Design:** percentile-rank the raw analyst count (`analystCount`, already modeled in `analystConsensusService.js`'s own output shape) against a market-cap/sector peer group — never an absolute fixed threshold, since "high coverage" is genuinely relative to a stock's size/sector.
- **Mandatory disclosure on every emission:** the well-documented, real herding/anchoring tendency among sell-side analysts (§7 of the research doc) — a high Coverage Score must never be silently read as "higher-quality independent signal," only as "more widely followed."
- **Explicitly non-directional:** magnitude only, like this series' own Ownership/Exposure Scores (Institutional/ETF Flow research) — a contextual/breadth fact, never a bullish/bearish signal on its own.

## 5. Conviction Score (0-100)

**Purpose:** the single most interpretive/modeled score in this whole set — distinguishing genuinely high-effort analyst actions from routine, low-effort reiterations, directly extending the Insider Score's own discretionary-vs-routine weighting principle to this domain.

- **Design:** weight each rating action by (a) action type (initiation/resumption of coverage weighted highest, a genuine upgrade/downgrade weighted moderately, a routine reiteration weighted lowest) and (b) the magnitude of any accompanying price-target change **relative to the stock's own current price** (not an absolute dollar amount) — directly mirroring the Institutional Score's own Conviction Score design (weighting a fund's position change by percentage of that fund's own portfolio, not absolute dollars).
- **Confidence ceiling:** proposed **55/100 maximum** while this platform lacks a real individual-rating-action event feed (today's real starting state, per §0/§3 of the research doc — only aggregated period counts exist) — action-type weighting cannot be fully realized without a real per-event data source, a **closeable** gap (like the Macro research's Cycle Score ceiling), not a permanent epistemic limit.

## 6. Confidence Model

Following this series' established multi-factor confidence architecture:

- **Source-count factor:** a Consensus/Revision/Target Score computed from a **single** vendor (Finnhub alone, today's real starting state) should report meaningfully lower confidence than one genuinely cross-checked against a second independent vendor via `analystConsensusService.js`'s real `crossCheckRatings()` mechanism — directly reusing this series' own "single-source vs. multi-source agreement bonus" principle (Short Interest's official-vs-commercial agreement bonus, Institutional's freshness-weighted confidence).
- **Disagreement penalty:** when `crossCheckRatings()` reports a genuine disagreement (spread >= 2), apply a confidence penalty proportional to the spread — never let a wide, genuine disagreement between vendors read as if it were a single confident number.
- **Sample-adequacy factor:** a stock with only 2-3 covering analysts should report materially lower confidence than one with 20+, directly reflecting Coverage Score's own underlying count.
- **Single-source dominance cap:** reusing the Claim Layer's real, tested `MAX_SINGLE_EVIDENCE_WEIGHT = 0.4` precedent (`claimConfidence.js`) — no single outlier analyst's rating or price target should be able to dominate the aggregate.

## 7. Freshness Model — a genuine two-tier design, directly analogous to Short Interest's own official-vs-commercial split

- **Tier A — Aggregated period-snapshot data:** Finnhub's real recommendation-trend series (already live today) reports counts on a period-aggregated basis (well-established as monthly), not the instant of each individual rating action. Proposed ceiling **65/100**.
- **Tier B — Individual rating-action/price-target-revision events:** a real-time (or near-real-time) feed of specific upgrade/downgrade/initiation/price-target-change events, as each occurs — **not available anywhere in this codebase today**, and would require a dedicated real-time analyst-actions vendor (Production tier, see Data Strategy doc). Proposed ceiling **85/100** once available.
- **Every emitted evidence item must disclose which tier it reflects** — collapsing Tier A's monthly-aggregated freshness together with a hypothetical Tier B real-time freshness into one undifferentiated number would misrepresent the genuinely slower cadence of today's only real data source.

---

## Summary table

| Score | Directional? | Confidence ceiling | Core epistemic caveat |
|---|---|---|---|
| Consensus Score | Magnitude + separate signed `consensusLean` | Reduced under detected cross-vendor disagreement | Real Buy-skew structural bias in sell-side research; never averaged across a genuine disagreement |
| Revision Score | Magnitude + 2 distinct sub-axes (rating vs. target revision trend) | Standard | Upgrades/downgrades weighted above routine reiterations; watch for coverage-turnover false positives |
| Target Score | Signed `impliedUpsidePct` | Not computable until price-target data is wired (today's real starting state) | Real, well-documented target-optimism bias; use median not mean |
| Coverage Score | Magnitude only, non-directional | Standard, peer-relative | Herding/anchoring caveat — more coverage ≠ more independent signal |
| Conviction Score | Magnitude only | **55/100 max** while no individual-action event feed exists | Weight by action type + price-relative target-change magnitude, not raw action count |
| Confidence Model | — | Multi-factor, capped by dominance rule (0.4) | Source-count + disagreement-spread + sample-adequacy factors |
| Freshness Model | — | Tier A: 65/100; Tier B: 85/100 (not yet available) | Aggregated monthly snapshot vs. individual real-time events — never collapsed into one number |
