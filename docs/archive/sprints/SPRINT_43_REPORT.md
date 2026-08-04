# Sprint 43 — Adaptive Intelligence Architecture — Final Report

**Branch:** `sprint-16-live-data` · **Commits: 0 (none made — architecture/research sprint, per mission)** · **Date:** 2026-07-22

## Mission

Design the architecture that will allow ImpactOne to learn from graded recommendation outcomes without becoming unstable, opaque, biased, or overfitted. Architecture and research only — no production code, no database changes, no recommendation-logic changes, no commits, no push.

**Compliance confirmed:** no source file was edited, no migration was created, `git status` shows only the four new markdown deliverables plus this report as untracked additions, and nothing was committed.

## Current Architecture Findings

A full, code-verified (not assumed) audit of the live pipeline — Providers → Evidence Matrix → Committee Members → Committee Coordinator → CIO → Recommendation → DecisionTrace → Outcome Grading → Scorecards — found the system to be **100% deterministic today**. Every recommendation is a pure function of (a) the evidence matrix built at call time and (b) hardcoded module-level constants. Specific, verified findings:

- The closest thing to a "weight" anywhere in the codebase is `QUALITY_WEIGHTS` in `autonomousRecommendationEngine.js` — a plain JS object, never read from storage, never updated by any code path.
- Every committee member's thresholds (confidence bands, sector-concentration limits, actionability cutoffs) are hardcoded per-file constants.
- The Committee Coordinator and CIO use count-based if/else logic and `max()`-by-self-reported-confidence — never a weighted blend.
- **Sprint 42's scorecards are never read by anything upstream** — confirmed by grep: zero files in `intelligenceCommittee/`, `intelligenceCommittee/members/`, or `autonomousRecommendationEngine.js` import any `qualityPlatform` service. The measurement layer and the decision layer are completely disconnected today.
- **No market-regime classifier of any kind exists.** The `macroRegime` object threaded through the engine (`recessionRisk`/`inflationPressure`/`riskMode`) is a much narrower heuristic than the 8-regime taxonomy this sprint's mission names — building a real regime model is new design work, not a retrofit.
- **Provider reliability has zero influence on evidence or recommendations today** — `providerHealthService`/`providerMetricsService` are consumed only by `providerInventoryService`, a display-only service for the internal console.

Full detail, including the complete pipeline diagram and a table of every candidate integration point: `LEARNING_ARCHITECTURE.md` §1.

## Recommended Learning Model

A staged comparison of six approaches (fixed rolling averages, Bayesian updating, confidence calibration, bounded multiplicative weights, regime-conditioned scorecards, human-approved weight proposals) concluded no single mechanism is right for every parameter. Recommended staged order:

1. **Regime-conditioned scorecards** (pure measurement, zero decision influence) — ship first; every other mechanism depends on this data.
2. **Confidence calibration via Bayesian updating**, exposed read-only alongside (never replacing) raw confidence — the lowest-risk genuine adaptive output, since it changes labeling honesty, not decisions.
3. **Bounded multiplicative weight proposals for per-member contribution**, shadow-only, human-approval-gated for any promotion.

Full comparison table and rationale: `LEARNING_ARCHITECTURE.md` §4.

## Parameters Eligible for Adaptation

- Confidence calibration curves (raw confidence → realized hit rate)
- Per-member contribution weighting in "strongest evidence" selection (bounded, shadow-first)
- `recencyScore`/`sourceQualityScore` decay-curve validation
- Evidence-category emphasis in CIO explanatory narrative (explanatory surface only, not a decision surface)
- Regime-conditioned scorecard segmentation (a measurement refinement, not a decision mechanism)

Full table with per-parameter rationale: `LEARNING_ARCHITECTURE.md` §2.C.

## Parameters Forbidden from Adaptation

- The recommendation action selection logic itself (BUY/REDUCE/EXIT)
- Risk limits, stop-loss, and target logic (a risk-*preference* boundary, not a fact to be learned)
- Market-regime classification rules (must stay deterministic and human-authored, per the mission's explicit "no black-box classifier" instruction)
- Provider reliability's influence on evidence inclusion (doesn't exist as an integration point today; building it is new functionality deserving its own dedicated design)
- `DecisionTrace`/`Outcome`/`RecommendationLifecycleEvent` immutability (no learning process may ever gain an update/delete path to these tables)
- Any weight set reaching production without passing through the full D1→D6 staged process

Full table with rationale, plus the "human-configurable" middle category (`QUALITY_WEIGHTS`, committee thresholds, risk limits — a person can deliberately change these through a reviewed process, but the system never changes them on its own): `LEARNING_ARCHITECTURE.md` §2.

## Bias and Leakage Protections

**Temporal integrity** (7 specific protections — look-ahead bias, data leakage, rewritten history, benchmark revision, duplicate grading, overlapping windows, retroactive provider corrections): all detailed in `LEARNING_DATA_CONTRACT.md` §2, each grounded in what the current schema does and doesn't already guarantee (e.g. `DecisionTrace`/`Outcome` immutability is already real and verified; a true point-in-time evidence-freshness snapshot is a genuine, flagged gap).

**Bias controls** (9 named biases from the mission — survivorship, selection, confirmation, sector imbalance, asset-frequency imbalance, bull-market dominance, small sample sizes, repeated correlated recommendations, provider availability bias): each with a specific detection method and handling rule, in `LEARNING_DATA_CONTRACT.md` §3. Every handling rule follows this codebase's existing "honest absence over fabrication" convention (e.g. `evidenceMatrixService`'s `unavailableRow`, `outcomeGradingService`'s `ungradeableReason`) rather than silent correction.

