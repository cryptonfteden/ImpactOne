# Learning Architecture — Adaptive Intelligence Design

**Sprint 43 — Architecture and research only. No code was written, no database was modified, nothing in this document is implemented yet.**

## 1. Audit of the Current Decision Pipeline

This section documents the exact, verified current path — read directly from the running code, not assumed. Every claim below was confirmed by grep/read against the actual source files.

```
Providers (22 registered, providerRegistry.js)
    │  fetch() → providerIngestionService → CanonicalEvent (raw evidence, persisted)
    ▼
Evidence Matrix (evidenceMatrixService.js)
    │  10 fixed categories: NEWS, SOCIAL, INSTITUTIONS, ANALYSTS, OPTIONS,
    │  TECHNICAL, SENTIMENT, COT, FUNDAMENTALS, RESEARCH
    │  Each row: { category, stance, confidence, uncertainty, sourceCount,
    │              newestSource, strongestCounterEvidence, reason }
    │  Built fresh per symbol per call — no caching, no learned parameters.
    ▼
Committee Members (8 files, services/intelligenceCommittee/members/*.js)
    │  Each is a pure function evaluate(evidenceMatrix) → standard output.
    │  Every threshold inside them is a hardcoded module-level constant,
    │  e.g. HIGH_UNCERTAINTY_THRESHOLD=60 (macroEconomistMember),
    │  ACTIONABILITY_CONFIDENCE_THRESHOLD=70 (derivativesSpecialistMember),
    │  SECTOR_CONCENTRATION_LIMIT_PCT=25 (equityResearchMember, via Portfolio
    │  Rules). None of these constants are read from a database, a config
    │  service, or any per-symbol/per-regime state. They are identical on
    │  every call, for every symbol, forever, until a human edits the file.
    ▼
Committee Coordinator (committeeCoordinator.js)
    │  summarizeCommittee(): counts SUPPORTIVE/CONTRARY per member,
    │  classifies agreement/disagreement, picks "strongest" evidence by
    │  each member's own self-reported confidence (a max(), never a
    │  weighted blend). computeConsensusLevel() (Sprint 41) derives a
    │  numeric consensus purely from the real count of agreeing members —
    │  again no weight, no learned coefficient.
    ▼
CIO (chiefInvestmentOfficerService.js)
    │  summarizeForCio(): maps the coordinator's agreement/disagreement
    │  structure to a qualitative confidence enum (HIGH_UNANIMOUS /
    │  MODERATE_MAJORITY / LOW_SPLIT / LOW_NO_SIGNAL) via an if/else
    │  ladder on real counts. No numeric scoring, no per-member weighting.
    ▼
Recommendation (autonomousRecommendationEngine.js)
    │  computeConvictionScore() — one fixed formula:
    │    clamp(round(overallAiScore + (opportunityScore - riskScore)*0.2), 0, 100)
    │  buildPortfolioAction() — action/position-size/stop/horizon chosen by
    │  fixed conviction-score tiers (choosePortfolioAction, buildPositionSize,
    │  buildStopLevel — all threshold ladders, no learned cutoffs).
    │  computeQualityScore() — QUALITY_WEIGHTS, a hardcoded object:
    │    { sourceQuality:.15, evidenceFreshness:.15, portfolioRelevance:.20,
    │      evidenceAgreement:.20, dataCompleteness:.10, modelConfidence:.20 }
    │  This is the SINGLE most weight-like object anywhere in the codebase
    │  — and it is a plain JS constant, never read from storage, never
    │  updated by any code path, identical for every symbol/regime/user.
    ▼
DecisionTrace (immutable, Prisma model, create-only repository methods)
    │  Stores inputEvidence, rankingResult, confidenceCalculation,
    │  finalOutput, committeeDebate ({committee, cio} — Sprint 41 unified
    │  shape), evidenceReferences, modelVersionMetadata. No update method
    │  exists anywhere in the codebase for this table.
    ▼
Outcome Grading (outcomeGradingService.js, Sprint 29/42)
    │  Only the D1 (24h) window is graded. computeDirectionCorrect() and
    │  computeGrade() are fixed formulas (magnitude = min(|return|*10,100)).
    │  performanceEngineService.js (Sprint 42) computes real drawdown/
    │  gain/volatility/benchmark-comparison from real price history — all
    │  pure arithmetic, no fitted parameters.
    ▼
Scorecards (committeeScorecardService.js, cioScorecardService.js,
    evidenceScorecardService.js, Sprint 42)
    │  Pure read-only aggregation over graded Outcomes joined to
    │  DecisionTrace.committeeDebate. Computes win rate / average alpha /
    │  calibration / contribution / disagreement frequency per member,
    │  per action, per evidence category. THESE NUMBERS ARE NEVER READ
    │  BACK INTO ANY UPSTREAM STAGE. No file in committee members,
    │  committeeCoordinator, chiefInvestmentOfficerService, or
    │  autonomousRecommendationEngine imports any qualityPlatform service.
    │  Verified by grep: zero matches.
```

