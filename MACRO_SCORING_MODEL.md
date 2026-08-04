# Macro Intelligence — Scoring Model

**Phase:** MACRO-RESEARCH-001. Companion to [MACRO_RESEARCH.md](MACRO_RESEARCH.md). Pure research/design proposal — no code, no `scoringVocabulary.js` edits. All scores below are proposed `SCORE_DEFINITIONS` entries, non-directive, evidence-only per `canonicalVerdict.js`'s `FORBIDDEN_COMMITTEE_KEYS` denylist — they flow into `DecisionTrace.evidenceReferences`/the Claim Layer as market-wide **context**, never a per-symbol verdict, exactly matching this series' own just-completed Sentiment Agent precedent (real, shipped as an explicitly market-wide, not per-symbol, signal).

---

## 1. Macro Score (0-100)

**Purpose:** a single top-level magnitude gauge of how supportive-vs-hostile the current macro backdrop is, deliberately kept **non-directional** (magnitude only) with a **separate signed `macroRegimeLean`** field (risk-on / neutral / risk-off) — directly extending this whole series' established magnitude-vs-direction separation discipline (`UNIFIED_SCORING_MODEL.md`, Claim Layer's confidence-vs-probability separation, Algorithmic Activity Score vs. Execution Pressure).

- **Composition:** a weighted roll-up of the 4 sub-scores below — `liquidityScoreComponent*0.25 + inflationScoreComponent*0.25 + stressScoreComponent*0.30 + cycleScoreComponent*0.20` — Stress Score weighted highest since financial-stress conditions are typically the fastest-moving, most immediately actionable macro context for markets.
- **`macroRegimeLean`:** directly extends the already-real `deriveMacroRegime().riskMode` field (risk-on/risk-off) rather than inventing a parallel classification — recommended to keep this real, existing 2-value output as the base and add a `neutral` middle state once the underlying inputs (§2 below) are widened beyond the current 2-input heuristic.
- **Explicitly excluded:** no directional trading implication of any kind — this is a market-wide context score, feeding evidence for every symbol's own agents to weigh, never a headline "buy/sell the market" signal.

## 2. Liquidity Score (0-100, with signed `liquidityTrend`)

**Purpose:** directly extends and widens the already-real `deriveMacroRegime().liquidityTrend` field, which today is computed from **M2's raw monthly change sign alone** (§12 of the research doc) — a real, disclosed oversimplification this score is designed to fix.

