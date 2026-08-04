# Learning Data Contract

**Sprint 43 — Architecture and research only. Defines the shape and integrity rules for a future Learning Observation. Nothing here is implemented; no table described below exists yet.**

## 1. The Learning Unit

A **Learning Observation** is the atomic input to any future adaptive process. It is derived entirely from existing, already-persisted, immutable records (`Recommendation`, `DecisionTrace`, `Outcome`, `RecommendationLifecycleEvent` — all Sprint 16-42) — a Learning Observation is a *read-time projection*, not a new source of truth. This section defines its required shape.

### 1.1 Minimum required fields

| Field | Source (verified to exist today) | Notes |
|---|---|---|
| Recommendation ID | `Recommendation.id` | Primary join key for everything below |
| Original DecisionTrace | `DecisionTrace` row for that recommendation, in full (`inputEvidence`, `rankingResult`, `confidenceCalculation`, `finalOutput`, `committeeDebate`, `evidenceReferences`, `modelVersionMetadata`) | Must be the exact immutable row — never re-derived |
| Asset (symbol) | `Recommendation.symbol` | |
| Asset class | **Not currently a first-class field.** Derivable today only heuristically (equity vs. crypto vs. ETF) from symbol lookup tables scattered across `inferAssetType`-style helpers (frontend `useVirtualPortfolio.js`) — no backend canonical source exists. **Gap — flagged, not solved, here.** |
| Sector | `Recommendation.portfolioContext.sector` when held; **null for market-scan-sourced recommendations** (the majority — see Sprint 42's own documented limitation) | Must be honestly null, never inferred |
| Market regime | **Does not exist yet** — this is exactly what `LEARNING_ARCHITECTURE.md` §3 designs. Until built, every historical DecisionTrace has no regime tag and must be treated as `regime: "UNKNOWN_PRE_REGIME_MODEL"`, a distinct value from the live classifier's own `MIXED_UNKNOWN` | |
| Action | `Recommendation.action` (`BUY`/`REDUCE`/`EXIT`) | |
| Confidence | `Recommendation.confidenceScore` | The single number the recommendation shipped with |
| Holding window | `Outcome.timeWindow` (only `D1` populated today, per Sprint 42's own documented limitation) | |
| Entry price | `Recommendation.evidence.currentPrice` — **best-effort, nullable** (Sprint 42's audit already found this: no fallback/backfill exists) | An observation with no entry price cannot be graded — see Invalid below |
| Benchmark | `Outcome.benchmarkSymbol`/`benchmarkReturnPct` (Sprint 42, SPY-only today; sector ETF only when a real sector is known) | |
| Outcome | `Outcome` row in full (`windowReturnPct`, `directionCorrect`, `grade`, `gradeLabel`, `performanceMetrics`) | |
| Committee votes | `DecisionTrace.committeeDebate.committee.members[]` (Sprint 41 unified shape) — **only present for recommendations generated after the Sprint 41 unification**; earlier rows have the legacy shape or none | |
| Evidence categories | Per-member `supportingEvidence[].category` / `counterEvidence[].category` inside the same `committeeDebate.committee.members[]` | |
| Data freshness | Per-category `freshness`/`isStale` fields inside the evidence matrix snapshot referenced by the DecisionTrace, where available | Not stored verbatim on DecisionTrace today (only the committee's *summary* of it is) — full evidence-matrix snapshots are not persisted, only referenced live at explainability-query time. **Gap: a true point-in-time freshness snapshot requires DecisionTrace to store more than it does today** (a schema question for a future sprint, not decided here). |
| Provider availability | Per-category `stance: "UNAVAILABLE"` flags inside the same snapshot | Same gap as data freshness — currently only observable live, not preserved verbatim per-decision. |

### 1.2 Observation status classification

An observation is exactly one of:

- **Complete** — every field in §1.1 is present and non-null, `gradeLabel !== "UNGRADEABLE"`, `committeeDebate.committee` is present (Sprint 41+), and the observation passes every check in §2 (temporal integrity) and is not flagged by any detector in §3 (bias control).
- **Partial** — missing only fields that are *allowed* to be honestly absent by this codebase's own conventions (sector, asset class, freshness/provider-availability snapshot) but otherwise gradeable and temporally valid. Partial observations are usable for aggregate learning (e.g. overall calibration) but **must be excluded from any segment (regime/sector) that requires the missing field.**
- **Invalid** — missing a field with no honest fallback and no valid reason to be absent: no entry price, no DecisionTrace row at all (should be structurally impossible per Sprint 39's "no orphan recommendation" guarantee, but must be defensively checked), or `gradeLabel === "UNGRADEABLE"`. Invalid observations are excluded from every learning process, always, and logged as excluded (§1.3) — never silently dropped.
- **Contaminated** — passes the above checks but fails a temporal-integrity or bias-control rule (§2, §3): e.g. the DecisionTrace's `modelVersionMetadata`/`contractVersion` predates a breaking committee/evidence-matrix change and cannot be honestly compared to post-change observations, or the observation is flagged by the duplicate-grading or overlapping-window detectors in §2.
- **Excluded** — a superset outcome: every Invalid and Contaminated observation is Excluded; an observation can also be manually Excluded by a human reviewer with a recorded reason (e.g. a known data-provider outage during that window). Every exclusion, automatic or manual, must be logged with a machine-readable reason code — never a silent drop, mirroring this codebase's "never fabricate, always explain absence" convention (e.g. `evidenceMatrixService`'s `unavailableRow`, `outcomeGradingService`'s `ungradeableReason`).

### 1.3 Exclusion logging

Every future implementation of this contract must persist (or at minimum log, pending a schema decision) one exclusion record per excluded observation: `{ recommendationId, status, reasonCode, detail, excludedAt }`. This is what makes bias auditing (§3) possible after the fact — a learning system that silently drops inconvenient data is unauditable by construction.

---

## 2. Temporal Integrity

The single non-negotiable rule: **a learning process may only use information that was genuinely available at the original decision's `createdAt` timestamp.** Every protection below exists to make that rule mechanically enforceable, not just a policy statement.

### 2.1 Look-ahead bias / future evidence appearing in old decisions

- **Protection:** A Learning Observation's "input" side (evidence, committee output, confidence) must be read *exclusively* from the immutable `DecisionTrace` row, never re-computed by re-running the evidence matrix or re-convening the committee for a symbol "as of" a past date. This codebase's evidence matrix and committee are always-live queries (`evidenceMatrixService.buildEvidenceMatrix`, `intelligenceCommitteeService.convene` both hit current provider state) — there is no time-travel query capability, and building one is explicitly out of scope for this design (a look-ahead-safe historical replay engine is a separate, much larger project).
- **Consequence:** Any field identified as a gap in §1.1 (asset class, market regime for pre-model history, per-decision freshness/provider-availability snapshots) genuinely cannot be safely back-filled from today's live state without look-ahead risk. The correct handling is honest absence (Partial/Invalid), never a "best guess" backfill.

### 2.2 Data leakage

- **Protection:** The Learning Observation projection must never join a recommendation to any data whose own timestamp is *after* the grading window closed for that recommendation (e.g. `Outcome.gradedAt`). Concretely: a committee-member scorecard computed for a rolling 30-day window must use `Recommendation.createdAt` for the window filter (as Sprint 42 already does, correctly) — never `Outcome.gradedAt`, which would let outcomes leak forward into windows they don't temporally belong to for the *decision* side of the analysis, even though they're the right filter for the *outcome* side. Both window filters are legitimate for different questions; conflating them is the leakage risk. This distinction must be documented in code comments wherever a future implementation builds this, not just here.

### 2.3 Rewritten recommendation history

- **Protection:** Already structurally guaranteed today — `DecisionTrace`, `Outcome`, and `RecommendationLifecycleEvent` all expose create-only repository methods (verified: no `.update()`/`.delete()` call exists for any of them in the current codebase, and `worldMemoryRepository.js` has a dedicated test proving it). Any future learning-pipeline code must be reviewed to confirm it never adds an update path to these tables — this is the single most important invariant to preserve.

### 2.4 Benchmark revision

- **Protection:** `Outcome.benchmarkReturnPct` is computed once, at grading time, from a real price fetch, and stored immutably. If a benchmark's own historical price data is later revised upstream (e.g. Yahoo Finance corrects a bad print), the *stored* `Outcome` row does not change — by construction, since nothing can update it. A learning process must always prefer the stored value over a fresh re-fetch of "what SPY did on that date," even if they disagree. Document any observed disagreement as a data-quality signal, never silently reconcile by overwriting.

### 2.5 Duplicate grading

- **Protection:** Already enforced today by `Outcome`'s own unique constraint: `@@unique([recommendationId, timeWindow, methodologyVersion])`. A learning process consuming Outcomes should assume this holds but must still defensively deduplicate on read (group by that same triple) in case a future `methodologyVersion` bump intentionally creates a second, non-duplicate grading of the same recommendation/window — which is a legitimate case (re-grading under an improved methodology) that must be distinguished from an actual bug.

### 2.6 Overlapping recommendation windows

- **Protection:** When a symbol is re-recommended before its prior recommendation's grading window closes (a real, observed pattern given the ~15-minute re-run cadence and `supersedeActiveForSymbol`), both observations are temporally real and neither should be excluded merely for overlapping — but any learning process treating observations as *independent samples* (e.g. a naive win-rate average) must flag same-symbol, overlapping-window observation pairs as **correlated**, not independent evidence (see §3.8, repeated correlated recommendations, for the bias-control side of this same issue).

### 2.7 Retroactive provider corrections

- **Protection:** If an upstream provider later republishes corrected data for a past event (rare, but must be assumed possible for any live external feed), the `CanonicalEvent`/evidence-matrix state a committee member saw at decision time is what's preserved (transitively, via the committee's own snapshot on DecisionTrace) — a learning process must never re-fetch "corrected" evidence for a historical decision and treat it as if the committee had seen it. The committee's real, original, possibly-since-corrected view is the only honest input for learning about *that decision's* quality.

---

## 3. Bias Control

Each bias below: how it's detected, how it's handled. Detection is a read-only diagnostic; handling is either exclusion (§1.2) or explicit stratification — never silent correction.

| Bias | Detection | Handling |
|---|---|---|
| **Survivorship bias** | Compare the set of symbols with graded outcomes against the full set of symbols ever recommended (including EXPIRED/CANCELLED via `RecommendationLifecycleEvent`, Sprint 42). A gap indicates outcomes are systematically missing for recommendations that didn't "survive" to grading. | Any aggregate metric must be computed over *all* recommendations that reached a terminal lifecycle state, with EXPIRED/CANCELLED-without-outcome counted as a distinct, reported bucket — never excluded without disclosure. |
| **Selection bias** | Compare the distribution of graded symbols/sectors/actions against the full recommendation universe's distribution. | Report both distributions side by side in any scorecard; flag (don't silently reweight) segments with disproportionately low grading coverage. |
| **Confirmation bias** | Check whether exclusion decisions (§1.3, especially manual ones) correlate with `directionCorrect` — i.e., are "bad-data" exclusions disproportionately applied to losing outcomes? | Every manual exclusion requires a reason code *unrelated* to the outcome's direction, and a periodic audit (human, not automated) cross-tabulates exclusion reason vs. `directionCorrect` to catch this pattern. |
| **Sector imbalance** | Evidence Scorecard segment counts by sector (where known) — already partially visible via Sprint 42's `totalGradedRecommendations` denominator. | Any regime- or sector-conditioned scorecard must report its own sample size per segment and refuse to produce a segment-specific number below the minimum sample size (§8 of `ADAPTIVE_SAFETY_POLICY.md`). |
| **Asset-frequency imbalance** | A small number of frequently-re-recommended symbols (e.g. core watchlist names) can dominate aggregate statistics. Detect via per-symbol observation-count distribution — flag if any single symbol exceeds a set share (e.g. 20%) of total observations in a window. | Cap per-symbol influence on any aggregate statistic (e.g. via a per-symbol sample cap or explicit reweighting), and always report the per-symbol concentration alongside the aggregate number. |
| **Bull-market dominance** | Regime-tag distribution (§6 of `LEARNING_ARCHITECTURE.md`) across the observation set — if the historical window is disproportionately `BULL_TREND_LOW_VOL`, every learned number implicitly reflects that regime only. | This is the primary reason regime-conditioned scorecards (§4 of `LEARNING_ARCHITECTURE.md`) must exist *before* any cross-regime aggregate is trusted — report regime distribution alongside every aggregate metric, and refuse regime-specific claims for underrepresented regimes. |
| **Small sample sizes** | Every scorecard already reports `sampleSize` (Sprint 42) — this is a detection mechanism already shipped, just not yet gated on. | A hard minimum-sample-size gate (see `ADAPTIVE_SAFETY_POLICY.md` §8) below which a metric is reported as `null`/"insufficient data" rather than a real-looking but statistically meaningless number — exactly matching this codebase's existing "honest null over fabricated zero" convention. |
| **Repeated correlated recommendations** | Same-symbol, overlapping-window pairs (§2.6) — plus, more broadly, recommendations sharing a dominant evidence category or a common upstream event (`primaryDriver`/`eventHint`) should be flagged as correlated, not independent. | Cluster correlated observations before computing any statistic that assumes independence (e.g. a confidence interval) — using a cluster-robust or effective-sample-size adjustment, not a naive per-observation count. |
| **Provider availability bias** | Cross-reference which evidence categories were `UNAVAILABLE` (per `evidenceMatrixService`'s honest unavailable-row convention) at decision time against which categories correlate with graded outcomes — a category that's *usually* unavailable will have artificially few, and possibly unrepresentative, observations. | Evidence Scorecard already only reports categories with real citations (Sprint 42) — extend this discipline to explicitly report each category's *availability rate*, not just its usage rate among available instances, so a low usage count is never misread as "this category doesn't matter" when it actually means "this category was rarely even available." |

---

## Cross-references

- Pipeline audit, learning boundary, market regimes, adaptation model comparison: `LEARNING_ARCHITECTURE.md`
- Guardrails, shadow mode, explainability/auditability, failure-mode threat model: `ADAPTIVE_SAFETY_POLICY.md`
- Versioning, validation framework, staged rollout: `PHASE_D_ROADMAP.md`
- Executive summary and explicit go/no-go recommendation: `SPRINT_43_REPORT.md`
