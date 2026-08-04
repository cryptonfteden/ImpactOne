# Adaptive Safety Policy

**Sprint 43 — Architecture and research only. Defines the guardrails, shadow-mode design, explainability requirements, and failure-mode threat model that any future adaptive mechanism must satisfy before touching production. Nothing here is implemented.**

## 8. Safety Guardrails

Every guardrail below is a hard precondition, not a tuning knob. An adaptive mechanism that cannot satisfy one of these does not ship, regardless of how good its backtested numbers look.

| Guardrail | Definition | Rationale |
|---|---|---|
| **Minimum sample size** | No adaptive value may be computed (even for shadow display) from fewer than a set floor of *independent* observations (post-clustering per `LEARNING_DATA_CONTRACT.md` §3's correlated-recommendation handling) — recommend 30 as an absolute floor before any number is shown at all, with a explicit "statistically weak" label up to a higher threshold (e.g. 100) before a value is eligible for any weight-proposal. | Mirrors this codebase's existing convention (Sprint 42 scorecards already report `sampleSize`; this guardrail is the step of actually *gating* on it, not just reporting it). |
| **Maximum weight change per period** | Any single adaptation cycle may move a bounded parameter by no more than a fixed cap (e.g. ±10% of its current value, or ±0.05 in absolute terms for a [0,1]-bounded weight) — never a jump straight to the "optimal" value implied by the latest data. | Prevents a single noisy period (or a small burst of correlated observations) from swinging a live-adjacent parameter. |
| **Minimum and maximum weights** | Every adaptive parameter has a hard floor and ceiling (e.g. a per-member contribution weight bounded to `[0.5x, 2x]` its baseline) fixed at design time, not learned. | No committee member can ever be adaptively silenced (floor > 0) or allowed to dominate (ceiling bounded) — directly protects against "one member dominating" (§13) and preserves the "committee never votes/never blends" invariant from `LEARNING_ARCHITECTURE.md` §2.A. |
| **Cooldown periods** | After any adaptation event (even a shadow-mode one), a minimum elapsed time or minimum new-observation count must pass before the same parameter is eligible for another proposed change. | Prevents oscillation (§13) and gives enough time for the *effect* of a change to actually show up in new outcomes before reacting to it again. |
| **Drawdown-based freezing** | If the portfolio-level or recommendation-cohort-level realized performance (already measurable via Sprint 42's Performance Engine) crosses a defined adverse threshold, all pending adaptation proposals are automatically frozen (not rolled back — just prevented from advancing) until a human reviews. | An adaptive system should get *more* conservative, automatically, exactly when things are going wrong — the opposite of when a naive learner would be tempted to change fastest. |
| **Automatic rollback** | Every adaptive value carries a `rollbackReference` (§10) to its immediately-prior effective value. Any value that triggers a drawdown-freeze or fails a post-promotion monitoring check (§14, D5/D6 exit criteria) is automatically reverted to that prior value — not to some default, to the specific last-known-good value. | Rollback must be mechanical and immediate, not dependent on a human noticing in time. |
| **Shadow mode** | See §9 below — the mandatory first home for every adaptive mechanism. | |
| **Champion/challenger comparison** | Any proposed parameter set ("challenger") is only ever compared against the currently-live parameter set ("champion") on the *same* set of forward observations, never on the historical data used to derive the challenger. | Directly enforces `PHASE_D_ROADMAP.md` §12's forbidding of random train/test splitting — a challenger must prove itself on genuinely new data. |
| **Kill switch** | A single, explicit, human-operated control that disables *all* adaptive influence system-wide (reverting every parameter to its permanently-fixed or last-human-approved value) — independent of and faster than any per-parameter rollback. | Every automated system needs one manual override that doesn't depend on any of the automation working correctly. |
| **Human approval thresholds** | Any parameter move large enough to matter (defined per-parameter, but never zero) requires an explicit human approval action before promotion from shadow/challenger to live-adjacent, logged as part of the Learning Decision Record (§10). | Directly implements the mission's "first implementation must never immediately control real recommendations" and this codebase's own Phase D5/D6 staging. |

---

## 9. Shadow Learning

### 9.1 Design

Shadow Mode is a parallel, non-influential execution path: every time the live pipeline produces a real recommendation (via the unchanged, deterministic path documented in `LEARNING_ARCHITECTURE.md` §1), a **separate, isolated** computation runs the *same* evidence matrix through a *shadow* parameter set (the current challenger weights) and records what it *would have* recommended — without that output ever being written to `Recommendation`, ever being visible in any user-facing UI, and ever being read by any code path that feeds back into the live engine. Structurally, this must be enforced the same way Sprint 38's committee members are forbidden from importing `evidenceMatrixService`/providers directly — a safety test asserting the shadow computation's output is never `require()`d by `autonomousRecommendationEngine.js` or any controller reachable from a public route.

```
Live path (unchanged):
  Evidence Matrix → Committee (fixed weights) → CIO → Recommendation → DecisionTrace

Shadow path (new, isolated, read-only from the live path's inputs):
  (same Evidence Matrix, same DecisionTrace's inputEvidence)
      → Shadow Committee/Scoring (challenger weights)
      → Shadow Decision (persisted separately — a new, clearly-labeled
        table, never Recommendation/DecisionTrace)
```

### 9.2 Comparison

Once the *live* recommendation's real outcome is graded (existing `outcomeGradingService`), the same real outcome is used to grade the *shadow* decision too — comparing:

- **Live decision** (real, actually shown to a user) vs.
- **Shadow adaptive decision** (hypothetical, same evidence, challenger weights) vs.
- **Actual outcome** (one real number, shared by both)

This produces a genuine champion/challenger record without the challenger ever having been live — exactly the guardrail in §8.

### 9.3 Promotion criteria (shadow → limited production)

All of the following, not any subset, before any challenger weight set may move beyond shadow:

1. Minimum sample size met (§8) on *shadow* observations specifically — not inherited from whatever data justified the initial proposal.
2. Statistically significant outperformance of champion by challenger, evaluated only on forward (post-proposal) shadow observations, using the walk-forward methodology in `PHASE_D_ROADMAP.md` §12 — never the historical data that motivated the proposal in the first place.
3. No drawdown-freeze trigger active (§8) during the evaluation window.
4. Regime-separated performance (`LEARNING_ARCHITECTURE.md` §3) checked independently — a challenger that only wins in one regime is not promoted as a general replacement; it may instead be proposed as a regime-conditioned override, itself subject to the same full process.
5. Explicit human review and approval of the full Learning Decision Record (§10) for this proposal.
6. Even after all of the above, promotion is to **D5 (human-approved limited adaptation)**, never directly to full automation — see `PHASE_D_ROADMAP.md` §14.

---

## 10. Explainability and Auditability — the Learning Decision Record

Every proposed adaptive change must produce one **immutable Learning Decision Record**, following this codebase's existing immutability convention (DecisionTrace, WorldMemory*, Outcome — all create-only). It must answer:

| Question | Field |
|---|---|
| What changed? | `parameter`, `previousValue`, `proposedValue` |
| Why did it change? | `reason` (structured, not free text alone — e.g. `{ metric: "confidenceCalibration", delta: +8.2, direction: "improvement" }`) |
| Which outcomes caused it? | `supportingObservationIds` — an explicit list of the exact Learning Observation ids (§`LEARNING_DATA_CONTRACT.md` §1) behind the proposal, not just a count |
| In which market regime? | `regimeScope` — a specific regime tag, or explicitly `"ALL_REGIMES"` if genuinely regime-agnostic |
| Over what period? | `observationWindowStart`, `observationWindowEnd` |
| How statistically reliable is it? | `confidenceInterval`, `sampleSize`, `effectiveSampleSize` (post-clustering, per `LEARNING_DATA_CONTRACT.md` §3) |
| What would reverse the change? | `rollbackTrigger` — the specific condition (e.g. "challenger underperforms champion by X over Y forward observations") that would trigger automatic rollback |
| Can the previous state be reproduced? | `rollbackReference` (points to the prior Learning Decision Record or the permanently-fixed baseline) + `versionSnapshot` (§11) |

Additional required fields not phrased as a question above but implied by the mission: `maximumPermittedChange` (the §8 cap actually applied), `version` (this record's own sequence number for the parameter it concerns), `timestamp`, `status` (`PROPOSED | SHADOW | CHALLENGER | HUMAN_REVIEW | APPROVED | LIVE | ROLLED_BACK | REJECTED`), and `approvedBy` (once human-approved).

This record is the single artifact a future `/v2/quality-platform`-style internal API would expose for audit — read-only, exactly like every other internal quality endpoint Sprint 42 already shipped.

---

## 13. Failure Modes — Threat Model

For each failure mode: detection, prevention, recovery.

| Failure mode | Detection | Prevention | Recovery |
|---|---|---|---|
| **Overfitting recent winners** | Compare challenger's in-sample (proposal-justifying) performance against its true forward (shadow) performance — a large gap is the signature. | Promotion criteria (§9.3) require forward-only evaluation; walk-forward validation only (`PHASE_D_ROADMAP.md` §12). | Automatic rollback via §8; the champion (prior state) was never replaced, so recovery is simply "the challenger doesn't get promoted." |
| **Chasing short-term momentum** | Check whether proposed changes correlate with very recent (e.g. last 5-10) observations disproportionately vs. the full window. | Minimum sample size + minimum observation-window length (not just count) required before any proposal; cooldown periods (§8) bound how often a parameter can react at all. | Rollback + cooldown extension for that parameter. |
| **Collapsing committee diversity** | Monitor the distribution of committee members' realized influence (via contribution-score-style tracking, Sprint 42) over time — a shrinking effective number of "voices" is the signature. | Minimum weight floor per member (§8) — structurally impossible for any member's influence to reach zero. | Kill switch or targeted rollback of the specific member-weighting mechanism; floor guardrail limits maximum damage even before rollback. |
| **One member dominating** | Same distribution monitoring as above, opposite tail — one member's effective weight approaching the ceiling. | Maximum weight ceiling per member (§8). | Same as above. |
| **Reinforcing bad market data** | Cross-reference adaptation proposals against known data-quality exclusion events (`LEARNING_DATA_CONTRACT.md` §1.3 exclusion log) — a proposal substantially justified by since-excluded observations is a red flag. | Exclusion logging is mandatory (not optional) precisely so this cross-reference is possible; Learning Decision Records must list explicit supporting observation ids (§10), making post-hoc audit possible. | Reject or roll back the specific proposal; investigate the upstream data-quality issue itself (out of this document's scope — a provider-reliability concern, explicitly deferred per `LEARNING_ARCHITECTURE.md` §2.D). |
| **Learning from accidental luck** | Confidence intervals (§10) wide relative to the proposed effect size — the statistical-reliability field exists exactly to make this visible rather than hidden behind a point estimate. | Human approval gate (§8) requires a person to actually look at the interval, not just the headline number; minimum sample size floor. | Reject the proposal at human review; no live state to roll back if it never left shadow. |
| **Weight oscillation** | Track the sign of consecutive changes to the same parameter — repeated up/down/up/down is the signature. | Cooldown periods + maximum change per period (§8) both directly bound oscillation amplitude and frequency. | Extend cooldown for the specific oscillating parameter; consider freezing it as human-configurable-only (demoting it out of category C in `LEARNING_ARCHITECTURE.md` §2) if oscillation persists. |
| **Data poisoning** (a corrupted or adversarial evidence source skewing observations) | Cross-reference proposals against provider-availability bias detection (`LEARNING_DATA_CONTRACT.md` §3) — an unusual concentration of supporting evidence from one provider/category is a signature, especially combined with an unusual outcome pattern. | This design deliberately keeps provider reliability out of any automatic influence path (`LEARNING_ARCHITECTURE.md` §2.D) — poisoning one provider cannot silently reweight the system's trust in it, because no such automatic mechanism exists at all in this design. | Manual investigation and exclusion (§`LEARNING_DATA_CONTRACT.md` §1.3); this is fundamentally a data-quality incident-response process, not an algorithmic one. |
| **Sparse-data confidence** (a metric reported with unwarranted apparent precision from a tiny sample) | Sample-size gate (§8) is the direct detector — anything below floor never gets a value shown at all, not even a wide-interval one. | Same. | N/A — prevention is complete if the gate is correctly enforced; if a bug lets a sparse metric through, treat as a code defect, fix, and retroactively flag any decisions influenced by it. |
| **Benchmark gaming** (a proposal that looks good only because of how/when the benchmark is measured) | Compare proposed-change justification across multiple benchmark choices (SPY vs. sector ETF vs. absolute return) — a proposal that only "wins" under one benchmark framing is suspect. | Learning Decision Records must report performance against the *same* benchmark fields already stored on `Outcome` (§`LEARNING_DATA_CONTRACT.md` §1.1) — never a benchmark chosen after the fact to flatter a specific proposal. | Reject at human review; require re-justification against the standard, pre-registered benchmark set. |

---

## Cross-references

- Pipeline audit, learning boundary, market regimes, adaptation model comparison: `LEARNING_ARCHITECTURE.md`
- Learning unit definition, temporal integrity, bias controls: `LEARNING_DATA_CONTRACT.md`
- Versioning, validation framework, staged rollout: `PHASE_D_ROADMAP.md`
- Executive summary and explicit go/no-go recommendation: `SPRINT_43_REPORT.md`