- **Recommended inputs:** M2 money supply trend (already fetched, `M2SL`), Fed balance sheet size trend (`WALCL`, weekly cadence — faster than M2), Overnight Reverse Repo Facility usage trend (`RRPONTSYD`, also weekly), credit-spread tightness (§Stress Score, shared input — tighter spreads correlate with looser effective liquidity conditions).
- **Design:** a weighted composite of the *rate of change* across these series (not raw levels), since liquidity conditions are inherently about the direction/pace of flow, not a static level — directly reusing the "rate of change often more informative than a static snapshot" principle already established in `SENTIMENT_SCORING_MODEL.md`.
- **Confidence ceiling:** capped by data-source completeness — a Liquidity Score computed from M2 alone (today's real starting state) should report visibly lower confidence than one incorporating the faster weekly Fed balance-sheet/reverse-repo series.

## 3. Inflation Score (0-100, with signed `inflationTrend`)

**Purpose:** directly extends `deriveMacroRegime().inflationPressure`, currently a 3-value (low/moderate/high) classification derived from CPI's raw monthly change plus the 10-year yield level.

- **Recommended inputs:** CPI (already fetched, `CPIAUCSL`) **and** PCE (`PCEPI`, not currently fetched — the Fed's own actual target measure, §3 of the research doc) — both should be shown, never silently collapsed into one number, given they are genuinely different measures that can diverge.
- **Forward-looking cross-check:** market-implied breakeven inflation expectations (FRED's `T5YIE`/`T10YIE`, derived from Treasury Inflation-Protected Securities pricing) — a real, useful, forward-looking complement to CPI/PCE's inherently backward-looking (already-occurred) nature; recommended as a disclosed secondary input, not a replacement.
- **False-positive guard:** a single monthly CPI or PCE print can be noisy (one-off category shocks) — recommended a trailing multi-month trend view alongside the latest single print, never the latest print alone presented as "the" inflation signal.

## 4. Stress Score (0-100)

**Purpose:** a financial-market-stress composite — credit spreads, VIX, yield-curve inversion, and (if available) USD funding stress.

- **Key recommendation — reuse, don't rebuild:** the St. Louis Fed's own real, already-published **Financial Stress Index (`STLFSI4`)** is a pre-built composite blending ~18 real financial-market signals (including credit spreads and volatility-adjacent measures) into one FRED-hosted series — directly analogous to this series' own repeated "reuse an existing pre-built index rather than re-derive every component from scratch" principle (e.g., reusing Damodaran's dataset for sector multiples in the Valuation research). Recommended as the primary Stress Score input, with credit spreads (`BAA10Y`) and yield-curve inversion (§6 of the research doc) layered on top as disclosed, individually-visible sub-components rather than hidden entirely inside one number.
- **VIX-specific handling:** since no VIX data source currently exists in this codebase (confirmed absent), the Stress Score must report an honestly **reduced-confidence** result (not a fabricated VIX-free "full" stress reading) until a real-time market-data vendor is procured — the score should clearly disclose which of its named inputs (STLFSI4 / credit spread / yield curve / VIX) are actually populated for any given computation.
- **Confidence ceiling:** the highest-priority score in this whole model to disclose partial-input status honestly, given its role as this platform's primary "is something breaking" gauge.

## 5. Cycle Score (0-100, with a `cycleStage` classification)

**Purpose:** directly extends `deriveMacroRegime().recessionRisk`, currently a 2-input (unemployment level + fed-funds level) heuristic — widened here into a proper multi-factor economic-cycle-stage estimate (expansion / late-cycle / contraction / early-recovery).

- **Recommended inputs:** GDP growth trend (§5 of the research doc, **not currently fetched anywhere** — the single biggest addition this score requires), unemployment trend (already fetched), the yield-curve spread (§6 of the research doc, real academically-validated leading indicator, requires adding one short-end Treasury series).
- **Critical, mandatory disclosure, directly modeled on this series' own Squeeze Score / Momentum Ignition precedent:** yield-curve inversion is a real, historically strong leading recession *indicator*, but **the specific timing between an inversion and any subsequent downturn is not reliably predictable from this data alone** — `cycleStage` must never be framed as a firm forecast, and must never be presented as if it were an official NBER recession call (the NBER's own business-cycle dating is itself a retrospective, multi-month-delayed committee judgment, not a real-time computable fact).
- **Confidence ceiling:** proposed **55/100 maximum** while GDP remains unfetched (today's real starting state) — analogous in spirit to this series' other permanent/structural confidence ceilings (Squeeze Score 60/100, Crowdedness Score 50/100), though here the ceiling is a **closeable data-completeness gap** rather than a permanent epistemic limit, and should rise once GDP is integrated.

## 6. Confidence Model

Following this series' established multi-factor confidence architecture:

- **Data-completeness factor:** the fraction of each sub-score's *recommended* inputs that are actually populated for a given computation (e.g., Stress Score computed from STLFSI4 alone vs. STLFSI4+credit-spread+yield-curve+VIX) — directly modeled on this exact factor already used in `SHORT_INTEREST_SCORING_MODEL.md`/`OPTIONS_SCORING_MODEL.md`.
- **Single-source dominance cap:** reusing the Claim Layer's real, tested `MAX_SINGLE_EVIDENCE_WEIGHT = 0.4` precedent (`claimConfidence.js`) — no single macro series (e.g., one CPI print, one Fed statement) should be able to dominate the aggregate Macro Score.
- **Revision-vintage discount:** a **new** factor specific to this domain, not previously needed elsewhere in this series — GDP prints in particular (§5) are published as Advance/Second/Third estimates, each a real revision of the last; any score consuming GDP must discount confidence for an Advance-vintage figure relative to a Third/final-vintage one, since the Advance estimate is genuinely more likely to be materially revised.
- **Score-specific ceilings:** as specified per-score above (Cycle Score: 55/100 while GDP is unfetched) — permanent-vs-closeable ceilings must be clearly distinguished, since (unlike Squeeze/Crowdedness Scores' permanent epistemic ceilings) most of Macro's current ceilings are closeable data-integration gaps, not permanent limits.

## 7. Freshness Model — the most multi-tiered freshness model in this whole research series

Macro data spans a genuinely wider range of update cadences than any prior domain researched in this series (wider even than Short Interest's already-novel two-tier design) — this calls for **three explicitly distinct freshness tiers**, each separately tagged on every emitted evidence item:

- **Tier 1 — Real-time market data** (interest rates/yields, USD index, oil, gold, VIX, credit spreads — all directly market-traded): near-continuous updates during market hours. Proposed ceiling **90/100**.
- **Tier 2 — Monthly scheduled government releases** (CPI, PCE, Employment/nonfarm payrolls, M2): published on a fixed, publicly known monthly calendar (e.g., Employment Situation on the first Friday of the following month) — genuinely "stale" only relative to Tier 1, but the staleness itself is fully predictable/schedulable, not random. Proposed ceiling **70/100**.
- **Tier 3 — Quarterly, multiply-revised releases** (GDP alone, currently the only requested topic in this tier): published in 3 successive estimates over ~3 months per quarter, each a real revision of the last, with further annual revisions after that — the single slowest, least-final data type in this whole research area. Proposed ceiling **50/100**, and must additionally disclose which estimate vintage (Advance/Second/Third) is reflected.
- **Every emitted Macro evidence item must disclose which tier(s) contributed** — collapsing Tier 1's near-real-time freshness together with Tier 3's quarterly-and-still-provisional freshness into one undifferentiated number would misrepresent the genuinely different reliability of each.

---

## Summary table

| Score | Directional? | Confidence ceiling | Core epistemic caveat |
|---|---|---|---|
| Macro Score | Magnitude + separate signed `macroRegimeLean` | Standard, composite of the 4 below | Market-wide context only, never a symbol-specific or "buy/sell the market" signal |
| Liquidity Score | Magnitude + separate signed `liquidityTrend` | Reduced when only M2 is available (today's real starting state) | M2 alone is a real, disclosed oversimplification; widen with Fed balance sheet/reverse-repo |
| Inflation Score | Magnitude + separate signed `inflationTrend` | Standard | CPI ≠ PCE; the Fed's own target is PCE, both must be shown |
| Stress Score | Magnitude only | Reduced when VIX is unavailable (today's real starting state) | Reuse STLFSI4 rather than re-derive from scratch; disclose exactly which inputs are populated |
| Cycle Score | Magnitude + `cycleStage` classification | **55/100 max while GDP is unfetched** | Never framed as a firm forecast or an official NBER call |
| Confidence Model | — | Multi-factor, capped by dominance rule (0.4) + a new GDP-revision-vintage discount | Reuses Claim Layer precedent, extended with a macro-specific revision discount |
| Freshness Model | — | Tier 1: 90/100; Tier 2: 70/100; Tier 3: 50/100 | 3 genuinely distinct cadences — the widest freshness spread of any domain in this series |