The Learning Observation itself (`LEARNING_DATA_CONTRACT.md` §1) is defined with an explicit five-way status classification (Complete/Partial/Invalid/Contaminated/Excluded) and mandatory exclusion logging — a learning system that silently drops inconvenient data is unauditable by construction, so this design makes that structurally impossible.

## Shadow-Mode Design

A fully isolated parallel computation path: the same real evidence matrix is fed through challenger parameters, producing a shadow decision that is graded against the same real outcome as the live recommendation — but is never written to any user-facing table, never influences the live path, and is structurally verified isolated (mirroring Sprint 38's committee-independence safety tests). Promotion from shadow to limited production requires six explicit gates (minimum sample size, statistically significant forward-only outperformance, no active drawdown-freeze, independent regime-separated validation, human review and approval, and even then promotion is capped at D5/human-approved, never directly to full automation). Full design: `ADAPTIVE_SAFETY_POLICY.md` §9.

## Versioning Strategy

Six axes require independent versioning: committee configuration, CIO configuration, weight sets, regime rules, calibration curves, and learning policies — plus outcome-grading logic, which **already has real versioning today** (`outcomeGradingService.js`'s `METHODOLOGY_VERSION`, part of `Outcome`'s own unique constraint) and needs no new work. The reproducibility acceptance test: *given a historical recommendation id, can a future engineer explain exactly what logic produced it using only what's stored on that one immutable DecisionTrace row, without needing to know today's live versions?* Full detail: `PHASE_D_ROADMAP.md` §11.

## Phase D Implementation Order

**D1** (complete/validate learning dataset, read-only) → **D2** (regime tagging + calibration analytics, read-only) → **D3** (shadow adaptive weights, fully isolated) → **D4** (formal champion/challenger evaluation, produces recommendations not actions) → **D5** (human-approved limited adaptation, scoped first to CIO explanatory framing — deliberately not the action/confidence-score surface) → **D6** (bounded automation for *already-validated* surface types only — any new surface restarts at D1). Every stage has explicit scope, dependencies, exit criteria, risks, required tests, and a rollback plan in `PHASE_D_ROADMAP.md` §14. The validation framework itself (§12) explicitly forbids random train/test splitting for this sequentially-dependent data — walk-forward only.

## Biggest Unresolved Risks

1. **Data volume may be insufficient for years.** The Sprint 41 committee unification resets usable committee-vote history to zero as of that sprint; D1's own exit criteria may reveal the sample size for anything beyond aggregate calibration is currently too small to responsibly proceed past D2 for a long time. This is not a design flaw — it's an honest constraint this architecture must respect rather than route around with a lower sample-size floor than is statistically defensible.
2. **Several required data fields don't exist in a leakage-safe form yet** — asset class, true point-in-time evidence-freshness/provider-availability snapshots, and (until D2 ships) market regime for all historical rows. Backfilling any of these from current live state would violate the temporal-integrity rules this same document establishes; they can only be captured honestly *going forward*.
3. **The validation framework's own correctness is unverified** — a walk-forward boundary off-by-one or a subtle leak in the evaluation code itself is the single most dangerous failure mode named in `ADAPTIVE_SAFETY_POLICY.md` §13, precisely because it would make every subsequent promotion decision silently untrustworthy. D4's roadmap entry explicitly calls for a red-team review of the validation code itself, not just the challengers it evaluates — this must not be skipped under time pressure.
4. **Scope creep from a validated surface to an unvalidated one** is a named, explicit risk in D6 — "bounded automation" for one surface must never be treated as blanket authorization for a higher-blast-radius surface. This report recommends this risk be re-stated in every future sprint that touches D5/D6, not just here.

## Explicit Recommendation: **Proceed** (to D1 only, with conditions)

**Proceed** with **D1 — Complete and validate learning dataset** as the next sprint in this line, and no further, for these reasons:

- D1 is entirely read-only, additive, and reversible by construction (disable the new query layer; nothing else changes) — it carries essentially none of the risk this sprint spent 14 sections designing safeguards against.
- D1's own exit criteria will produce the real answer to "is there even enough data to responsibly go further" — proceeding blindly to D2+ without that answer would itself be a violation of this sprint's own "minimum sample size" and "sparse-data confidence" guardrails.
- Every subsequent stage (D2 onward) should require its own fresh scope confirmation before starting, informed by what D1 actually finds — this report explicitly does **not** recommend pre-approving D2-D6 as a package; each is gated on its predecessor's real exit criteria, not a calendar.

**Do not proceed** directly to any stage that touches a live-adjacent decision surface (D3 shadow weights or beyond) until D1 and D2 have both shipped and been reviewed — the current codebase has zero adaptive infrastructure of any kind, and building shadow-mode machinery before the measurement foundation it depends on (regime tags, calibration curves, a validated Learning Observation dataset) exists would be building on an unverified base, which is exactly the class of mistake this document's threat model (`ADAPTIVE_SAFETY_POLICY.md` §13) warns against.

## Deliverables

- `LEARNING_ARCHITECTURE.md` — pipeline audit, learning boundary (4-way parameter classification), market-regime model, adaptation-model comparison and recommendation
- `LEARNING_DATA_CONTRACT.md` — Learning Observation definition, five-way status classification, temporal-integrity protections, bias-control table
- `ADAPTIVE_SAFETY_POLICY.md` — safety guardrails, shadow-mode design, Learning Decision Record schema, failure-mode threat model
- `PHASE_D_ROADMAP.md` — versioning strategy, validation framework, staged D1-D6 implementation plan
- `SPRINT_43_REPORT.md` — this document

**No code was written. No database was modified. No commits were made. Nothing was pushed.**
