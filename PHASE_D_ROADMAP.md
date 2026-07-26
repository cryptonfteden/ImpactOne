# Phase D Roadmap — Adaptive Intelligence, Staged Implementation

**Sprint 43 — Architecture and research only. This roadmap proposes future sprints; none of its stages are implemented, scheduled, or committed to by this document.**

## 11. Versioning and Reproducibility

Every axis below must be independently versioned — a historical recommendation must be reproducible using its *original* version of each, even after every axis has since moved forward.

| Axis | Current state (verified) | Versioning approach |
|---|---|---|
| Committee configuration (8 members + coordinator logic) | No version identifier exists today — the committee is "whatever `intelligenceCommittee/` currently contains." | Introduce a `COMMITTEE_CONFIG_VERSION` constant (same pattern as `CANONICAL_VERDICT_CONTRACT_VERSION`), bumped on any member-threshold or coordinator-logic change; stored on every new DecisionTrace via `modelVersionMetadata` (already an extensible field). |
| CIO configuration | Same gap — no version today. | `CIO_CONFIG_VERSION`, same mechanism. |
| Weight sets (once any exist, per `LEARNING_ARCHITECTURE.md` §2.C) | N/A — none exist. | Every weight set is a versioned, immutable record (not an in-place-edited config row) — a new weight proposal is always a *new* version, never an overwrite, mirroring DecisionTrace's own immutability. |
| Regime rules (§6 of `LEARNING_ARCHITECTURE.md`) | Does not exist yet. | `REGIME_RULESET_VERSION`, stored per-DecisionTrace at generation time (never recomputed retroactively — see `LEARNING_DATA_CONTRACT.md` §2.3's rewritten-history protection applied to regimes specifically). |
| Calibration curves (§4 adaptation model) | N/A — none exist. | Same immutable-versioned-record pattern as weight sets. |
| Learning policies (the guardrail parameters in `ADAPTIVE_SAFETY_POLICY.md` §8 themselves — sample-size floors, max-change caps, etc.) | N/A — none exist. | These are meta-parameters *about* the learning system, not learned themselves (they belong in `LEARNING_ARCHITECTURE.md` §2.B, human-configurable) — versioned the same way, since changing a guardrail is itself a decision that must be reproducible/auditable. |
| Outcome-grading logic | `methodologyVersion` **already exists and is already used** (`outcomeGradingService.js`'s `METHODOLOGY_VERSION = "sprint29-v1"`, part of `Outcome`'s unique constraint). | No new work — this axis is already correctly versioned; every future grading-logic change should bump this string, exactly as the existing code already does. |

### 11.1 Reproducibility guarantee

Given a historical `Recommendation.id`, the full chain of versions active at that decision's time must be reconstructable from its `DecisionTrace.modelVersionMetadata` alone (extended to include the new version fields above) — without needing to know what the *current* live versions are. This is the acceptance test for "reproducibility": **can a future engineer, six months from now, explain exactly what logic produced today's recommendation, using only what's stored on that one immutable row?**

---

## 12. Validation Framework

Required before any adaptive change (even a shadow-mode challenger) reaches the champion/challenger comparison in `ADAPTIVE_SAFETY_POLICY.md` §9:

| Validation | Requirement |
|---|---|
| **Walk-forward testing** | A challenger is only ever evaluated on observations *after* the point in time its proposal was generated — never on the historical window that motivated it. This is the single most important rule in this section. |
| **Out-of-sample testing** | Even within the walk-forward window, held-out observations not used to tune any secondary parameter of the challenger (if the adaptation mechanism itself has sub-parameters) must exist. |
| **Regime-separated testing** | Every validation must be re-run per regime tag (`LEARNING_ARCHITECTURE.md` §3), not just in aggregate — a challenger that only wins in `BULL_TREND_LOW_VOL` must be labeled and scoped as such, never promoted as a general improvement. |
| **Benchmark comparison** | Every validation reports performance against the same real benchmark fields already on `Outcome` (SPY, and sector ETF where known) — consistent with `ADAPTIVE_SAFETY_POLICY.md` §13's benchmark-gaming prevention. |
| **Confidence calibration** | If the challenger touches confidence in any way, its own calibration (predicted confidence vs. realized hit rate) must be validated independently of whether its win rate improved — a challenger can win more often while becoming *less* honestly calibrated, and that would still be a regression. |
| **Turnover impact** | If a proposed change would alter how often recommendations change action/direction (not applicable to pure calibration proposals, but relevant to any proposal touching thresholds), measure the real turnover delta — high turnover has real costs (even in an advisory system, it degrades user trust) that a pure-accuracy metric would miss. |
| **Drawdown impact** | Validate the challenger's worst-case realized drawdown (via the Performance Engine's existing `maxDrawdownPct`, Sprint 42) alongside its average-case improvement — an adaptation that improves average alpha while worsening tail risk fails validation regardless of the average number. |
| **Statistical uncertainty** | Every validation result ships with a confidence interval, not a point estimate (directly required by the Learning Decision Record, `ADAPTIVE_SAFETY_POLICY.md` §10). |
| **Stability testing** | Re-run the same validation with small perturbations to the observation window boundaries (e.g. ±1 week) — a challenger whose apparent win/loss flips under small perturbations is not stable enough to promote, regardless of its point-estimate performance. |

