# Adaptive Intelligence Audit
## Sprint 43 — Can ImpactOne Build a Learning System Without False Confidence?

**Role:** independent quantitative-risk reviewer. **Method:** direct reading of the schema, grading/calibration services, alt-data/regime services, provider health tracking, and the committee architecture — building directly on Sprint 42's measurement audit. Backend remains unreachable this session (confirmed via port check, 5th consecutive session); this does not block this review, which is an architecture/data-readiness audit, not a live test.

---

## 1. Data Readiness

| Requirement | Status | Exact gap |
|---|---|---|
| Outcome completeness | **Partial** | Only the `D1` (24h) window is graded by `outcomeGradingService.js` today, despite the schema modeling six (`D1/W1/M1/M3/M6/Y1`). A learning system trained only on 24-hour outcomes will learn 24-hour noise. |
| Benchmark population | **Missing** | `Outcome.benchmarkReturnPct` and `Outcome.riskAdjustedReturnPct` are real columns (since the Sprint 21B migration) but are never written to by any service (confirmed by full-repo search). No recommendation-level alpha exists to learn from. |
| Committee-member attribution | **Missing** | No table links an individual committee member's vote to a graded `Outcome`. `DecisionTrace.committeeDebate` stores votes as unstructured JSON with no foreign key into grading. |
| Evidence attribution | **Missing** | `Recommendation.evidence` / `DecisionTrace.inputEvidence` / `evidenceReferences` are opaque JSON. No per-evidence-item table joins a category to an outcome grade. |
| Sector availability | **Missing for most rows** | Sector is not a field on `Recommendation` or `Outcome`. It only appears inside the JSON explanation, and only when the symbol is a currently-held position (pulled live from `Position.sector`). Most recommendations carry no sector at all. |
| Market-regime availability | **Missing as a stored, structured field** | `macroRegime` is computed live at generation time (`altDataService.deriveMacroRegime` / `fallbackMacroRegime`) and passed through to `DecisionTrace.inputEvidence` as JSON only — not a normalized, indexed column on `Outcome` or `Recommendation`. Grouping historical outcomes by regime requires parsing JSON per row. Worse: `fallbackMacroRegime()` returns static, hardcoded numbers (`rates.latest: 5.25`, `cpi.latest: 313.5`, etc., `asOf: "n/a"`) whenever the live FRED-style call fails — honestly labeled `source: "fallback"`, but nothing downstream currently excludes fallback-regime rows from analysis, so a naive learning system could silently blend real and fabricated regime labels. |
| Confidence history | **Frozen at creation, no revision trail needed today — but also no versioned confidence-model history for future comparison.** `WorldMemoryPrediction.predictedConfidence` is written once and never updated (append-only, consistent with the rest of the schema), which is good practice. But there is no `confidenceModelVersion` field anywhere, so if a future adaptive system changes how confidence is computed, there is nothing to distinguish "old-model confidence" from "new-model confidence" in the historical record. |
| Provider freshness | **Tracked, but health ≠ data quality.** `providerHealthService.js` genuinely tracks `lastRunAt`/`lastStatus`/`successRate` per provider over the last 10 runs. But of the 15 registered providers, 14 are stubs that always resolve `[]` "successfully" (per Sprint 37's audit) — `successRate` would read 100% for a provider that has never returned a single real item. Freshness tracking measures whether a call didn't throw, not whether it returned real data. |
| DecisionTrace immutability | **Enforced by convention only, not by the database.** The repository exposes no update method for `DecisionTrace`, and this is documented in the schema's own comments. But there is no database-level constraint (e.g., a trigger or immutable table policy) preventing a future migration or a bug from writing an update. For a system whose entire audit trail depends on this record never changing, "no one wrote an update method yet" is a weaker guarantee than a real constraint. |

**Bottom line:** of ten data-readiness requirements, one is solid (confidence-write-once), one is adequately tracked (provider run health, with a real caveat), and eight are missing, partial, or convention-only. This alone is enough to block adaptive weight-changing today — not because the architecture is bad, but because the specific fields a learning system needs to train on do not yet exist or are not populated.

---

## 2. Scientific Validity

| Challenge | Can the system currently handle this? |
|---|---|
| Small samples | Only a `MIN_SAMPLE_SIZE = 5` display gate exists in `calibrationReportService.js` — this hides low-sample results from a dashboard, it does not prevent a future adaptive process from training on 5 data points. No variance, standard error, or confidence interval is computed anywhere. |
| Correlated recommendations | Recommendations sharing the same event catalog entry (`AUTONOMOUS_SCAN_UNIVERSE`) are not flagged as correlated. Treating N recommendations driven by the same underlying headline as N independent samples would overstate an adaptive system's confidence in whatever pattern it "found." |
| Multiple recommendations for the same asset | Nothing de-duplicates or weights down repeat recommendations on the same symbol (e.g., `AUTONOMOUS_SCAN_UNIVERSE`'s fixed `DEFAULT_WATCHLIST` of `AAPL/NVDA/TSLA` means these three symbols are structurally overrepresented in any outcome sample). |
| Bull-market bias | No regime-conditioned outcome breakdown exists (see Data Readiness — regime isn't a queryable field), so a learning system trained through a single bull run has no way to know its "edge" was actually a rising tide. |
| Sector concentration | Sector isn't stored on `Outcome` at all — a learning system cannot even detect that its apparent skill is concentrated in one sector, let alone correct for it. |
| Different holding periods | Only `D1` is graded today. Comparing outcomes across time windows that don't yet exist is not possible; a future multi-window rollout must avoid mixing windows in a single learning signal without labeling them. |
| Benchmark mismatch | `benchmarkReturnPct` is unpopulated on `Outcome`. A raw price return with no benchmark subtracted is not alpha — training on it risks learning "the market went up," not "this signal works." |
| Transaction costs | No transaction-cost or commission modeling exists anywhere in the codebase (confirmed by repo-wide search) — grading and any future backtest would be too optimistic by construction. |
| Slippage | Same — no slippage modeling exists anywhere. `windowStartPrice`/`windowEndPrice` use clean quote prices, not fill prices. |
| Volatility differences | No volatility-normalized return metric exists; a 2% move in a low-volatility name and a 2% move in a high-volatility name are currently scored identically. |
| Unavailable or stale providers | `providerHealthService` can tell you a provider is stale, but nothing prevents a recommendation from being generated and later graded using data from a provider that was down or stubbed at generation time — there is no "data quality flag" carried onto the `Recommendation`/`Outcome` row itself. |

**Bottom line:** the system today cannot distinguish skill from luck on almost every axis a quantitative reviewer would check first. This is not a matter of missing polish — transaction costs, slippage, and benchmark-relative return are foundational to any claim of "this got better," and none of the three exist.

---

## 3. Leakage Attack

| Path | Risk | Required control |
|---|---|---|
| Updated evidence records | Evidence is stored as JSON snapshots inside `DecisionTrace`/`Recommendation` at creation time, not live references — this is actually a strength; there is no live join back to `CanonicalEvent` that could silently change. **Control already effectively in place.** |
| Recomputed committee output | `DecisionTrace.committeeDebate` is written once and never updated (no repository update method) — same protection. **Low risk today**, but only holds as long as no future code path adds an update. |
| Revised prices | `Outcome.windowStartPrice`/`windowEndPrice` are frozen numeric snapshots, not live lookups at read time — good. Risk only exists if a future "regrade" feature is added (see below). |
| Current sector classification | Real risk: sector is pulled live from `Position.sector` at generation time only for held positions — if a future learning system instead derives sector for *all* historical symbols using today's sector mapping (e.g., a company that changed sectors, was reclassified, or was acquired), it would be scoring a past decision using information that didn't exist at the time. **Required control:** any retroactively-derived sector must be timestamped and never assumed to equal the sector as understood at decision time. |
| Current benchmark mappings | `Portfolio.benchmarkSymbol` is a single mutable field (`@default("SPY")`), not versioned per snapshot except inside `PerformanceSnapshot`, which does freeze it. If a future analysis recomputes "what the benchmark should have been" using today's benchmark choice, that is leakage. **Required control:** always use the benchmark recorded on the historical snapshot, never the current portfolio setting. |
| Regraded outcomes | No regrading capability exists today (`Outcome` rows are unique per `[recommendationId, timeWindow, methodologyVersion]` and never updated) — this is a real strength: a future change to grading logic must ship as a new `methodologyVersion`, preserving the old grade rather than overwriting it. **Control already in place by schema design; must be preserved, not "improved" into an update-in-place pattern.** |
| Later provider availability | Real risk: if a stub provider (e.g., SEC, Congress, options-flow) is later wired up to real data, any backfilled evidence attached to *old* recommendations would represent information that did not exist when the original decision was made. **Required control:** never backfill evidence onto historical `Recommendation`/`DecisionTrace` rows; only ever attach newly available evidence to newly created recommendations going forward. |
| Mutated confidence values | No update path exists for `WorldMemoryPrediction.predictedConfidence` today — good. Any future "confidence recalibration" feature must write a new row/version, never edit the original stated confidence. |

**Bottom line:** the append-only, snapshot-based design already in place is the single strongest asset in this whole audit — it closes off most classic leakage paths by construction. The real risk is entirely forward-looking: every leakage path above becomes live the moment someone adds a convenient "just update it" method or a "regrade with better data" feature. The control is procedural (keep the append-only discipline), not something that needs to be built.

---

## 4. Overfitting Attack

| Attack | Would it currently break a naive adaptive system? |
|---|---|
| Recent winning streaks | Yes — nothing distinguishes a genuine improving trend from a short lucky streak; `calibrationReportService`'s trend logic (`earlier` vs `recent` half split) is a coarse heuristic, not a statistical trend test, and would be gamed by any short streak. |
| One exceptional stock | Yes — with sector/symbol concentration unmeasured (see above), one outlier winner (e.g., a single NVDA rally) could single-handedly move an aggregate "hit rate" that an adaptive system might treat as generalizable skill. |
| One dominant sector | Yes — same root cause; no sector field on `Outcome` means no way to detect or down-weight this. |
| Short-term market regime changes | Yes — regime isn't a stored, queryable dimension; a system adapting weights during one regime has no mechanism to notice the regime changed and its "learned" weights no longer apply. |
| Sparse evidence categories | Yes — 14 of 15 providers are stubs; any adaptive weighting of "evidence category X performs well" would in practice be learning from a near-empty or entirely absent category for most of them. |
| Confidence inflation | Yes — nothing bounds how much a future adaptive process could raise stated confidence in response to a short run of correct calls; there is no ceiling, decay, or shrinkage-toward-prior mechanism anywhere today. |
| Excessive weight updates | Yes — no rate limit or change-magnitude cap exists for any hypothetical weight-adjustment process, because no such process exists yet; it would need to be designed with one from day one. |
| Committee-member collapse | Yes — if an adaptive system could ever down-weight or silence a "consistently wrong" committee member, it could collapse the explicit multi-perspective design (`committeeCoordinator.js`'s core stated purpose — "the committee NEVER votes and NEVER averages... that would be exactly the outcome the mission exists to remove") into a single amplified voice, defeating the reason the committee exists at all. |

### Minimum Safeguards Required Before Shadow Mode

1. A hard minimum sample size **per dimension being adapted** (not a display gate — an enforced floor, likely well above 5, with an actual confidence-interval or bootstrap check) before any weight may move at all.
2. A regime-tag captured as a real, stored, structured field on every `Recommendation`/`Outcome` at creation time — not reconstructed later — so any future adaptation can be evaluated separately per regime.
3. A hard cap on the magnitude of any single weight change per adaptation cycle, plus a cooldown period between changes to the same weight.
4. A floor under committee-member influence — no member's effective weight may be reduced below a fixed minimum, preserving the multi-perspective design even under adaptation.
5. Mandatory benchmark-relative (alpha) scoring, transaction-cost and slippage adjustment, before any return-based metric is allowed to influence a weight — otherwise the system is optimizing against a benchmark of zero, which is not a real bar.
6. A published, append-only weight-change log (see Explainability, section 5) that exists and is reviewable *before* the first automated weight change is permitted to occur, not retrofitted after Shadow Mode begins.

---

## 5. Explainability Test

A valid weight-change explanation must include ten elements. None of the required underlying data pipeline yet exists to produce any of them automatically:

| Required element | Currently producible? |
|---|---|
| Old value | No — no weight-versioning table exists yet. |
| New value | No — same. |
| Data sample | Partially — `Outcome`/`WorldMemoryPrediction` rows exist and could be cited, but nothing links a specific weight change to the specific rows that justified it. |
| Time period | Partially — timestamps exist on every relevant row, but no query currently packages "the period this change was based on." |
| Market conditions | No — regime isn't a stored, queryable field (see above). |
| Performance difference | No — no benchmark-relative return is computed, so there is no "difference" to report that means anything. |
| Statistical uncertainty | No — no variance/confidence-interval computation exists anywhere in the codebase today. |
| Change limit | No — no weight-change system exists yet, so no limit has been defined or enforced. |
| Reversal criteria | No — nothing defines what would trigger reverting a weight change. |
| Version history | Partially — the codebase's append-only, versioned-methodology discipline (`methodologyVersion` fields, `WorldMemoryThesisRevision.revisionNumber`) is a strong precedent to build on, but no equivalent table exists yet for adaptive weights specifically. |

**Flag:** any adaptive mechanism proposed for Phase D that does not ship with a dedicated, queryable weight-change-log table satisfying all ten elements above should be treated as non-explainable by definition, regardless of how good its underlying math is. Given today's foundation, **zero of the ten elements are fully producible right now** — this is the single clearest reason adaptive weight-changing cannot start immediately.

---

## 6. Governance

| Item | Must require human approval? | Current state |
|---|---|---|
| Risk limits | **Yes** | No automated mechanism exists to change these today — safe by absence, but must be explicitly excluded from any future adaptive scope in writing. |
| Maximum position size | **Yes** | Same — currently a static concentration threshold constant in `autonomousRecommendationEngine.js`; must stay human-owned. |
| Recommendation action thresholds | **Yes** | Same. |
| Stop-loss rules | **Yes** | No stop-loss mechanism was found in this review at all — must not be introduced as an auto-adapted parameter on day one. |
| Target rules | **Yes** | Same reasoning as thresholds. |
| Benchmark selection | **Yes** | `Portfolio.benchmarkSymbol` is currently a simple mutable field with no audit trail of who/what changed it — this is itself a governance gap independent of adaptive learning. |
| Market-regime definitions | **Yes** | The regime taxonomy (`risk-on`/`risk-off`, `recessionRisk` levels, etc.) is currently a hardcoded set of thresholds in `altDataService.js` — changing the definition of a regime changes the meaning of every historical comparison; this must never be automatable. |
| Committee membership | **Yes** | Currently hardcoded as individual files under `intelligenceCommittee/members/` — a real strength: membership can only change via a human code change and code review, not a runtime process. This must be preserved deliberately, not accidentally lost when Phase D is built. |
| Provider eligibility | **Yes** | Currently a static registry (`providerRegistry.js`); the same reasoning applies — which providers are trusted enough to feed the system must stay a human decision. |
| Minimum evidence requirements | **Yes** | No enforced minimum currently exists in a way that blocks recommendation generation on thin evidence; this should become both a human-set parameter and something adaptive learning is explicitly forbidden from loosening. |

**Bottom line:** all ten items must require human approval, no exceptions. Several are already safe by virtue of being hardcoded/static (committee membership, provider registry) — the governance risk is entirely about what Phase D might tempt someone to make configurable or adaptive later, not about anything currently exposed to automated change.

---

## 7. Shadow Mode Verification — Required Tests

Before any Shadow Mode implementation is trusted, it must pass tests proving each of the following, independent of this audit's broader concerns:

1. **Never changes the live recommendation** — an automated test that runs the real recommendation path and a parallel shadow path against the same input and asserts the live `Recommendation` row written to the database is byte-identical to what would have been written with Shadow Mode fully disabled.
2. **Uses the same original evidence snapshot** — a test asserting Shadow Mode reads only from the already-frozen `DecisionTrace.inputEvidence`/`evidenceReferences` for a given recommendation, never a fresh live re-fetch, with an explicit check that fails the build if a live provider call is made from any shadow code path.
3. **Produces reproducible outputs** — running the same shadow computation twice against the same frozen snapshot must yield identical output; any nondeterminism (e.g., an unseeded random number, wall-clock-dependent logic) must fail this test.
4. **Records all differences** — a dedicated, append-only table (not reusing `DecisionTrace`, to avoid any risk of contaminating the live audit trail) logging every case where the shadow computation would have differed from the live one, with enough detail to reconstruct why.
5. **Cannot silently graduate to production** — a test asserting that no code path exists by which a shadow-computed value is ever read by the live recommendation-serving path without an explicit, human-gated promotion step; ideally enforced by the shadow output living in a physically separate table/schema the live path has no read access to.
6. **Can be disabled immediately** — a single, tested, human-operable kill switch (e.g., a feature flag checked before any shadow computation begins) with a test confirming that when disabled, zero shadow computation runs and zero shadow-related database writes occur.

None of this infrastructure exists yet in the repository as reviewed — this section is a design specification to build against, not a report of a passing or failing existing system.

---

## 8. Business Questions the Planned Architecture Could Eventually Answer

Assuming every data-readiness gap in Section 1 is remediated:

| Question | Eventually answerable? |
|---|---|
| Which committee member adds real alpha? | Yes, but only after a `CommitteeVote`-to-`Outcome` link and populated `benchmarkReturnPct` both exist — neither does today. |
| Under which regimes? | Yes, but only after regime becomes a stored, structured field on `Outcome` rather than buried JSON — not true today. |
| Which evidence categories destroy value? | Yes, but only after evidence items are tagged with a stable category and individually linked to grading — not true today. |
| Is confidence calibrated? | Partially answerable today at an aggregate level (`qualityDashboardService`); a real bucketed calibration curve requires new aggregation work, not new data. |
| Are improvements persistent out of sample? | No mechanism for a held-out/out-of-sample split exists anywhere today — this would need to be designed from scratch as part of Phase D, not merely aggregated from existing tables. |
| Does adaptation reduce drawdown? | Answerable at the portfolio level once adaptation exists, using the already-real `PerformanceSnapshot` timeline — this is one of the stronger-positioned questions, since portfolio-level performance tracking (unlike recommendation-level alpha) is already populated with real benchmark data. |
| Does adaptation merely increase turnover? | Answerable — `Order`/`Trade` tables already track real trade frequency; comparing turnover before/after an adaptive change is one of the more straightforward questions this architecture is already positioned to answer. |
| Can the system prove a change improved results? | Not today, and not automatically even after remediation — this requires a genuine held-out evaluation methodology (a designed experiment), which is a research-process gap, not a data-schema gap. This is the hardest and most important open question in this entire audit. |

---

## Summary

The underlying data architecture (append-only tables, frozen snapshots, versioned methodology, no update paths on audit-critical models) is genuinely well-designed and is the reason several leakage and governance risks are already low. But the specific fields and processes an adaptive learning system needs to train on safely — populated benchmark-relative returns, committee-member attribution, evidence-category attribution, stored regime tags, transaction-cost/slippage modeling, and any statistical significance testing at all — are almost entirely missing today. Building adaptive weight-changing on top of this foundation right now would produce a system that looks scientific (real tables, real timestamps, real methodology versions) while training on signal that cannot currently distinguish skill from luck, market beta, or a single lucky ticker.
