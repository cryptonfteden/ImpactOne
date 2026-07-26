# Outcome Engine Review — Principal AI Scientist Assessment

**Status:** Read-only architectural review. No application code was modified to produce this document. Per instructions, this reviews the **architecture only** — the "Outcome Intelligence Engine" (the platform's own name for it is **Engine 4 — Alpha Attribution Engine**, defined in `INTELLIGENCE_PLATFORM_BLUEPRINT.md`) has no implementation yet; it is a design document (`Status: Design only`), so there is nothing to review at the implementation level.
**Reviewer role:** Principal AI Scientist.
**Subject:** Engine 4 — Alpha Attribution Engine, and its dependencies as specified: `DecisionTrace` (immutable, existing), the Recommendation Engine's `QUALITY_WEIGHTS`/scoring vocabulary (existing, Sprint 18A), Engine 3 — Thesis Engine (proposed), Engine 1 — Research Intelligence Engine's versioned credibility/freshness scores (proposed).

---

## 1. Can it actually improve recommendations over time?

**In principle, yes — the skeleton is a legitimate, standard pattern.** Grade → decompose → propose → backtest → human-approve → adjust upstream weights is the same shape used in real quantitative research loops (walk-forward recalibration with a human gate). The design gets the *governance* shape right: proposals are not silent mutations, every recalibration is itself an auditable, backtested, approvable event, and the loop explicitly closes back into three concrete, already-existing parameters (RIE's credibility/importance weights, Thesis confidence calculation, `QUALITY_WEIGHTS`) rather than some vague "the AI learns" hand-wave.

**But "can it actually improve recommendations" is not yet answerable from the architecture as specified**, because the mechanism that would make it actually work — the recalibration proposal generator's update rule — is unspecified. "Aggregates attribution results across many graded outcomes into proposed weight adjustments" names an input and an output but not a method: no functional form (linear re-fit, gradient step, Bayesian shrinkage, or otherwise), no step-size/regularization discipline, and no explicit minimum-sample gate before a proposal is even allowed to be generated. Without at least one of these locked down, "the loop closes" is a true statement about data flow, not yet a true statement about learning. This is the central finding of this review — see §10 for why it is dangerous, not merely incomplete.

**Verdict on this question: plausible, not yet demonstrated at the architecture level.** The wiring is real; the statistics that would make the wiring produce genuine improvement (rather than noise-chasing) are deferred to implementation, and should not be.

---

## 2. Is the feedback loop mathematically sound?

Partially — the directionally-correct choices are real, but several required quantitative specifications are missing:

- **Correct instinct:** grading against "a symbol-appropriate benchmark (not raw price change alone, so grading can't be gamed by market beta)" is the right idea — alpha, not raw return, is the correct grading target. But "symbol-appropriate benchmark" is not defined: no risk model is named (CAPM beta-adjustment, a simple sector index, Fama-French-style factors, or something else), and benchmark selection is not stated to be fixed **ex-ante** per symbol/sector. If benchmark choice is even implicitly discretionary at grading time, that is itself a leakage vector (see §3) — a benchmark should be assigned by a fixed rule at Recommendation-creation time, not chosen when the outcome is already known.
- **No position-sizing weighting specified.** Recommendations already carry a `positionSizeSuggestion` (e.g., "4-6%"). A grading scheme based only on directional/percentage price outcome, with no reference to the sizing the platform itself recommended, cannot later support the stated goal of learning "should we have sized this bigger/smaller" — that information is thrown away at the grading step unless explicitly modeled in.
- **No treatment of realized risk, only realized return.** The scoring vocabulary already produces a `riskLabel` (Low/Moderate/High) for every recommendation, but nothing in Engine 4 grades whether realized volatility/drawdown actually matched the stated risk label. A recommendation could hit its target return while a holder experienced a much larger intra-period drawdown than "Low risk" implied, and Engine 4 as specified would never notice — the entire risk dimension of the scoring vocabulary would remain permanently unvalidated even after this engine ships.
- **No specified calibration methodology** for the "outcome grades" themselves (see §6) — "documented, risk-adjusted grade" documents that a formula will exist, not what it is.

**Verdict: the loop's data-flow topology is sound; its actual mathematics (benchmark model, sizing-aware grading, risk/drawdown validation, update rule) is under-specified for something that is meant to become the platform's central self-improvement mechanism.** These are exactly the choices that should be locked at the architecture stage, not left to whoever implements it first.

---

## 3. Does it avoid data leakage?

Two of the three main leakage vectors are handled well; one is a real, unaddressed risk.

- **Handled well — evidence/score snapshotting.** `DecisionTrace` already pins evidence and score *values as they existed at decision time* (Sprint 18A's `evidenceReferences`/`modelVersionMetadata`), and Engine 4 is explicitly read-only against it. Because RIE's credibility/freshness scores are versioned and revisable, this is exactly the right defense — attribution walks back through what was *actually known and scored at the time*, not a score that was later revised with the benefit of hindsight. This is a genuine strength inherited from already-shipped Sprint 18A discipline.
- **Handled well — awareness of delisting/corporate actions.** The testing strategy explicitly calls for "known historical price sequences (including delistings and corporate actions/splits)." Naming this as a required test case (rather than an afterthought) is a good sign the design is at least aware of the risk, even though the handling itself is under-specified (see §10a on "ungradeable").
- **Not handled — the backtest harness's train/test discipline.** "Before a proposal is applied, it is back-tested against the existing graded-outcome history to confirm it would genuinely have improved past grading." If "the existing graded-outcome history" used to validate a proposal is the same history used to *derive* that proposal, this is in-sample evaluation dressed as out-of-sample validation — a textbook leakage pattern that will make nearly any proposal look like it "would have helped," because it was fit to that exact history. **This must be a walk-forward or explicit train/holdout split, stated as an architectural invariant, not left to implementation discretion.**

**Verdict: partially leakage-safe by inheritance from existing invariants; the one new mechanism this engine introduces (the backtest harness) is not yet specified with the train/holdout discipline required to make its own leakage claim ("confirm it would genuinely have improved") actually true.**

---

## 4. Does it avoid hindsight bias?

Mostly yes, with one real gap and one thing that should be made an explicit invariant rather than an implication.

- **Strong: immutable, non-rewritable history.** `DecisionTrace` is read-only to this engine, and the Thesis Engine's invalidation monitor "flips status to invalidated... with the triggering evidence always recorded, never silently expired." This directly defeats the most common form of hindsight bias in narrative-driven systems — quietly reinterpreting or re-timing a past call's conditions after the outcome is known to make it look more right (or more wrong) than it was.
- **Gap: grading horizon and benchmark are not stated as pre-registered/fixed-at-creation invariants.** The design implies horizons and benchmarks are set when a Recommendation/Thesis is created, but Engine 4's own section never states this as a hard rule. If either can be selected or adjusted at grading time — even implicitly, even by a well-intentioned implementer trying to "grade fairly" — that is hindsight bias in evaluation design, dressed as reasonableness. This should be locked explicitly: horizon and benchmark are fixed at creation time, full stop, and Engine 4 may never choose either after the fact.
- **Soft risk, not fully engineerable: narrative attribution.** "Attribution decomposer... a decomposition step, not a black box, so a wrong call is explainable" is a genuine strength (see §7), but any human-readable "why it was wrong" narrative built from ex-post correlation carries some irreducible narrative-fallacy risk — a plausible story is not automatically the true mechanism. This is worth naming so reviewers of the eventual output treat attribution narratives as hypotheses, not proven causes (see §7/§10g).

**Verdict: structurally strong against the worst form of hindsight bias (rewriting the record); needs one explicit, locked invariant (horizon/benchmark fixed at creation, never chosen at grading time) to close the remaining gap.**

---

## 5. Are the evaluation windows correct?

This is the single most concrete, fixable architecture gap found in this review.

- **Time horizons are currently free text** (`"1-3 months"`, `"3-12 months"`), which is fine for display but is not machine-actionable for a grading job that needs one deterministic evaluation date. Grading "at each item's defined horizon" from a range string is ambiguous — the earliest bound, the latest bound, the midpoint, and a full-range evaluation are all different, non-equivalent choices, and nothing in the design commits to which one Engine 4 uses. Different implementers (or the same implementer at different times) could silently choose differently, producing incomparable grades across the very history the recalibration loop depends on being comparable. **This needs a structured, parseable horizon field (e.g., an explicit target evaluation date or day-count range) decided now, not a display string reused for grading.**
- **No stated rule for superseded/expired recommendations.** The platform already has `ACTIVE`/`SUPERSEDED`/`EXPIRED` recommendation statuses, and the engine already supersedes a symbol's prior recommendation when it re-runs. Engine 4's design never addresses what happens when a recommendation is superseded *before* its original horizon completes: does it still get graded at its original horizon (the honest, counterfactual "what would have happened if this call had been held" question), or does superseding quietly end its evaluation? If superseded recommendations are simply never graded, the graded sample becomes a biased subsample — specifically biased toward recommendations the system happened not to reverse, which is exactly the population most likely to have been "easy" calls. This selection effect would then feed directly into a recalibration loop that thinks it is learning from a representative sample when it is not.
- **No reconciliation with the bull/base/bear scenario structure.** Each Recommendation already carries three scenario narratives with stated probabilities and price-impact ranges. Grading against a single directional benchmark, with no mention of checking which scenario (bull/base/bear) actually materialized, discards the richest, most falsifiable part of the existing Recommendation Engine output. This is a missed opportunity, not a correctness bug, but it directly weakens the calibration-meaningfulness question in §6 (a recommendation whose *base case* played out exactly as stated is a stronger calibration signal than a coarse "beat the benchmark or not" grade).
- **Minor:** trading-day vs. calendar-day windows (weekends/holidays) are not addressed; a real but secondary concern relative to the two above.

**Verdict: not yet correct as specified — the horizon representation is not gradable without a parseable structure, and the interaction between grading and the existing supersede/expire lifecycle is entirely unaddressed, creating a live selection-bias risk in exactly the sample the whole engine exists to learn from.**

---

## 6. Is calibration statistically meaningful?

This is the area with the largest gap between stated intent and specified method.

- The design is at least **aware** that this matters — "periodic (e.g. weekly/monthly, not continuous) recalibration-proposal generation — batch, since it needs enough accumulated grades to be statistically meaningful" explicitly names the requirement. That awareness is a good sign relative to a design that didn't mention it at all.
- **But no calibration methodology is actually specified.** Calibration, as a statistical concept, has a standard, well-known toolkit: binning by stated confidence and comparing to empirical hit-rate (reliability diagrams), Brier score or log-loss, and confidence intervals around each bin's estimate. None of this is named. "Statistically meaningful" is asserted as a goal, not defined as a method.
- **No minimum-sample gate is specified as a hard rule**, only implied as a scheduling consideration ("weekly/monthly... needs enough"). Given this platform's actual current state — a database schema only weeks old, Sprint 16-18 being the first several sprints to produce any `DecisionTrace` history at all — the realistic near-term graded-outcome volume will be very small. A "monthly" cadence with no explicit minimum-n gate could trivially run its first recalibration cycle on a handful of observations and still "pass" a backtest that isn't genuinely out-of-sample (§3), producing a false sense of a working learning loop at exactly the moment it is most fragile.
- **No treatment of non-independence.** Standard sample-size/significance reasoning assumes roughly independent observations. Recommendations are not independent: many will share the same symbol, sector, or macro regime, and will be graded over overlapping time windows. Naively treating N graded recommendations as N independent statistical trials will systematically overstate confidence in a recalibration proposal. This "effective sample size" problem is a specific, well-known statistical failure mode that the design does not mention at all.

**Verdict: not yet — the intent to be statistically meaningful is stated, but the actual methodology (calibration curves/Brier score, minimum-sample gating, correction for correlated/non-independent observations) is absent. This is the single most important thing to lock before implementation, because it is the property the engine's institutional credibility (§9) depends on most directly.**

---

## 7. Is attribution fair?

- **Good instinct:** "a decomposition step, not a black box" is the right goal — attribution should explain, not just score. But the *method* of decomposition is unspecified beyond "walks back through... to attribute the grade's variance to specific inputs." The inputs feeding a recommendation are correlated by construction (the six `qualityComponents` are combined into one weighted sum; `sourceCredibility` and `evidenceFreshness` are plausibly correlated in practice, since higher-quality sources often also publish faster). Naively attributing "credit" to whichever input is more salient, without a decomposition method designed for correlated inputs (e.g., a Shapley-value-style or regression-coefficient-based approach), risks systematically over- or under-crediting specific evidence types for reasons that reflect correlation structure, not actual contribution. This is a legitimate, specific fairness concern, not a hypothetical one — it is the same problem feature-attribution methods in ML exist to solve, and the design does not commit to a method that solves it.
- **A specific, concrete fairness risk: the Committee's role.** Since Sprint 18A, `committeeDebate` is stored read-only inside `DecisionTrace` as sanitized explanatory context, and it structurally **never** contributes to the canonical action (the action comes only from the Recommendation Engine's own scoring). If Attribution's decomposition ever credits or blames committee debate content for an outcome it did not actually influence — simply because it co-occurred in the same trace — that conflates correlation with causal contribution for a component the platform has gone to considerable trouble (Sprint 18A) to keep advisory-only and structurally non-decisive. This boundary needs to be an explicit exclusion in Engine 4's design, not an assumption.
- **Volume fairness across sources.** Low-frequency sources (a niche outlet cited rarely) will accumulate very few graded attributions, making any credibility adjustment derived from them statistically unstable relative to high-volume, established sources. Without shrinkage toward a source-type baseline for low-volume sources, "fair" attribution across sources of very different citation frequency is not achievable as specified.

**Verdict: the goal (explainable, not black-box) is right; the actual decomposition method is unspecified in a way that leaves real, foreseeable fairness gaps — particularly around correlated inputs, the committee's explicitly non-decisive role, and low-volume sources.**

---

## 8. Are confidence updates justified?

- **Process-level justification is good:** updates are proposals, not silent mutations; every one is backtested first and requires human approval; the design explicitly defers the question of ever allowing "controlled automatic-apply" to a later, deliberate governance decision rather than assuming it. This is the responsible default.
- **Magnitude-level justification is not yet specified.** There is no stated guardrail against a small, noisy batch of graded outcomes producing a large swing in `QUALITY_WEIGHTS` or RIE's credibility weights — no maximum per-cycle step size, no regularization/shrinkage toward the current weights, nothing preventing a technically-passing-backtest proposal from being a large, destabilizing jump based on limited evidence. Given §6's finding that minimum-sample gating is not locked down either, this compounds: a small sample could both pass a (possibly in-sample, per §3) backtest and be allowed to swing a live weight by an arbitrary amount.
- **The right instinct is present at the Thesis level:** the design implies recalibration adjusts "how thesis confidence is computed going forward," i.e., the *methodology*, not a retroactive rewrite of an already-active thesis's current confidence using later information. That is the correct, safe design — but it is implied by wording, not stated as a locked invariant, and should be made one explicitly, since getting this wrong would reintroduce exactly the hindsight-bias risk §4 otherwise avoids.

**Verdict: the process gating confidence updates is justified and appropriately conservative in spirit; the actual update rule's magnitude/regularization discipline is unspecified, which is the same underlying gap identified in §2 and §6, now surfacing as a concrete stability risk.**

---

## 9. Can institutions trust the methodology?

- **The governance skeleton is genuinely institutional-grade in shape:** append-only, versioned proposals with explicit `proposed`/`approved`/`applied`/`rejected` states; a required backtest before any change; human approval as the default gate; explicit refusal to silently mutate `DecisionTrace` or any other engine's live configuration; and a stated `ungradeable` category rather than silent exclusion when data is missing. An institutional model-risk/validation function would recognize this shape — it maps reasonably well to standard model-governance patterns (independent validation before deployment, ongoing monitoring, documented limitations, versioned methodology).
- **But an institutional validation team's first questions would be exactly the ones this review keeps surfacing, and none are yet answered:** What is the calibration methodology and its statistical basis (§6)? What is the out-of-sample/walk-forward discipline for the backtest harness, precisely (§3)? What is the minimum sample size and how is non-independence across correlated recommendations handled (§6)? What is the benchmark model and is it fixed ex-ante (§2)? How are delistings/failures/missing data handled without introducing survivorship bias (§10)? How is attribution decomposition performed in the presence of correlated inputs, and does it exclude components (like committee debate) that structurally cannot have influenced the outcome (§7)?
- None of these questions are unanswerable — they are exactly the kind of specification a Principal AI Scientist would expect to see locked in an architecture document before implementation, and their absence here is the review's central finding, not a minor gap.

**Verdict: the governance wrapper is trustworthy in spirit and already better than most early-stage platforms attempt; the statistical methodology inside that wrapper is not yet specified rigorously enough to survive institutional model-validation scrutiny as written. This is fixable at the architecture stage, and should be fixed there — before, not during, implementation.**

---

## 10. Which assumptions are dangerous?

Ranked by how much damage they could do if left unaddressed:

1. **That "enough accumulated grades to be statistically meaningful" will naturally happen without an enforced minimum-sample gate.** Given the platform's actual history (a database schema only weeks old), the realistic near-term risk is a recalibration cycle running on a handful of correlated observations and still nominally "passing" review. This is the single most dangerous assumption in the design, because it undermines every other safeguard downstream of it.
2. **That backtesting a proposal against "the existing graded-outcome history" is a valid, unbiased test**, when the same history may have been used to derive the proposal. Left unaddressed, this manufactures false confidence in every recalibration that ships, which is precisely the opposite of what a "trust but verify" governance wrapper is supposed to prevent.
3. **That `ungradeable` (missing/gapped realized price data) is a neutral category to exclude, rather than a signal to investigate.** Delisted-for-bankruptcy names are exactly the case most likely to produce "missing" data, and are also the worst possible outcome a recommendation could have produced. Silently treating them as neutral/excluded rather than as a realized near-total loss is a textbook survivorship-bias mechanism, and it would make the whole calibration loop systematically optimistic in exactly the way the design's own "risk-adjusted, not gameable" ambition (§2) is trying to avoid.
4. **That free-text time horizons are gradable as-is.** Left unresolved, different grading interpretations of "1-3 months" will silently produce non-comparable grades, and — worse — leaves room for the evaluation date to be chosen after the outcome is already visible, reintroducing the hindsight bias the immutability discipline elsewhere in the platform works hard to prevent (§4/§5).
5. **That attribution decomposition equals causal explanation.** Treated carelessly, this produces confidently-worded but potentially wrong recalibration narratives ("this source causes bad calls") that are really just correlated with a confound (market regime, sector, general volatility at the time) the design has no mechanism to control for. Over many cycles, acting on causally-unjustified attributions could steer the platform's weights in a wrong direction with an increasingly confident-sounding paper trail behind it — arguably a worse failure mode than doing nothing, because it would look like rigor while not being rigorous.
6. **That superseded/expired recommendations can be quietly left out of grading.** This creates a selection effect toward "easy," un-reversed calls, biasing the very sample the recalibration loop learns from.
7. **That endpoint return vs. benchmark is a sufficient grading target.** Ignoring realized risk/drawdown means the platform's own `riskLabel` claims are never actually checked against reality, even after this engine ships — a real gap given how central risk labeling is to the product's advisory value.

---

## Summary Table

| # | Question | Finding |
|---|---|---|
| 1 | Can it improve recommendations over time? | Plausible, not yet demonstrated — the loop's topology is right; the update rule and sample-size discipline that would make it actually work are unspecified. |
| 2 | Mathematically sound? | Directionally right (alpha vs. benchmark, not raw return) but missing a defined benchmark model, position-sizing weighting, and risk/drawdown validation. |
| 3 | Avoids data leakage? | Mostly, by inheritance from existing `DecisionTrace` immutability; the new backtest harness's train/holdout discipline is unspecified and is a real leakage risk as written. |
| 4 | Avoids hindsight bias? | Structurally strong (immutable trace, recorded invalidation); needs an explicit "horizon/benchmark fixed at creation" invariant to close the remaining gap. |
| 5 | Evaluation windows correct? | Not yet — free-text horizons aren't machine-gradable, and superseded/expired recommendations' grading rule is entirely unaddressed (a live selection-bias risk). |
| 6 | Calibration statistically meaningful? | Intent stated, methodology absent — no calibration-curve/Brier-score method, no minimum-sample gate, no correction for correlated observations. |
| 7 | Attribution fair? | Right goal (explainable, not black-box); decomposition method unspecified for correlated inputs, low-volume sources, and the committee's explicitly non-decisive role. |
| 8 | Confidence updates justified? | Process is appropriately conservative (proposal → backtest → human approval); update magnitude/regularization discipline is unspecified. |
| 9 | Can institutions trust it? | The governance shape, yes; the statistical rigor inside it, not yet as specified — fixable before implementation. |
| 10 | Dangerous assumptions? | Unenforced minimum-sample gating; in-sample backtest risk; survivorship bias via "ungradeable"; ungradeable free-text horizons; attribution-as-causation; superseded-recommendation selection bias; return-only (no risk/drawdown) grading. |

---

## Final Determination

**GO WITH CHANGES**

The Alpha Attribution Engine's governance architecture — immutable, read-only access to `DecisionTrace`; proposals rather than silent mutation; mandatory backtesting before any change; human approval as the default gate; explicit `ungradeable` handling rather than silent exclusion; versioned grading methodology — is genuinely sound and already better-designed than most early-stage platforms attempt at this stage. It should proceed.

It should not proceed, however, with its statistical methodology left as unspecified as it is today. Before implementation begins, lock the following as explicit architecture decisions, not implementation-time choices: (1) a defined, fixed-ex-ante benchmark/risk model; (2) a genuine walk-forward or train/holdout discipline for the backtest harness, not in-sample validation; (3) an enforced minimum-sample gate for any recalibration proposal, with an explicit correction for correlated/non-independent observations; (4) a real calibration methodology (reliability diagrams/Brier score, not just the word "calibration"); (5) a structured, machine-gradable time-horizon representation, fixed at creation, never chosen at grading time; (6) an explicit rule for grading superseded/expired recommendations at their original horizon rather than excluding them; (7) risk/drawdown-aware grading in addition to endpoint return; and (8) an explicit exclusion of the Investment Committee's debate content from causal attribution, consistent with its Sprint 18A-established advisory-only, non-decisive role. None of these require abandoning the design — all are refinements to a fundamentally sound skeleton — but shipping this engine without them would risk building a "learning loop" that looks rigorous, is trusted as rigorous, and is not.