### 1.1 Where adaptive learning could theoretically plug in

Every one of these is a real, currently-hardcoded location where a learned value could someday replace a constant — listed here as candidate integration points, not commitments:

| # | Location | Current constant | What a learned value would replace |
|---|---|---|---|
| 1 | `QUALITY_WEIGHTS` (autonomousRecommendationEngine.js) | 6 fixed percentages | Per-component weight in the quality-score rollup |
| 2 | Committee member confidence/uncertainty thresholds (8 files) | Various fixed numbers (60, 70, 25, etc.) | Per-member, per-regime sensitivity |
| 3 | `computeConvictionScore` coefficient (`* 0.2`) | Fixed multiplier | Risk/opportunity balance in conviction |
| 4 | `choosePortfolioAction`/`buildPositionSize`/`buildStopLevel` tiers | Fixed conviction-score cutoffs | Action/sizing thresholds |
| 5 | `computeSymbolRiskScore` penalties (concentration/recession/inflation) | Fixed point penalties | Regime-sensitive risk weighting |
| 6 | `computeUncertainty` (scoringVocabulary.js) | Fixed 50/50 average of evidenceAgreement and consensusLevel | Learned blend ratio |
| 7 | Committee "strongest evidence" selection | `max()` by self-reported confidence | A calibrated, historically-informed confidence |
| 8 | CIO qualitative confidence mapping | If/else ladder on member counts | A calibrated probability |
| 9 | `recencyScore`/`sourceQualityScore` (autonomousMarketService.js) | Fixed decay curve, fixed outlet allowlist | Data-freshness/source-credibility penalty, informed by real outcome correlation |
| 10 | Provider reliability | **Not used anywhere in scoring today** (confirmed: `providerHealthService`/`providerMetricsService` are only consumed by `providerInventoryService`, a display-only service) | Would be a wholly new integration, not a retrofit |

### 1.2 What does NOT exist today (verified, not assumed)

- No weight-storage table, no config-service-backed coefficient, no per-symbol or per-regime parameter set anywhere in the schema or codebase.
- No gradient descent, no Bayesian update, no online-learning loop of any kind.
- No code path where a Scorecard's output is read by anything other than an HTTP controller (`qualityPlatformController.js`) that returns it as read-only JSON.
- No market-regime classifier of any kind exists yet — `macroRegime` objects passed around the engine (`{ recessionRisk, inflationPressure, riskMode }`) come from `autonomousMarketService`'s macro-event heuristics, not from any of the regime taxonomy this sprint discusses. This is a genuinely new component to design (see §6).

**Conclusion of the audit: the system today is 100% deterministic and static.** Every recommendation is a pure function of (a) the evidence matrix built at call time and (b) hardcoded constants. This is the correct, safe starting point for the design below — there is no existing adaptive behavior to inherit bugs from, but also no existing infrastructure to build on beyond the measurement layer Sprint 42 built.

---

## 2. The Learning Boundary

Every system parameter identified in §1.1, plus the mission's named categories, sorted into exactly one of four categories. A parameter only moves out of "Forbidden" or "Fixed" after an explicit human decision recorded in a future sprint — this document does not authorize any change by itself.

### A. Permanently Fixed (never adaptive, by design — not a maturity gate, a permanent architectural decision)

