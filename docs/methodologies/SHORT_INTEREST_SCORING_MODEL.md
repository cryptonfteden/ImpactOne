# Short Interest Intelligence — Scoring Model

**Phase:** SHORT-INTEREST-RESEARCH-001. Companion to [SHORT_INTEREST_RESEARCH.md](SHORT_INTEREST_RESEARCH.md). Pure research/design proposal — no code, no `scoringVocabulary.js` edits. All scores below are proposed `SCORE_DEFINITIONS` entries, non-directive, evidence-only per `canonicalVerdict.js`'s `FORBIDDEN_COMMITTEE_KEYS` denylist (never emit `action`/`decision`/`verdict`/`recommendation`) — they flow into `DecisionTrace.evidenceReferences`/the Claim Layer only, exactly as every prior agent in this series (Options, Sentiment, Insider, ETF Flow, Institutional) has been designed.

---

## 1. Short Interest Score (0-100)

**Purpose:** a magnitude-only measure of how heavily shorted a stock currently is, relative to its own free float.

- **Inputs:** short interest as a percentage of free float (the metric ORTEX itself surfaces live as `si_pct_free_float`), sourced preferentially from the freshest available data (commercial estimate if subscribed, else the official FINRA/exchange print).
- **Design:** a simple percentile-normalized magnitude score against the stock's own sector/market-cap peer group (reusing this series' established peer-relative normalization pattern from `VALUATION`/`TECHNICAL_SCORING_MODEL.md`), **not** an absolute fixed-threshold score, since "high short interest" is meaningfully sector- and cap-relative.
- **Direction:** intentionally **non-directional** — a high score states "heavily shorted," never "will rise" or "will fall." Consistent with `UNIFIED_SCORING_RESEARCH.md`'s magnitude-vs-direction separation discipline, carried through every score in this series since.
- **Explicitly excluded:** no predictive framing whatsoever; this score is a pure descriptive snapshot.

## 2. Borrow Stress Score (0-100)

**Purpose:** captures the fast-moving, market-priced securities-lending-market stress signal — the metric this whole research found to be the *fastest*, most genuinely real-time indicator available in this domain (`SHORT_INTEREST_RESEARCH.md` §3-4).

- **Inputs:** borrow fee level and its recent rate of change (a spike is a stronger signal than a high-but-flat level), combined with utilization (§4 of the research doc) — both sourced exclusively from commercial securities-lending data (ORTEX/S3 Partners-class vendors), **never** from the official FINRA print, which cannot supply either input at all.
- **Design:** weight recent *rate of change* in borrow fee more heavily than the static level — mirroring `SENTIMENT_RESEARCH.md`'s established finding that rate-of-change/momentum in a signal is often more informative than a static snapshot value.
- **Confidence ceiling:** **structurally dependent on commercial data-source availability** — if no securities-lending-data vendor is procured, this score cannot be computed at all (an honest `UNAVAILABLE`, per the `institutionalSpecialistMember.js` precedent), rather than approximated from official short-interest data, which lacks the underlying lending-market inputs entirely.
- **False-positive disclosure:** a fee/utilization spike can reflect a temporary lendable-supply contraction unrelated to short-selling demand (`SHORT_INTEREST_RESEARCH.md` §4) — this caveat must travel with every emitted score.

## 3. Squeeze Score (0-100)

**Purpose:** a measure of squeeze **susceptibility/precondition strength**, never a "will squeeze" prediction — this scope restriction is the single most important design constraint in this entire scoring model, independently, directly validated by ORTEX's own live-confirmed product description of its own "Short Score" (`SHORT_INTEREST_RESEARCH.md` §7: *"a high score means the setup... is in place; from there it just needs a catalyst"*).

- **Inputs:** days-to-cover (§2 of the research doc), Borrow Stress Score (§2 above), and Short Interest Score (§1 above) combined — all three genuine, real preconditions, none individually sufficient.
- **Explicit, permanent scope restriction, disclosed in every emission:** this score **must never be labeled or interpreted as a squeeze-timing or squeeze-likelihood prediction.** It answers only: *"if a triggering catalyst were to occur, how primed is this stock's short-covering mechanism to accelerate?"* — directly analogous to `ALGORITHMIC_ACTIVITY_SCORING_MODEL.md`'s own momentum-ignition scope restriction (a real, permanent, non-improvable epistemic ceiling, not a data-quality gap).
- **A stock can score persistently high for months with no squeeze occurring** — this must be stated as a first-class disclosure alongside the score itself, not buried in documentation.
- **Confidence ceiling:** capped well below the platform's top confidence tier (proposed **60/100 maximum**) specifically *because* the catalyst-arrival component is fundamentally unknowable from this data, mirroring the permanent confidence ceilings already established for 13F-derived (55/100) and ETF Form N-PORT-derived (40/100) evidence in this research series — here proposed higher than either, since the *inputs themselves* (borrow stress, days-to-cover) are comparatively fresh, even though the *catalyst-prediction* component remains permanently unknowable.

