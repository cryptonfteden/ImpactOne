# Confidence Calibration Strategy

**Phase:** CONFIDENCE-UNIFICATION-001. Companion to [UNIFIED_CONFIDENCE_ARCHITECTURE.md](../architecture/UNIFIED_CONFIDENCE_ARCHITECTURE.md) and [CONFIDENCE_MIGRATION_PLAN.md](../planning/CONFIDENCE_MIGRATION_PLAN.md). Documentation only.

---

## The central honest constraint

**This platform cannot yet numerically calibrate 14 independent confidence formulas against each other, because it does not yet have real, sufficient, per-agent graded-outcome history to calibrate against.** This is not a gap in this design — it is an accurate description of where the platform actually is today, and any calibration strategy that pretended otherwise would replace an honest "not yet comparable" state with a fabricated one, directly contradicting this platform's own consistently-applied honesty-over-fabrication discipline (the same discipline every one of the 5 reviewed `confidenceModel.js` files itself already follows via its hard `dataAvailable` gate).

`scoringVocabulary.js`'s own already-existing disclosure states this precisely for a narrower case (confidence/conviction/modelConfidence collapsing to one number "pending real calibration data"); this strategy generalizes that same honest posture to all 14 agents' confidence scores.

---

## What calibration would require, and why it isn't available yet

Real numeric cross-agent calibration (i.e., being able to say "Institutional's 62 and Macro's 62 represent genuinely equivalent evidentiary strength") requires, at minimum:

1. **A real, sufficient sample of graded Outcomes per agent** — this platform's own already-real Outcome-grading infrastructure (`outcomeGradingService.js`, `calibrationReportService.js`, confirmed real and tested in this engagement's own prior audits) exists, but its own `MIN_SAMPLE_SIZE` gates and its own historically-confirmed real dataset composition (this engagement's own prior Sprint D1/D1.5 dataset audits found ~70-76% duplicate-content contamination in the graded-recommendation dataset at the time) mean there is not yet a clean, sufficient, per-agent-attributed sample to calibrate against.
2. **A real mapping from each agent's own confidence formula to a specific graded prediction** — today, Outcome grading is attached to a `Recommendation`, not to any individual domain agent's own signal; there is no `Outcome`-to-`institutionalAgent`-specifically link (this mirrors this engagement's own prior finding, in an earlier Options-Agent-era audit, that no `CommitteeVote`-to-`Outcome` link exists either — the same structural gap, now confirmed to also apply at the domain-agent level).
3. **A statistically defensible reliability-diagram/Brier-score methodology** — this engagement's own prior `CALIBRATION_REVIEW.md` already found the existing `calibrationReportService.js` lacks this (no Brier score, no reliability diagram, an arbitrary `MIN_SAMPLE_SIZE=5` with no real significance test) even for the one thing it does calibrate today (recommendation-type/action performance) — extending an already-under-powered methodology to 14 additional, finer-grained agent-level calibrations would compound, not fix, that existing gap.

None of these three preconditions exist today. This strategy's central recommendation is therefore sequencing-based, not formula-based.

---

## The staged calibration strategy

### Stage A (available today, zero new data required): Structural/qualitative calibration only

Adopt the `basis` field from `UNIFIED_CONFIDENCE_ARCHITECTURE.md` §9 — this is **calibration of meaning, not calibration of number**. It allows a consumer to know that Institutional's confidence and Macro's confidence answer structurally different questions, without requiring either to be numerically adjusted. This is available immediately and requires no new data.

### Stage B (requires linking Outcome data to individual agents — a real, moderate schema change, not proposed here as code but named as a prerequisite)

Before any numeric calibration can begin, the platform needs a real way to attribute a graded `Outcome` back to which specific domain agent(s) contributed evidence to the `Recommendation` being graded — analogous to, and ideally unified with, the already-identified-but-unbuilt `CommitteeVote`-to-`Outcome` link gap. **This is explicitly a prerequisite, not a step in this calibration strategy itself** — it is schema/data-model work that belongs to a future, separate phase, named here only so it is not silently assumed to already exist.

### Stage C (requires real sample size per agent, likely months of real production traffic away)

Only once Stage B's linkage exists and a real, sufficiently large, non-duplicate-contaminated sample of per-agent-attributed outcomes accumulates (directly reusing this platform's own already-established `MIN_SAMPLE_SIZE`-gating discipline, but requiring a materially larger, statistically defensible threshold than the currently-under-powered `MIN_SAMPLE_SIZE=5`), can a real per-agent calibration curve (e.g., "when Institutional reports confidence ≥70, how often was the graded direction actually correct, empirically, across N real outcomes") be computed. **This is the earliest point at which any two agents' confidence numbers could be honestly described as calibrated against each other** — and only then via each one's own independently-fitted empirical curve, not via forcing them onto one shared formula.

### Explicitly rejected approach: forcing all 14 formulas onto one shared numeric scale today

Directly extending `NEXT_GEN_ARCHITECTURE.md`'s own explicit rejection ("do not attempt to force all 13 agents' confidence formulas into one shared numeric computation... would replace honest heterogeneity with false uniformity") — this strategy reaffirms that rejection for all 14 agents (now including News). A shared 0-100 *range* is fine to keep (already universal); a shared *meaning* for what a given number within that range represents is the thing that cannot be honestly manufactured without real data.

---

## Interim mitigation while real calibration remains unavailable

Until Stage C is reached, this platform should:

1. **Always display `basis` alongside any cross-agent confidence comparison** (e.g., in the Unified Stock Intelligence report, or any future dashboard) — the cheapest, immediately-available honesty measure.
2. **Never compute a numeric average of confidence scores across agents with different `basis` values** without disclosing that the average blends structurally different kinds of claims — this directly extends the already-established `CONFLICT_RESOLUTION.md` discipline ("never average out a genuine disagreement") one level further, to averaging across genuinely different *kinds* of evidence, not just disagreeing directions.
3. **Track, but do not yet act on, real Outcome-to-agent attribution as it becomes available** — begin accumulating the data Stage B/C will eventually require, even before the schema work formally begins, so that once it does begin, historical data is not lost.

## Summary

| Stage | Requires | Available today? | What it delivers |
|---|---|---|---|
| A — Structural/qualitative (`basis` field) | Nothing new | **Yes** | Consumers can distinguish *kinds* of confidence claims |
| B — Outcome-to-agent attribution | Schema/data-model work (a future, separate phase) | No | The prerequisite link needed for any real numeric calibration |
| C — Empirical per-agent calibration curves | Real, sufficient, non-contaminated per-agent outcome samples | No — likely months of real production traffic away | The earliest honest point at which two agents' confidence numbers could be genuinely compared numerically |
| Force-fit shared formula today | — | Explicitly rejected | Would fabricate false comparability — not pursued at any stage |
