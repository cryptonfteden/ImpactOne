# Conflict Resolution — How Multiple Agents Combine Without Hiding Disagreements

**Phase:** UNIFIED-SCORING-RESEARCH-001. Pure research/design — no production code was written. This document is this phase's direct answer to the mission's explicit requirement: *"Explain how multiple agents should combine without hiding disagreements."* It is grounded in a real, verified gap found by direct source inspection of the shipped `backend/services/agentOrchestrator/agentOrchestrator.js`'s `detectConflicts()` function — not a hypothetical concern.

---

## 1. The real, verified problem this document exists to fix

`detectConflicts()` (real, shipped, confirmed via direct source read) does exactly this:

```
for every pair of agents (A, B) that each reported a non-null `direction`:
    if A.direction !== B.direction:
        record a conflict
```

This is a **pure string-equality check** — and this research directly confirmed, by reading every one of the platform's 5 real agents' own source, that **each uses its own independent direction vocabulary**:

| Agent | Real `direction` field source | Real vocabulary (confirmed via source read) |
|---|---|---|
| Technical | `trend?.signal` | `UPTREND` / `DOWNTREND` / `MIXED` |
| Options | `report.marketBias` | `BULLISH` / `BEARISH` / `NEUTRAL` (filtered to `null`) |
| Sentiment | `reading.trend?.daily?.direction` | `STABLE` / `IMPROVING` / `DETERIORATING` / `INSUFFICIENT_HISTORY` |
| Valuation | `report.valuationStatus` | `UNDERVALUED` / `OVERVALUED` / `FAIRLY_VALUED` (filtered to `null`) |
| Earnings | `report.forwardOutlook` | (guidance-direction-derived; filtered to `null`/`NEUTRAL`) |

**The concrete, verifiable consequence:** if Technical reports `UPTREND` and Options reports `BULLISH` for the same symbol — both genuinely, semantically **bullish** — `detectConflicts()` today reports this as a structural conflict, purely because the two strings are not byte-identical. A user reading a "3 conflicts detected" summary could be looking at zero genuine disagreements and three vocabulary mismatches. This is the single most important, concrete finding of this whole research phase, and the primary problem the rest of this document solves.

**A second, subtler real finding:** Sentiment's own direction field (`STABLE`/`IMPROVING`/`DETERIORATING`) measures the **rate of change of the sentiment score itself**, not the sentiment's own bullish/bearish polarity — this is not merely a different vocabulary for the same concept (like Technical/Options above), but a **genuinely different concept** wearing a same-shaped field name. Comparing it directly against Options' or Valuation's polarity-based directions, even after vocabulary normalization, risks a category error unless this distinction is explicitly preserved.

---

## 2. The fix: a canonical direction taxonomy, applied before comparison, never instead of the real value

### 2.1 Design principle

Every agent should **continue reporting its own, real, domain-appropriate direction value exactly as today** (`UPTREND`, `BULLISH`, `UNDERVALUED`, etc.) — this research does **not** recommend forcing every agent onto one shared vocabulary at the source, since each agent's own term is more precise and informative in its own domain than a generic label would be (`UNDERVALUED` is more useful to a user than a generic `BULLISH` when reading the Valuation Agent's own report directly). Instead, recommend a **new, additive normalization layer** sitting between the agents and `detectConflicts()`/the new Agreement/Conflict scoring, mapping each agent's real value onto one shared, small **canonical taxonomy** used *only* for cross-agent comparison:

```
CanonicalDirection = BULLISH | BEARISH | NEUTRAL | NOT_DIRECTIONAL
```

### 2.2 Proposed mapping table (disclosed, hand-set — not inferred, matching this platform's own established convention)