## 4. Crowdedness Score (0-100)

**Purpose:** an inferred, proxy-based estimate of how many distinct market participants are likely short the same stock — explicitly **not** a direct headcount, since no 13F-equivalent short-position disclosure requirement exists (`SHORT_INTEREST_RESEARCH.md` §8).

- **Inputs:** persistence (not just level) of high utilization and elevated borrow fee over a sustained multi-week window, plus days-to-cover — sustained persistence across multiple data snapshots is a stronger crowdedness signal than a single high reading, since a single large short position can also produce a momentarily high reading.
- **Explicit inference-not-measurement disclosure:** every emission of this score must carry a disclosure equivalent to *"inferred from aggregate lending-market proxy signals; not a direct count of distinct short positions"* — this is a materially weaker evidentiary claim than, e.g., the Insider Score's direct Form 4 transaction-count basis, and must never be presented with equivalent confidence.
- **Confidence ceiling:** proposed **50/100 maximum**, reflecting the genuinely inferential (not directly measured) nature of this specific score — the lowest ceiling of the four descriptive scores in this model.

## 5. Confidence Model

Following this series' established multi-factor confidence architecture (`UNIFIED_SCORING_RESEARCH.md`, reused verbatim in structure by every subsequent phase):

- **Source-count factor:** higher confidence when both an official (FINRA-cadence) source *and* a commercial securities-lending-data source are available and roughly directionally consistent; a genuine, real **agreement bonus**, since these are two structurally independent data-generating processes (regulatory reporting vs. lending-market activity), not merely two vendors of the same underlying feed.
- **Single-source dominance cap:** reusing the Claim Layer's own real, tested `MAX_SINGLE_EVIDENCE_WEIGHT = 0.4` precedent (`claimConfidence.js`) — no single input (e.g., a borrow-fee spike alone) should be able to dominate an aggregate Short Interest confidence figure.
- **Score-specific ceilings:** as specified per-score above (Squeeze Score: 60/100 max; Crowdedness Score: 50/100 max) — these are **permanent epistemic ceilings**, not temporary data-availability penalties, and must not be conflated with the Freshness Model's separate, orthogonal staleness discount (§6 below), mirroring the explicit confidence-vs-freshness separation already established in `INSIDER_SCORING_MODEL.md` and `ETF_FLOW_SCORING_MODEL.md`.

## 6. Freshness Model — a genuine two-tier design, distinct from this series' prior single-ceiling phases

Unlike `INSTITUTIONAL_SCORING_MODEL.md`'s and `ETF_FLOW_SCORING_MODEL.md`'s single, permanently-low freshness ceilings (13F and Form N-PORT each had no faster genuine alternative), this domain's live-confirmed dual-source reality (`SHORT_INTEREST_RESEARCH.md` §10) calls for **two explicitly distinct freshness curves**, tagged separately on every emitted evidence item — directly extending the "two genuinely distinct freshness dimensions" pattern already established in `FIBONACCI_SCORING_MODEL.md` (anchor recency vs. bar-data freshness) and `INSIDER_SCORING_MODEL.md` (transaction date vs. filing-lateness discount):

- **Tier A — Official data freshness:** a real, permanent structural ceiling tied to FINRA's twice-monthly settlement/publication cadence (`SHORT_INTEREST_RESEARCH.md` §1) — proposed ceiling **65/100**, reflecting a shorter absolute worst-case staleness than 13F (~135 days) or Form N-PORT (~60 days), but still a real, non-improvable regulatory-cadence limit.
- **Tier B — Commercial estimate freshness:** a much faster, near-daily/intraday curve when a commercial securities-lending vendor is procured — but capped below the platform's absolute maximum (proposed ceiling **80/100**, not 100/100) specifically because, as confirmed live from ORTEX's own site, this data is itself a **model-based estimate**, not a directly measured regulatory fact — a real, disclosed accuracy trade-off for its speed advantage, not a "free" upgrade.
- **Every emitted evidence item must disclose which tier its freshness figure reflects** — collapsing these two into one undifferentiated number would misrepresent either the official data's real staleness or the commercial estimate's real (if lesser) uncertainty.

---

## Summary table

| Score | Directional? | Confidence ceiling | Core epistemic caveat |
|---|---|---|---|
| Short Interest Score | No (magnitude only) | Standard | Sector/cap-relative, not absolute |
| Borrow Stress Score | No (magnitude only) | Depends on commercial-source availability; `UNAVAILABLE` if none | Fee/utilization spikes can reflect supply, not demand, shifts |
| Squeeze Score | No (susceptibility only) | **60/100 max** | Never a "will squeeze" or timing prediction |
| Crowdedness Score | No (magnitude only) | **50/100 max** | Inferred proxy, not a direct headcount |
| Confidence Model | — | Multi-factor, capped by dominance rule (0.4) | Reuses Claim Layer precedent |
| Freshness Model | — | Tier A: 65/100; Tier B: 80/100 | Two genuinely distinct cadences, never collapsed into one number |