| Parameter | Why permanently fixed |
|---|---|
| `FORBIDDEN_COMMITTEE_KEYS` (canonicalVerdict.js) — the structural guard stripping `action`/`decision`/`verdict` from committee output | This is a safety invariant, not a tunable — allowing it to be "learned away" would recreate the exact two-verdict problem Sprint 18A/41 exist to prevent. |
| The committee's "never vote, never average confidence" rule (Sprint 38 architecture) | A structural guarantee the whole trust model depends on. Making this adaptive would let the system quietly re-invent a black-box blended score. |
| `isVerdict: false` on every committee/CIO/evidence-matrix output | Same category — a hard-coded truth statement about what the object is, not a tunable. |
| DecisionTrace immutability (no update method exists) | The entire audit/explainability layer (Sprint 39, 42) depends on this being permanently true. Learning must consume history, never rewrite it. |
| Advisory-only constraint — no code path may call `portfolioEngineService.placeOrder`/`tradeExecutionService` from the recommendation or learning pipeline | A safety boundary independent of how smart the system becomes. |

### B. Human-Configurable (a person can change it, deliberately, through a reviewed process — but the system never changes it on its own)

| Parameter | Why human-configurable, not adaptive |
|---|---|
| `QUALITY_WEIGHTS` | High blast radius (affects every recommendation's quality score simultaneously) and currently has zero historical validation data behind it. A human should be able to *propose* a new weight set informed by scorecards, but §7/§8 require staged validation before any weight set — human- or machine-proposed — reaches production. |
| Committee member thresholds (the 8 files' module constants) | Changing one member's threshold changes that specialist's entire voice in every future committee. This is closer to a product/policy decision (e.g., "how contrarian should the Market Sentiment Specialist be?") than a statistically-learnable parameter, at least until Phase D produces enough per-member sample size to justify data-driven tuning (see §8's minimum sample size gate). |
| Risk limits: `CONCENTRATION_OVERRIDE_THRESHOLD_PCT`, position-size caps, sector-concentration limits | These are risk-policy decisions with real capital-preservation consequences (even in a paper/advisory system, they set user expectations). Mission explicitly lists "Risk limits" as a category to reason about — the recommendation here is human-configurable, not adaptive, because a learned system optimizing historical alpha has no inherent reason to respect a risk boundary a human cares about. |
| Stop-loss / target logic (`buildStopLevel`, `buildExpectedUpside`) | Same reasoning as risk limits — these encode a risk *preference*, not a fact to be learned from outcomes. |
| CIO reconciliation logic (the qualitative confidence enum mapping) | This is the layer users read to understand *why* a recommendation exists. Keeping its logic human-authored and legible is a trust decision, not a statistical one — see §10 on explainability. It may consume calibration data (below) without its own decision *rule* becoming adaptive. |

### C. Eligible for Adaptive Learning (the actual scope of Phase D, subject to every guardrail in §8)

| Parameter | Why it's a genuine learning candidate |
|---|---|
| Confidence calibration (mapping a raw confidence number to a real historical hit rate) | This is a textbook Bayesian/isotonic calibration problem — Sprint 42's `confidenceCalibration` metric already measures the gap. Learning here doesn't change *what* is recommended, only how honestly confidence is labeled — the lowest-risk possible adaptive surface. |
| Per-member contribution weighting in "strongest evidence" selection | Once enough per-member win-rate history exists (Sprint 42's Committee Scorecard), a *shadow* weighting could down-weight members with a demonstrated poor track record in a given regime — never silencing them, only recalibrating how much weight their voice carries in CIO's summary framing. |
| `recencyScore`/`sourceQualityScore` decay curves | Currently fixed; enough outcome history could validate (or refute) whether "6h/24h/72h/168h" are the right freshness buckets for this specific evidence type. Low blast radius (affects freshness scoring only, not action selection). |
| Evidence-category usage/win-rate informing which categories the CIO's "why this may be wrong" narrative emphasizes | Purely explanatory surface, not a decision surface — safe learning target. |
| Regime-conditioned scorecard segmentation itself (not the regime rules — see §6, which stays deterministic) | Learning *which* regime segments produce reliably different scorecard numbers is itself a valid research question, feeding into calibration, not into the regime classifier's rules. |

### D. Forbidden from Automatic Modification (structurally blocked, not just discouraged)

| Parameter | Why automatic modification is forbidden |
|---|---|
| The recommendation action itself (BUY/REDUCE/EXIT selection logic) | The single highest-blast-radius decision in the system. Mission's Phase D roadmap (§14) explicitly gates any real influence on live recommendations behind D5 (human-approved) and D6 (bounded automation) — never D1-D4. |
| Risk limits and stop-loss/target logic (see category B) — restated here because "human-configurable" must not silently become "system-configurable" through a shadow path | An adaptive system must never be able to loosen its own risk boundaries to chase better historical performance. |
| Market-regime classification rules (§6) | Must stay a deterministic, versioned, human-authored rule set — a black-box regime classifier would break every downstream reproducibility guarantee (§11) and is explicitly forbidden by the mission ("Do not use a black-box classifier"). |
| Provider reliability's influence on evidence inclusion/exclusion | Not because it's unsafe in principle, but because it doesn't exist as an integration point today (§1.2) — building automatic provider exclusion is new functionality with its own failure modes (a temporarily-unreliable-looking provider getting permanently excluded) that deserves its own dedicated design, not a rider on this architecture. |
| DecisionTrace, Outcome, and lifecycle-event tables | Immutability is the single load-bearing guarantee behind every explainability and audit feature since Sprint 39. No learning process may ever call `.update()` or `.delete()` on these. |
| Any weight set reaching production without passing through every stage in §14 (D1→D6) | Restated as a forbidden-by-default posture: the default state of any newly-proposed adaptive parameter is "not live," and it stays that way until it has explicitly earned promotion. |

---

## 3. Market Regimes (deterministic, versioned, reproducible)

A regime model must never be a black box, per the mission's explicit constraint. This section defines eight regimes as deterministic rules over already-computed, already-observable inputs — no new provider, no ML classifier.

### 3.1 Observable inputs (all already available or trivially derivable from existing services)

| Input | Source |
|---|---|
| `recessionRisk`, `inflationPressure` | `autonomousMarketService`'s existing `macroRegime` object (already threaded through `computeSymbolRiskScore`) |
| Realized volatility over a trailing window | `performanceEngineService.computeVolatilityPct` (Sprint 42), applied to a broad index (SPY) rather than a single symbol |
| Trend direction over a trailing window | Sign and magnitude of SPY's own `totalReturnPct` over e.g. 20/60 trading days (same `priceHistoryProvider.getDailyBars` already used for benchmarking) |
| Cross-asset dispersion / correlation stress | Not currently computed anywhere — flagged as a genuine gap; "Liquidity stress" regime cannot be honestly detected without it (see §3.4) |
| Event density | Count of high-importance Feed items (`importanceScore` ≥ some threshold) in a trailing window — already-computed field, no new provider |

### 3.2 Deterministic rule sketch (illustrative — exact thresholds are a Phase D2 deliverable, not decided here)

```
regime = classifyRegime({ spyTrend20d, spyTrend60d, spyVolatility20d, recessionRisk, inflationPressure, eventDensity7d })

if spyVolatility20d > HIGH_VOL_THRESHOLD:
    return spyTrend20d < 0 ? "HIGH_VOLATILITY_BEAR" : "HIGH_VOLATILITY"
if spyTrend60d > BULL_THRESHOLD and spyVolatility20d < LOW_VOL_THRESHOLD:
    return "BULL_TREND_LOW_VOL"
if spyTrend60d < BEAR_THRESHOLD:
    return "BEAR_TREND"
if eventDensity7d > EVENT_SPIKE_THRESHOLD:
    return "EVENT_DRIVEN"
if recessionRisk == "high" or inflationPressure == "high":
    return "RISK_OFF"
if <no rule fires with sufficient margin>:
    return "MIXED_UNKNOWN"
```

Every branch is an explicit, auditable `if`, exactly mirroring this codebase's existing style (`choosePortfolioAction`, `riskLevelLabel`) — no statistical fitting inside the classifier itself.

### 3.3 Versioning and reproducibility

- The rule set is a named, versioned module (e.g. `regimeRules-v1.js`) with an explicit `REGIME_RULESET_VERSION` constant, following the exact precedent of `CANONICAL_VERDICT_CONTRACT_VERSION` (canonicalVerdict.js) and `EVENT_ENVELOPE_VERSION` (eventEnvelope.js) already in this codebase.
- Every DecisionTrace gains a `regimeAtDecisionTime: { regime, rulesetVersion, inputs }` field (additive, matching Sprint 18A's own precedent of adding `modelVersionMetadata` without a breaking change) — so a historical recommendation can always be re-explained under the *exact* rule version active when it was made, even after the ruleset itself is later revised.
- A regime is computed once per recommendation, at generation time, and stored — never recomputed retroactively for a historical DecisionTrace (this would be exactly the "future evidence appearing in old decisions" leakage the mission's §4 forbids).

### 3.4 Unknown/mixed regime handling

`MIXED_UNKNOWN` is a first-class, expected regime — not an error state. Any scorecard or calibration segment keyed by regime must handle `MIXED_UNKNOWN` like any other bucket, and any adaptation mechanism (§7) must refuse to treat `MIXED_UNKNOWN` observations as informative for regime-*specific* tuning (they remain valid for regime-agnostic aggregate learning only). "Liquidity stress" is deliberately left undefined in v1 pending real cross-asset dispersion data — listing a regime the classifier cannot yet honestly detect would violate the same "never fabricate" principle that runs through this entire codebase.

---

## 4. Adaptation Model — Comparison and Recommendation

| Approach | Explainability | Statistical robustness | Blast radius if wrong | Fit for this codebase |
|---|---|---|---|---|
| **Fixed rolling averages** (e.g. trailing-90-day win rate replaces a threshold) | High — a single number, easy to explain | Low — no uncertainty quantification, sensitive to small samples and regime shifts | Medium | Good first step for calibration only (§2.C item 1) |
| **Bayesian updating** (prior + likelihood → posterior, e.g. Beta-Binomial for win rate) | Medium-high — posterior mean *and* a real credible interval | High — naturally handles small samples via the prior, degrades gracefully | Low-medium | **Strong fit for confidence calibration** — directly produces the "confidence interval" the mission requires in §7 |
| **Confidence calibration** (isotonic regression or Platt scaling of raw confidence → realized hit rate) | High — a calibration curve is directly plottable and auditable | High, given enough samples per bucket | Low (affects labeling, not selection) | **Recommended first production use** |
| **Bounded multiplicative weights** (e.g. Hedge/Multiplicative-Weights-style updates to per-member influence, capped to `[0.5x, 2x]`) | Medium — the *mechanism* is simple, but cumulative drift over many periods is harder to eyeball without tooling | Medium — sensitive to update-rate tuning; needs the guardrails in §8 (max change per period) to stay safe | Medium-high once live | Reasonable Phase D3-D4 shadow candidate for per-member contribution weighting |
| **Regime-conditioned scorecards** (not a weight-update rule at all — segment existing scorecards by regime, still fully human-read) | Highest — literally just more granular versions of Sprint 42's existing, already-shipped reports | N/A — this is a measurement refinement, not an adaptation mechanism | None (read-only) | **Should ship before any weight-adjusting mechanism** — it's the data every other approach depends on |
| **Human-approved weight proposals** (system computes a proposed change with full justification; a person clicks approve) | Highest — a person is literally in the loop | As robust as whatever computation proposes the number (can wrap any of the above) | Low — a human veto is the safety valve | **Recommended for the first mechanism that actually touches anything read by a recommendation**, per §8's "human approval thresholds" and the mission's own "first implementation must never immediately control real recommendations" |

### Recommended staged approach

1. **Regime-conditioned scorecards** (pure measurement, zero decision influence) — ship first, informs everything else.
2. **Confidence calibration via Bayesian updating**, surfaced read-only (a calibration curve alongside existing raw confidence, not replacing it) — the lowest-risk genuine "adaptive" output, because it changes *labeling* honesty, not *decisions*.
3. **Bounded multiplicative weight proposals for per-member contribution**, generated in Shadow Mode only (§9), reviewed by a human, requiring explicit approval to promote (§8's human-approval gate) — this is the first mechanism with any theoretical path to influencing a live recommendation, and per the mission it must not reach that path automatically even after this stage.

This staged order directly maps onto the Phase D roadmap in §14 and `PHASE_D_ROADMAP.md`.

---

## Cross-references

- Learning unit definition, temporal integrity, and bias controls: `LEARNING_DATA_CONTRACT.md`
- Guardrails, shadow mode, explainability, and failure-mode threat model: `ADAPTIVE_SAFETY_POLICY.md`
- Versioning, validation framework, and staged rollout: `PHASE_D_ROADMAP.md`
- Executive summary and explicit go/no-go recommendation: `SPRINT_43_REPORT.md`
