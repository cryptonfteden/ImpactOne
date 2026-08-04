# Unified Confidence Architecture

**Phase:** CONFIDENCE-UNIFICATION-001. Documentation only — no production code was modified. Direct continuation of `POST_MVP_ARCHITECTURE.md` §4-§5's finding (13 independently-implemented confidence formulas) and `NEXT_GEN_ARCHITECTURE.md` §3's recommendation. Grounded in a fresh direct read of 6 real `confidenceModel.js` files (Institutional, Macro, Insider, ETF Flow, Analyst Consensus, plus this session's confirmation that a 14th agent — News — has now landed for real, `NEWS-AGENT-001`, confirmed via `git log`) and `claimConfidence.js`'s real dominance-cap algorithm.

---

## 0. A crucial, previously-undocumented precedent this design must reconcile with

Direct source read of `claimConfidence.js` reveals an **explicit, deliberate, already-stated architectural decision** this unification effort must not silently override: its `capAndRedistributeWeights()` function's own comment states it is *"identical algorithm to `marketSentimentRollup.capAndRedistributeWeights`, **reimplemented here (not imported)** so this engine-specific module stays self-contained, matching the precedent that **each engine owns its own weighting logic**."*

This means the duplication `POST_MVP_ARCHITECTURE.md` found is not purely an oversight — at least one prior engineering decision explicitly chose duplication-for-independence over shared-code-for-consistency. **This design does not overturn that precedent.** It proposes a narrower, compatible middle path: share the **proven algorithm** (a generic, well-tested utility function with no domain-specific assumptions baked in) while leaving each agent free to own its **own choice of components, weights, and domain-specific bonuses/penalties** — "self-contained" is preserved at the level of *what a confidence formula measures*; only the *mechanical primitives* (capping/redistributing, clamping, additive composition) become shared.

---

## 1. Review of existing confidence models

Direct source read of 5 real `confidenceModel.js` files (one per domain agent, all in `backend/services/domainAgents/<agent>/confidenceModel.js`) reveals a **striking, already-organically-converged pattern** — despite zero shared code, the agents largely agree in spirit on how confidence should be shaped:

| Agent | Base (availability gate) | Bonus components | Structural penalty | Shape |
|---|---|---|---|---|
| Institutional | 30 | coverage (≤25), comparable-quarter (≤20), conviction (≤15) | 10 (fixed, curated-cohort scope) | additive, capped bonuses |
| Insider | 30 | sample size (≤25), filings fetched (≤15), cluster corroboration (15, binary), recency (≤15, tiered) | none | additive, capped bonuses |
| ETF Flow | 30 | directness (20 or 10), sample size (≤20), persistence (≤15, tiered) | 10 (fixed, structurally-unavailable dimensions) | additive, capped bonuses |
| Analyst Consensus | 30 | multi-period history (25, binary), coverage depth (≤25, tiered) | 20 (fixed, missing price-target scope) | additive, capped bonuses |
| **Macro (the outlier)** | *(none)* | pure data-source-availability weighting: FRED series (70 of 100) + market proxies (30 of 100) | none | proportional-availability, no base/bonus shape at all |

**The convergent pattern, present in 4 of 5 agents reviewed** (every one except Macro): (1) a hard `dataAvailable: false → confidence: 0` gate, never a fabricated partial value; (2) a fixed base score (~30 points) awarded once real data exists at all; (3) one or more bonus components, each independently capped, each scaled by a real 0-1 adequacy ratio (`Math.min(x, cap) / cap * MAX_BONUS`); (4) an optional, disclosed, fixed structural penalty for a *permanent* known scope limitation (never a temporary data-quality issue); (5) a final `Math.max(0, Math.min(100, ...))` clamp; (6) a returned `components` breakdown object for transparency, not just the bare number. Every one of these 5 files' own header comments independently states some variant of *"a disclosed, hand-set weighted formula (never a naive average)"* — near-verbatim across agents built by different phases, strongly suggesting this pattern was each time either directly copied from the nearest precedent or independently re-derived because it is simply the natural honest shape for this problem.

**Macro is a genuine, disclosed exception**, and appropriately so — its underlying question ("how much of my 11 real data sources are actually available") is structurally a coverage-ratio question, not an availability-gate-plus-bonuses question. This confirms the shared contract below must **not** force every agent into one rigid formula shape; it must support both patterns as first-class, equally-valid instantiations of the same underlying contract.

## 2. Shared evidence weighting

Every reviewed agent already weights its own "evidence" (data-availability signals, sample counts, corroboration flags) by hand-set, disclosed proportions — but no agent's weights are validated against, or even aware of, any other agent's. There is currently no mechanism preventing two agents from silently disagreeing about how much weight "sample size" deserves relative to "recency" for conceptually similar signals (Insider's recency bonus and ETF Flow's sample bonus, for instance, both cap at very different fractions of total confidence). This is not itself a defect — different domains legitimately warrant different weights — but it means there is no **shared vocabulary** for describing *why* one agent's confidence formula emphasizes recency over sample size while another does the reverse.

## 3. Dominance caps

**Only the Claim Intelligence Layer and the Market Sentiment Engine currently implement a real dominance cap** (`MAX_SINGLE_EVIDENCE_WEIGHT`, `capAndRedistributeWeights()`) — confirmed, via the direct source read in §0, to be two independent, deliberately-duplicated implementations of the identical algorithm. **None of the 5 domain-agent `confidenceModel.js` files reviewed this session implement any dominance-cap concept at all** — each simply sums independently-capped bonus components; there is no mechanism preventing, say, Institutional's `conviction` bonus (≤15 of a max ~90-100 total) from structurally dominating if a future revision widened its cap without a corresponding redistribution safeguard. This is a real, currently-latent gap: not yet exploited by any of the 5 examples reviewed (their per-component caps are all individually modest), but not structurally guarded against either, unlike the Claim Layer and Sentiment Engine, which both explicitly guard against exactly this.

## 4. Freshness weighting

Freshness appears in the reviewed agents only as one *ad hoc* bonus among several (Insider's tiered recency bonus: 15 points ≤30 days, 8 points ≤90 days, 0 beyond), never as its own separately-named, reusable dimension the way `scoringVocabulary.js`'s own `evidenceFreshness` entry already formalizes for the Recommendation Engine (`autonomousMarketService.recencyScore()`, real, tested, reused). **This is a concrete, low-risk unification opportunity**: `recencyScore()` already exists, is already tested, and already expresses the exact same "decay from 100 at 6h down to a floor by 168h" concept every agent's own ad hoc recency logic is trying to approximate independently.

## 5. Source quality weighting

None of the 5 reviewed domain agents currently have an explicit "source quality" component distinct from raw data availability — this is a genuine, disclosed absence, not a duplication, since none of them yet consume the already-real, already-tested `autonomousMarketService.sourceQualityScore()` (the same function `scoringVocabulary.js`'s `sourceCredibility` entry already documents and the Recommendation Engine already uses). As multi-vendor cross-checks are added to any of these agents (e.g., Analyst Consensus's own disclosed future path to a second real ratings vendor, per this engagement's own prior research), a shared source-quality weighting becomes directly relevant and should reuse this already-real function rather than each agent inventing its own.

## 6. Data completeness

Handled consistently, if independently, across every agent reviewed via the `dataAvailable` gate and per-component sample/coverage ratios — this is the single most consistently-implemented dimension across all 5 examples, and the design below preserves this pattern exactly rather than changing it.

## 7. Missing-data handling

**Consistently excellent across every agent reviewed, and the single strongest positive finding of this whole review**: every one of the 5 `confidenceModel.js` files reviewed returns `{ confidence: 0, components: {...all zeroed...} }` when `dataAvailable` is false — never a fabricated mid-range default, never a silently-omitted field. This exactly matches this engagement's own platform-wide "honest unavailable, never fabricated" discipline (the `institutionalSpecialistMember.js` precedent, the Claim Layer's "honestly null" rule). **This dimension requires no unification work — it is already consistent, and the shared contract below must preserve it exactly, not "improve" it.**

## 8. Cross-agent consistency

The one dimension genuinely lacking today, and the central problem this whole phase addresses: a "confidence: 62" from Institutional and a "confidence: 62" from Macro are computed from entirely different formulas answering entirely different underlying questions (curated-cohort coverage-and-conviction vs. raw multi-source data-availability) — there is currently no way for a consumer (the Unified Stock Intelligence engine, a future dashboard, a human analyst) to know this without reading each agent's own source file.

---

## 9. Design: the Shared Confidence Contract

**A documentation-and-metadata contract, not a mandatory shared formula** — directly following the reconciliation established in §0.

```
ConfidenceResult {
  confidence: number,              // 0-100, final clamped value — unchanged shape from today
  basis: ConfidenceBasis,          // NEW — a required enum naming which pattern this formula follows
  components: object,              // unchanged shape from today — the existing per-agent breakdown
  structuralPenalties: [           // NEW — extracted from the existing "penalty" pattern, made explicit and listable
    { name: string, points: number, reason: string, permanent: boolean }
  ],
  dataAvailable: boolean,          // unchanged — the existing hard gate
}

enum ConfidenceBasis {
  AVAILABILITY_GATED_ADDITIVE,     // the 4-of-5-agents pattern: base + capped bonuses - structural penalties
  PROPORTIONAL_AVAILABILITY,       // Macro's pattern: weighted source-availability ratio, no base/bonus shape
  EVIDENCE_LEDGER_WEIGHTED,        // the Claim Layer's pattern: dominance-capped, source/freshness/independence/breadth/agreement weighted
}
```

- **`basis` is the single new required field** every agent's `confidenceModel.js` must add — a one-line change (their formula does not need to change at all, only be *labeled*). This alone closes the "62 from Institutional and 62 from Macro aren't the same kind of claim" problem: any consumer can now branch on `basis` before comparing two confidence numbers, or simply display it alongside the number.
- **`structuralPenalties` formalizes an already-real pattern** (Institutional's cohort-scope penalty, ETF Flow's structural-unavailability penalty, Analyst Consensus's price-target-scope penalty) into a listable, inspectable array rather than a single opaque subtracted number — a pure refactor of existing logic into a more transparent shape, no formula change required.
- **`components` keeps its existing per-agent shape exactly** — this is deliberately *not* standardized across agents, since forcing Institutional's `coverageBonus`/`comparableBonus`/`convictionBonus` into the same named fields as ETF Flow's `directnessBonus`/`sampleBonus`/`persistenceBonus` would either lose real domain-specific meaning or force artificial renaming with no benefit.

## 10. Design: the Shared Weighting Model

**A shared *utility library*, not a shared *formula*** — two new, small, pure, well-tested functions added to a new `backend/services/sharedConfidence/` module:

1. **`clampedAdditiveScore({ base, bonuses, penalties })`** — formalizes the already-converged §1 pattern (base + capped bonuses - disclosed penalties, clamped to [0,100]) as a single reusable helper. Every one of the 4 `AVAILABILITY_GATED_ADDITIVE` agents could adopt this **without changing their own weights or constants at all** — it is a pure extraction of logic already independently written 4 times, not a new formula.
2. **`capAndRedistributeWeights(rawWeights, maxWeight)`** — the exact algorithm already independently implemented twice (Claim Layer, Market Sentiment Engine, per §0) — extracted once, imported twice, with both existing call sites free to keep their own domain-specific `maxWeight`/weight sets. This directly resolves the §0 tension: the *algorithm* becomes shared (proven correct, tested once instead of twice), while "each engine owns its own weighting logic" is preserved at the level of *which weights, and how many*.

**Both are opt-in, not mandatory** — no existing agent is forced to adopt either helper; the win is that a **15th agent** (or a future rewrite of any existing one) starts from a shared, tested primitive rather than writing a 6th independent reimplementation of the same additive-scoring shape.

## 11. Design: the Shared Calibration Strategy

See the dedicated companion document, `CALIBRATION_STRATEGY.md` — summarized here: **do not attempt true numeric cross-agent calibration until real Outcome-grading history exists per agent.** This directly reuses the already-established, correct precedent in this platform's own Institutional research (`SmartMoneyScore`'s `verifiedTrackRecordWeight`, defaulting to 0 until earned) and `scoringVocabulary.js`'s own disclosed "confidence/conviction/modelConfidence are the same number under three names pending real calibration data" honesty. The `basis` field (§9) is the calibration strategy's necessary *first* step — you cannot calibrate what you cannot even distinguish.

## 12. Backward compatibility

- **Every existing agent's `computeConfidence()` return shape remains valid** — `basis` and `structuralPenalties` are additive fields, never replacements; any consumer reading only `.confidence` today continues to work unmodified.
- **No agent's actual computed `confidence` number changes** as a direct result of adopting this contract — `basis` is a label, `structuralPenalties` is a reformatting of an already-existing subtracted value, and the shared utility functions (§10) are drop-in-equivalent reimplementations of logic each agent already has, not behavior changes.
- **`scoringVocabulary.js`'s existing 12 entries are untouched** — this design adds new entries (per the migration plan) rather than modifying any existing documented formula.
