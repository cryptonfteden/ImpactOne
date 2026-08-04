# Unified Scoring Model — Overall Intelligence Score, Overall Confidence, and Adjustment Terms

**Phase:** UNIFIED-SCORING-RESEARCH-001. Pure research/design — no production code was written. Extends, rather than replaces, the real, shipped `computeOverallConfidence()`/`detectConflicts()` mechanism in `backend/services/agentOrchestrator/agentOrchestrator.js`, per the methodology chosen in `AGGREGATION_METHODOLOGY.md` (disclosed, rule-based, weighted-voting ensemble) and the canonical-direction taxonomy defined in `CONFLICT_RESOLUTION.md`. Bound by the same governance already enforced across every other agent this platform has (`canonicalVerdict.js`'s `FORBIDDEN_COMMITTEE_KEYS`): **every score below is a summary of evidence, never a verdict** — it must never itself set or override `Recommendation.action`, and must flow into `DecisionTrace.evidenceReferences`/the Claim Layer as evidence, exactly like every individual agent's own output already does.

---

## 1. Overall Confidence

**What it measures:** how much to trust the *quality and completeness* of the underlying agent reports, independent of whether they happen to agree with each other in direction.

```
OverallConfidence = clamp(
    weightedMeanConfidence * coverageRatioFactor
  , 0, 100)

weightedMeanConfidence = Σ(agent.confidence * agent.priority * agent.freshnessDecay) / Σ(agent.priority * agent.freshnessDecay)
                          — over agents with status === "fulfilled" only

coverageRatioFactor = clamp(0.5 + 0.5 * (fulfilledCount / totalRegisteredCount), 0, 1)
```

- **`weightedMeanConfidence`** is the real, already-shipped `computeOverallConfidence()` formula, with one addition: a **`freshnessDecay`** multiplier per agent (§5) that did not exist in the original. This is an additive, backward-compatible extension, not a redesign — with `freshnessDecay = 1` for every agent (the implicit assumption of the current shipped code), this formula reduces exactly to today's real behavior.
- **`coverageRatioFactor`** is new and directly addresses §6's missing-data/coverage requirement: a report where only 3 of 13 registered agents actually fulfilled should never present with the *same* confidence ceiling as one where 10 of 13 fulfilled, even if the 3 that did fulfill were individually very confident. The `0.5 + 0.5×ratio` shape means a report can never fall below half credit purely from low coverage (a handful of genuinely strong, relevant signals is still worth something) but also can never reach full credit without broad participation across the registry — a disclosed, hand-set shape, not fitted, consistent with this platform's established convention.
- **Explicit, disclosed limitation, stated directly rather than silently assumed:** per `AGGREGATION_METHODOLOGY.md` §6, not every agent's `confidence()` measures the same underlying concept even on the same 0-100 scale (Valuation's confidence reflects data-completeness/method-agreement; Options' reflects classification-strength/OI-confirmation). `OverallConfidence` is therefore best understood as **"the average, coverage-and-freshness-adjusted trust across a genuinely heterogeneous set of confidence definitions,"** not a single, unified, apples-to-apples statistical quantity — this caveat should be shown alongside the score, not hidden.

---

## 2. Overall Intelligence Score

**What it measures:** the composite, agreement/conflict-aware headline number — the single most important new addition of this research, since `computeOverallConfidence()` today (per `CONFLICT_RESOLUTION.md` §4's direct finding) **never accounts for whether agents agree or disagree at all.**

```
OverallIntelligenceScore = clamp(
    OverallConfidence + AgreementBonus - ConflictPenalty
  , 0, 100)
```

- **Deliberately built as an adjustment on top of `OverallConfidence`, not an independently-computed number** — this guarantees the two scores are always mutually consistent and traceable to each other (an `OverallIntelligenceScore` can always be explained as "OverallConfidence, then adjusted for X points of agreement and Y points of conflict"), matching `decisionTraceExplainabilityService.js`'s own full-traceability precedent.
- **This is the score a user reads first**, but — per `CONFLICT_RESOLUTION.md` §4's explicit requirement — it must **never** be shown without the itemized conflict list and the coverage/freshness breakdown immediately available alongside it. A single number, however well-constructed, cannot substitute for the real, itemized evidence beneath it.
- **Never a directional/action signal** — this score answers "how much well-supported, mutually-corroborating intelligence exists for this symbol right now," not "should I buy or sell." A high `OverallIntelligenceScore` built from unanimous *bearish* agreement is just as high as one built from unanimous *bullish* agreement — direction lives in a separate, explicit field (the canonical-taxonomy-derived net lean, reported alongside, per `CONFLICT_RESOLUTION.md` §2), never folded into this magnitude-only score. This mirrors the same magnitude-vs-direction separation already established for the Algorithmic Activity Score vs. `ExecutionPressure` (`ALGORITHMIC_ACTIVITY_SCORING.md` §1.4) and the Claim Layer's confidence-vs-probability separation.

---

## 3. Conflict Penalty

**What it measures:** how much the headline score should be reduced because independently-reasoning, meaningfully-confident agents genuinely disagree — using the canonical direction taxonomy from `CONFLICT_RESOLUTION.md` §2, never raw, unnormalized direction strings.

```
ConflictPenalty = clamp(
    Σ over each genuine conflicting pair (i, j) of:
        min(agent_i.confidence, agent_j.confidence)
        * priorityWeight(i, j)
        * CONFLICT_SEVERITY_CONSTANT   (proposed: 0.15, disclosed, hand-set)
  , 0, MAX_CONFLICT_PENALTY)            (proposed cap: 30 points)
```

- **`min(confidence_i, confidence_j)`, not an average or the max** — a conflict where one agent is highly confident and the other barely registers any confidence at all should weigh much less than a conflict between two agents that are *both* genuinely confident; using the minimum of the pair directly encodes "this disagreement is only as serious as its weaker-but-still-disagreeing party," a disclosed, defensible, hand-set choice.
- **`priorityWeight(i, j)`**: the same static, disclosed per-agent `priority` values the real orchestrator already assigns (per `registry.js`) — reused directly, not reinvented, so a conflict between two low-priority agents contributes less penalty than one between two high-priority agents, consistent with how priority already governs ranking (`rankByConfidence()`) and the base confidence weighting (§1) elsewhere in the same system.
- **`MAX_CONFLICT_PENALTY` cap (proposed: 30 points)**: disagreement is *informative*, not *disqualifying* — even a report with several genuine, serious internal conflicts should never be driven all the way to 0, since the existence of real disagreement between independent, well-reasoned agents is itself a meaningful, non-catastrophic fact about a stock (many genuinely interesting, actionable situations feature real disagreement between valuation and momentum, for instance) — capping the penalty keeps this in proportion, rather than letting internal disagreement alone zero out an otherwise well-supported report.
- **Explicitly excludes `NOT_DIRECTIONAL` signals** (Sentiment's rate-of-change axis, per `CONFLICT_RESOLUTION.md` §2.2/§3) from the conflict-pair enumeration entirely — these should never contribute to `ConflictPenalty` at all, on their own separate axis instead.

---

## 4. Agreement Bonus

**What it measures:** how much the headline score should be increased because independently-reasoning, meaningfully-confident agents genuinely corroborate one another — the deliberately symmetric counterpart to §3, with one critical asymmetry: an explicit **independence discount**.

```
AgreementBonus = clamp(
    Σ over each genuine agreeing pair (i, j) of:
        min(agent_i.confidence, agent_j.confidence)
        * priorityWeight(i, j)
        * independenceFactor(i, j)
        * AGREEMENT_REWARD_CONSTANT   (proposed: 0.10, disclosed, hand-set —
                                        deliberately smaller than
                                        CONFLICT_SEVERITY_CONSTANT: this
                                        research recommends disagreement be
                                        weighted somewhat MORE heavily than
                                        agreement, since surfacing real
                                        disagreement is this document's own
                                        central priority per the mission's
                                        explicit framing, and an
                                        under-cautious Agreement Bonus is a
                                        smaller risk than an
                                        over-confident, un-penalized
                                        Conflict blind spot)
  , 0, MAX_AGREEMENT_BONUS)             (proposed cap: 15 points — deliberately
                                          smaller than MAX_CONFLICT_PENALTY,
                                          for the same reason above)
```

- **`independenceFactor(i, j)` — the Bayesian-inspired addition recommended in `AGGREGATION_METHODOLOGY.md` §7**: a disclosed, hand-set value in `[0, 1]` reflecting how independent two agents' underlying data sources genuinely are. Proposed starting values (to be revisited once a formal data-lineage registry exists, explicitly flagged as a future refinement, not required for MVP):

| Agent pair | Proposed `independenceFactor` | Rationale |
|---|---|---|
| Technical + Options | 0.7 | Both ultimately reference the same underlying price tape at some level, but Options' distinct data (contracts, OI, sweeps) gives real incremental independence — not fully independent, not fully redundant |
| Technical + Valuation | 1.0 | Genuinely independent data (price/volume technicals vs. fundamentals/financial statements) |
| Technical + Sentiment | 1.0 | Genuinely independent (price technicals vs. social/news sentiment) |
| Options + Valuation | 1.0 | Genuinely independent |
| Options + Earnings | 0.8 | Both can be influenced by the same anticipated earnings event, a modest real correlation |
| Valuation + Earnings | 0.6 | Earnings guidance changes directly feed forward-looking valuation inputs (e.g., forward P/E) — a real, disclosed, meaningful data dependency, not full independence |
| Any pair not listed | 1.0 (default: assume independence unless a specific, disclosed reason exists to discount it) | Consistent with this platform's own "never assume a discount without a stated, real reason" discipline |

- **Why this matters concretely:** two genuinely independent agents agreeing is real corroborating evidence; two agents that share a meaningful data dependency agreeing is *partially* just the same underlying fact showing up twice under two different names — rewarding both cases identically would systematically over-credit correlated agreement, exactly the Bayesian evidence-double-counting risk this whole section exists to avoid, and exactly the same failure mode the Claim Layer's `MAX_SINGLE_EVIDENCE_WEIGHT` dominance cap already guards against one layer below.

---

## 5. Signal Freshness

**What it measures:** how much an agent's own contribution to `OverallConfidence`/`OverallIntelligenceScore` should be discounted if its report is stale relative to that *specific agent's own* expected validity window — not a single global staleness threshold applied uniformly to every agent.

```
freshnessDecay(agent) = clamp(
    1 - (ageMs(agent.generatedAt) / agent.expectedValidityWindowMs)
  , MINIMUM_FRESHNESS_FLOOR, 1)          (proposed floor: 0.3 — a stale
                                           report still contributes SOME
                                           weight, since a somewhat-old
                                           fundamentals report is still
                                           more informative than none at
                                           all, but never at full weight)
```

- **`expectedValidityWindowMs` is genuinely different per agent category, disclosed explicitly rather than defaulted to one constant:**

| Agent category | Proposed expected validity window | Rationale |
|---|---|---|
| Options (sweep/block detection) | Minutes (proposed: 15-30 min) | Per `OPTIONS_SCORING_MODEL.md` §5.1 — a sweep's whole signal value is time-sensitive; the same "sweep freshness is existential" principle applies here one level up |
| Technical (moving averages, RSI, etc.) | Hours to 1 trading day | Slower-moving by construction; a same-day technical read remains largely valid intraday |
| Sentiment | Hours (proposed: 4-8 hrs) | Social/news sentiment can shift meaningfully within a trading day, but not as fast as options flow |
| Valuation | Days to weeks (proposed: 7 days) | Fundamentals/fair-value estimates change slowly — a valuation computed yesterday is still highly relevant today, per `VALUATION_SCORING_MODEL.md`'s own emphasis on slow-moving sector-peer statistics |
| Earnings | Until the next earnings event (proposed: up to 90 days, or until superseded by a new report) | A guidance-direction read remains valid for a full quarter in the ordinary case |

- **This directly reuses the "per-signal, not per-engine, freshness requirement" principle already established in `OPTIONS_SCORING_MODEL.md` §5.1 and `ALGORITHMIC_ACTIVITY_SCORING.md`'s data-tier freshness table** — applied here one level higher, across agent *categories* rather than within one agent's own internal detectors.

---

## 6. Missing-data handling

Extends the real, already-shipped `run()` output's `summary: { total, fulfilled, unavailable, failed }` counts (confirmed real via direct source read) from a purely informational side-note into an active input to the scoring formulas above:

1. **`unavailable` agents (an honest stub, e.g. Short Interest, Insider — not yet real) contribute nothing to any formula and are excluded from every denominator** — this is already the real, correct behavior today (`fulfilled` filtering); this research recommends explicitly preserving it, not changing it.
2. **`failed` agents (a real agent that timed out or errored on this specific request) are treated identically to `unavailable` for scoring purposes (excluded, not penalized)** — a transient failure for one request should not itself lower confidence in the *other* agents' real results; but the `failed` count must still be surfaced prominently in the report (already real today) so a user can distinguish "this agent doesn't exist yet" from "this agent exists but had a bad request this time," an important, real operational distinction `PRODUCTION_READINESS_REVIEW.md` already flagged as under-surfaced elsewhere in this platform.
3. **`coverageRatio = fulfilledCount / totalRegisteredCount`** (§1's `coverageRatioFactor`) is the one place missing data actively *shapes* the headline score, rather than merely being reported alongside it — a deliberate, disclosed design choice: a report built from a small fraction of the registry should structurally be unable to reach the same confidence ceiling as one built from most of it, **even if** every agent that did run was itself highly confident, since narrow coverage is itself a real form of uncertainty about the whole picture (a well-established idea in forecasting/ensemble literature — an ensemble's reliability depends on genuinely sampling its available members, not just on how confident the few members that did respond happen to be).
4. **A specific, disclosed non-goal:** this research does **not** recommend treating a `failed`/`unavailable` agent's *absence* as itself a bearish or bullish directional signal (e.g., "the Options Agent is unavailable, therefore assume bearish") — this would fabricate a directional inference from a data gap, directly violating this platform's own "never fabricate from absence" discipline (the same principle behind the Impact Graph's "the chain is genuinely unknown, not fabricated" honest-empty-state precedent). Missing data reduces the `coverageRatioFactor`'s contribution to confidence — it never contributes a phantom direction.

---

## 7. Summary formula, assembled end to end

```
1. For each agent: compute freshnessDecay(agent)                          [§5]
2. weightedMeanConfidence = priority+freshness-weighted mean confidence    [§1]
   over fulfilled agents only                                             [§6]
3. coverageRatioFactor = 0.5 + 0.5 * (fulfilled / totalRegistered)         [§1, §6]
4. OverallConfidence = clamp(weightedMeanConfidence * coverageRatioFactor, 0, 100)
5. Normalize every fulfilled, directional agent's own direction value
   onto the canonical BULLISH/BEARISH/NEUTRAL/NOT_DIRECTIONAL taxonomy    [CONFLICT_RESOLUTION.md §2]
6. Enumerate genuine conflicting pairs (opposing canonical directions)
   and genuine agreeing pairs (matching canonical directions),
   excluding NOT_DIRECTIONAL agents from both enumerations                [CONFLICT_RESOLUTION.md §3]
7. ConflictPenalty = capped, confidence-and-priority-weighted sum
   over conflicting pairs                                                 [§3]
8. AgreementBonus = capped, confidence-and-priority-and-independence-
   weighted sum over agreeing pairs                                       [§4]
9. OverallIntelligenceScore = clamp(OverallConfidence + AgreementBonus
   - ConflictPenalty, 0, 100)                                             [§2]
10. Report ALL of: OverallIntelligenceScore, OverallConfidence,
    ConflictPenalty, AgreementBonus, the full itemized (canonically-
    normalized) conflict list, the full agreement list, per-agent
    freshnessDecay, and the coverage summary (fulfilled/unavailable/
    failed/total) — together, never the headline score alone             [CONFLICT_RESOLUTION.md §4]
```

No code was written to implement any of the above — this document, together with `AGGREGATION_METHODOLOGY.md` and `CONFLICT_RESOLUTION.md`, is the design/decision record for whenever a real implementation phase begins, following the same "architecture → research → build" sequencing already proven for this platform's other new agent and scoring-model work.