### 12.1 Explicitly forbidden

**Random train/test splitting for time-series decisions is forbidden**, full stop. Financial/recommendation data is sequentially dependent (autocorrelated returns, regime persistence, overlapping windows per `LEARNING_DATA_CONTRACT.md` §2.6) — a random split leaks future information into the training set via adjacent-in-time observations landing on both sides of the split. Every validation in this section must be temporally ordered (walk-forward), never randomly shuffled.

---

## 14. Implementation Phases

Each stage's exit criteria must be met, and explicitly signed off, before the next stage begins. No stage grants any automatic authority to skip the human-approval gate in D5 — D6 is the *only* stage where bounded automation is even discussed, and only after D5 has run successfully for a defined period.

### D1 — Complete and validate learning dataset

- **Scope:** Implement the Learning Observation projection (`LEARNING_DATA_CONTRACT.md` §1) as a read-only query layer over existing tables. Implement exclusion logging. Implement the bias-detection diagnostics (§3) as reporting-only output — no decisions change.
- **Dependencies:** None beyond what Sprint 42 already shipped.
- **Exit criteria:** A documented, tested projection that correctly classifies a representative historical sample into Complete/Partial/Invalid/Contaminated/Excluded, matching manual review on a sampled subset.
- **Risks:** Discovering that current data volume is too small for any of this to be meaningful yet (a real possibility — the recommendation engine has been live only since Sprint 16/18A within this timeline, and the Sprint 41 committee unification resets the usable committee-vote history to zero as of that sprint).
- **Required tests:** Unit tests for every classification rule in `LEARNING_DATA_CONTRACT.md` §1.2; a regression test asserting the projection never mutates any source table (structural, mirroring existing DecisionTrace-immutability tests).
- **Rollback plan:** Trivial — this stage is entirely read-only and additive; "rollback" is simply not proceeding to D2.

### D2 — Calibration analytics