| Agent | Real value | Canonical mapping | Notes |
|---|---|---|---|
| Technical | `UPTREND` | `BULLISH` | |
| Technical | `DOWNTREND` | `BEARISH` | |
| Technical | `MIXED` | `NEUTRAL` | |
| Options | `BULLISH` | `BULLISH` | Already canonical |
| Options | `BEARISH` | `BEARISH` | Already canonical |
| Valuation | `UNDERVALUED` | `BULLISH` | A price-vs-fair-value judgment, mapped to the same axis as a price-direction judgment — an explicit, disclosed modeling choice, not an obvious identity; see §2.3 |
| Valuation | `OVERVALUED` | `BEARISH` | Same caveat as above |
| Valuation | `FAIRLY_VALUED` | `NEUTRAL` | (already filtered to `null` before reaching the orchestrator today — recommend keeping this) |
| Earnings | guidance `RAISED`-derived outlook | `BULLISH` | |
| Earnings | guidance `LOWERED`-derived outlook | `BEARISH` | |
| Sentiment | `IMPROVING` | **`NOT_DIRECTIONAL`** (excluded from BULLISH/BEARISH comparison entirely) | Per §1's finding — this measures rate-of-change of sentiment, not sentiment polarity itself; forcing it onto the BULLISH/BEARISH axis would be the exact category error §1 warns against. Recommend Sentiment's *rate-of-change* signal be tracked and surfaced on its own, separate axis (see §4), not silently folded into the main directional vote |
| Sentiment | `DETERIORATING` | `NOT_DIRECTIONAL` | Same reasoning |
| Sentiment | `STABLE` / `INSUFFICIENT_HISTORY` | `NOT_DIRECTIONAL` | Same reasoning |

### 2.3 An explicit, disclosed modeling judgment call, not a hidden assumption

Mapping Valuation's `UNDERVALUED` onto the same canonical `BULLISH` bucket as a price-momentum signal is a real, debatable modeling choice: "trading below fair value" is a statement about *price relative to an estimate*, while "uptrend"/"bullish options flow" are statements about *price/flow momentum* — a genuinely undervalued stock can remain in a downtrend for a long time (indeed, that combination — cheap AND falling — is a real, common, and informative pattern, not a contradiction to be smoothed away). **This mapping should be explicitly disclosed wherever conflict/agreement results are shown** (e.g., a footnote: *"Valuation's signal reflects price-vs-estimated-fair-value, not price momentum — shown on the same axis for comparison, but measuring a different underlying question"*) — never presented as if all 4 directional agents were measuring the identical thing. This is the same "disclose the modeling choice, don't hide it" discipline this engagement has applied throughout (e.g. `OPTIONS_SCORING_MODEL.md`'s dataProvenance tagging, `VALUATION_SCORING_MODEL.md`'s itemized `excludedMethods`).

---

## 3. Conflict typology — not every disagreement is the same kind of disagreement

Recommend the platform distinguish (and label) at least these 3 categories, rather than reporting a flat, undifferentiated "conflict count":

1. **Vocabulary-mismatch, not a real conflict** (the §1 problem) — resolved entirely by §2's canonical-taxonomy normalization; once fixed, this category should produce **zero** reported conflicts going forward, and its disappearance from the conflict count should itself be treated as a validation signal that the fix worked.
2. **Genuine directional conflict** — two agents, after canonical normalization, report opposing (`BULLISH` vs. `BEARISH`) directions on the *same underlying question* (price direction/valuation lean) — this is real, informative disagreement that must always be surfaced, never averaged away (§5).
3. **Different-question, not-directly-comparable signals** — Sentiment's rate-of-change axis (§2.2), and (looking ahead) the Algorithmic Activity Agent's `ExecutionPressure` (a distinct signed magnitude per `ALGORITHMIC_ACTIVITY_SCORING.md` §1.4) — these should never be forced into the BULLISH/BEARISH conflict count at all; recommend they be reported as **their own, separately-labeled axes** in the Unified Intelligence Report, explicitly not part of the directional-conflict tally, rather than silently excluded (invisible) or silently included (miscounted).

---

## 4. What "not hiding disagreements" concretely requires — a checklist