- **Scope:** Implement regime tagging (`LEARNING_ARCHITECTURE.md` §3) as a new field computed at recommendation-generation time going forward (never retroactively, per temporal-integrity rules). Implement regime-conditioned scorecards. Implement confidence-calibration curves (Bayesian updating, §4 recommendation #2) as a read-only, internal-API-exposed output — no change to what confidence number a recommendation actually ships with.
- **Dependencies:** D1 complete; sufficient post-Sprint-41 observation volume (a concrete threshold to be set once D1's real numbers are known).
- **Exit criteria:** Calibration curves are internally reviewed and judged more honest/useful than raw confidence, by a human, without yet changing anything live.
- **Risks:** Regime rules (§3 of `LEARNING_ARCHITECTURE.md`) may need several iterations of threshold-tuning before they produce sensible, non-degenerate segment sizes — this is expected and should be budgeted for, not treated as a failure.
- **Required tests:** Regime-classifier determinism tests (same inputs → same regime, always); calibration-curve unit tests against synthetic known-distribution data.
- **Rollback plan:** Regime tagging and calibration curves are both purely additive read paths — disable the new internal API routes if needed; no live behavior to revert.

### D3 — Shadow adaptive weights

- **Scope:** Implement the Shadow Mode design (`ADAPTIVE_SAFETY_POLICY.md` §9) for the first, lowest-risk adaptive candidate — per-member contribution weighting (`LEARNING_ARCHITECTURE.md` §2.C item 2). Shadow decisions are computed and graded but never visible to any user-facing surface.
- **Dependencies:** D2 complete; the Learning Decision Record schema (`ADAPTIVE_SAFETY_POLICY.md` §10) implemented; all §8 guardrails implemented and independently tested (sample-size gate, min/max weight bounds, cooldown).
- **Exit criteria:** Shadow decisions have been running long enough, over enough regime diversity, to produce a statistically meaningful (per §12) champion/challenger comparison — not a fixed calendar duration, a data-sufficiency duration.
- **Risks:** The single largest risk in this entire roadmap is a shadow mechanism that's *supposed* to be isolated accidentally sharing state or a code path with the live engine — this must be verified by a dedicated structural safety test (mirroring Sprint 38's committee-independence tests) before D3 is considered started, not just before it's considered done.
- **Required tests:** Structural isolation test (shadow output never imported by any live-path file); guardrail unit tests (every bound in §8 individually verified to actually clamp); Learning Decision Record completeness tests (every required field in §10 always populated).
- **Rollback plan:** Disable the shadow computation entirely (it was never live, so this has zero user-facing effect); archived Learning Decision Records remain for post-mortem analysis.

### D4 — Champion/challenger evaluation

- **Scope:** Formalize the comparison process from D3's accumulated shadow data into a repeatable evaluation pipeline, applying the full validation framework (§12) to produce a genuine promote/reject recommendation per challenger — output is a *recommendation to a human*, not an action.
- **Dependencies:** D3 complete with sufficient shadow history; the validation framework (§12) implemented and independently tested against known synthetic scenarios (a challenger that should obviously fail regime-separated testing, one that should obviously fail stability testing, etc. — proving the framework catches what it claims to catch).
- **Exit criteria:** At least one full evaluation cycle has run end-to-end, producing a complete Learning Decision Record with a human-reviewable promote/reject recommendation, whether or not any actual promotion happens yet.
- **Risks:** A validation framework that "looks rigorous" but has a subtle leak (e.g. an off-by-one in the walk-forward boundary that lets one observation leak across the train/evaluate split) is the archetypal failure here — this stage should include a deliberate red-team review of the validation code itself, not just the challengers it evaluates.
- **Required tests:** The synthetic-scenario tests described above; an explicit test proving the walk-forward split never includes any observation dated before the proposal-generation timestamp on the "evaluation" side.
- **Rollback plan:** This stage produces recommendations, not live changes — "rollback" means simply not acting on a given evaluation's recommendation.

### D5 — Human-approved limited adaptation

- **Scope:** For the first time, a challenger that has passed D4's evaluation and received explicit human approval (per the Learning Decision Record's `approvedBy` field, `ADAPTIVE_SAFETY_POLICY.md` §10) is allowed to influence a **limited, clearly-scoped** subset of behavior — recommend starting with the CIO's explanatory framing (which evidence/members it emphasizes in "why this may be wrong") rather than anything touching the action/confidence-score itself, since that's the lowest-blast-radius genuinely-live surface identified in `LEARNING_ARCHITECTURE.md` §2.C.
- **Dependencies:** D4 complete; kill switch (§8) implemented and tested; drawdown-freezing (§8) implemented and tested; a defined, human-agreed monitoring period and set of automatic-rollback trigger conditions specific to this promotion.
- **Exit criteria:** The promoted change performs in live-adjacent conditions consistent with its shadow-mode evaluation (no significant divergence), over the full monitoring period, with zero kill-switch invocations and zero unexplained drawdown-freeze triggers.
- **Risks:** Live conditions can differ from shadow conditions in ways the evaluation didn't anticipate (regime shift during the monitoring period, a provider outage changing evidence availability patterns) — this is exactly why the monitoring period and automatic-rollback triggers must be defined *before* promotion, not improvised after something looks wrong.
- **Required tests:** End-to-end integration test proving the kill switch actually reverts this specific promoted behavior; monitoring-alert tests (the drawdown-freeze and rollback triggers actually fire under synthetic adverse conditions).
- **Rollback plan:** Automatic rollback (§8) to the immediately-prior state, referenced by `rollbackReference`; kill switch as the manual override if automatic rollback itself is ever in doubt.

### D6 — Carefully bounded automation

- **Scope:** Only after D5 has run successfully for a defined period with a defined promoted-change history, consider allowing *future* proposals of the *same, already-validated type* (e.g. further CIO-framing adjustments, not a new category of adaptive surface) to move from D4's evaluation to live with a reduced (but never zero) human-review burden — e.g. a human reviews and can veto within a window, rather than affirmatively approving every single instance.
- **Dependencies:** A demonstrated D5 track record; this document's own explicit re-review, since "bounded automation" is exactly the kind of scope expansion that deserves fresh sign-off rather than being pre-authorized here.
- **Exit criteria:** Not defined by this document — D6's exit criteria should be set based on what D5 actually reveals, not speculated about in advance of any real D5 data existing.
- **Risks:** Scope creep — "bounded automation" for one validated surface must not silently become the template for automating a higher-blast-radius surface (e.g. the action/confidence-score itself) without its own full D1-D5 cycle. Every new adaptive surface restarts at D1 for *that surface*, regardless of how mature the overall system has become.
- **Required tests:** To be defined once D6 is actually scoped — deliberately left open rather than guessed at here.
- **Rollback plan:** Same automatic-rollback and kill-switch mechanisms as D5, plus the option to demote a surface back to D5 (human-approval-required) if reduced-review automation shows any concerning pattern.

---

## Cross-references

- Pipeline audit, learning boundary, market regimes, adaptation model comparison: `LEARNING_ARCHITECTURE.md`
- Learning unit definition, temporal integrity, bias controls: `LEARNING_DATA_CONTRACT.md`
- Guardrails, shadow mode, explainability/auditability, failure-mode threat model: `ADAPTIVE_SAFETY_POLICY.md`
- Executive summary and explicit go/no-go recommendation: `SPRINT_43_REPORT.md`