1. **The itemized conflict list (already real, via `detectConflicts()`) must always be included in the Unified Intelligence Report, in full, never summarized away** — the existing `run()` output already does this (`conflicts: detectConflicts(agentResults)` sits alongside `overallConfidence`, not instead of it) — this research recommends *preserving that structural choice exactly*, only fixing the *accuracy* of what counts as a conflict (§2).
2. **A single headline score (Overall Intelligence Score/Overall Confidence, per `UNIFIED_SCORING_MODEL.md`) must never be presented without the conflict list immediately available alongside it** — mirroring `decisionTraceExplainabilityService.js`'s already-real "a summary is always checkable against its real inputs" principle, and the real `computeOverallConfidence()` code comment's own stated design intent.
3. **A genuine directional conflict must be reflected as a real, visible penalty in the headline score (`ConflictPenalty`, `UNIFIED_SCORING_MODEL.md` §3), not silently smoothed out by averaging** — a weighted-average-only approach (the current real `computeOverallConfidence()` mechanism, before this research's proposed extension) has exactly this failure mode: two equally-confident but *opposing* agents average to the same headline number as two equally-confident *agreeing* agents, since direction never enters the current formula at all. This is a second, distinct real gap this research identifies (beyond §1's vocabulary-mismatch finding) — not a hypothetical risk, but a direct, verifiable property of the current shipped formula (confirmed by reading `computeOverallConfidence()`'s implementation, which uses only `confidence` and `priority`, never `direction`, in its weighted sum).
4. **Never resolve a genuine conflict by silently picking a "winning" side** — no majority-rule, no highest-confidence-wins override. The correct response to a genuine conflict is to report it, penalize the headline confidence proportionally (since real disagreement among independently-reasoning agents is itself evidence of higher uncertainty about the true picture — a standard, defensible ensemble-forecasting principle, not a novel claim), and let the user/downstream consumer (a human, or eventually a Committee-style synthesis layer) weigh the actual substance of the disagreement — exactly the same "debates, never decides" governance already enforced by `canonicalVerdict.js` for the Committee, extended here to the agent-aggregation layer.
5. **Never let an Agreement Bonus (`UNIFIED_SCORING_MODEL.md` §4) reward *apparent* agreement that is actually just uncorrected vocabulary mismatch, or *correlated* (non-independent) agreement, as if it were real, independent corroboration** — both failure modes are addressed directly: the former by §2's taxonomy fix, the latter by the Bayesian-inspired independence discount recommended in `AGGREGATION_METHODOLOGY.md` §7 and specified in `UNIFIED_SCORING_MODEL.md` §4.

---

## 5. Worked example — before and after this research's recommended fix

**Scenario:** for a hypothetical symbol, Technical reports `UPTREND` (confidence 75), Options reports `BULLISH` (confidence 68), Valuation reports `OVERVALUED` (confidence 60), Sentiment reports `DETERIORATING` (confidence 55).

- **Today's real, shipped behavior:** `detectConflicts()` would report **3 structural conflicts** — Technical-vs-Options (`"UPTREND" !== "BULLISH"`), Technical-vs-Valuation (`"UPTREND" !== "OVERVALUED"`), Options-vs-Valuation (`"BULLISH" !== "OVERVALUED"`) — plus, if Sentiment's `DETERIORATING` were compared at all, a 4th. **This overstates disagreement**: Technical and Options actually *agree* (both bullish on price direction) once vocabulary is normalized, and only Valuation is a *genuine* directional dissenter (bearish-leaning on a fair-value basis) — a single real conflict, not three.
- **After this research's recommended fix:** canonical normalization yields Technical → `BULLISH`, Options → `BULLISH`, Valuation → `BEARISH` (via the disclosed `OVERVALUED → BEARISH` mapping, §2.3), Sentiment → excluded from the directional tally entirely (`NOT_DIRECTIONAL`, its own rate-of-change signal reported separately). The correctly-identified result: **Technical and Options genuinely agree** (a real, disclosed Agreement Bonus contribution, subject to an independence discount since both may share some underlying price-data lineage) **and Valuation genuinely disagrees** (a real, disclosed Conflict Penalty contribution) — one real, substantively meaningful, honestly-labeled disagreement surfaced to the user (*"Valuation's fair-value-based read disagrees with the price-momentum-based signals from Technical and Options"*), instead of an inflated, vocabulary-driven "3 conflicts" count that would have obscured the one disagreement that actually matters.

This worked example is the clearest, most concrete demonstration of why the canonical-taxonomy fix in §2 is this document's central recommendation — it does not just tidy up terminology, it **materially changes what a user is told about how much the platform's own agents actually agree or disagree.**
