# Fair Value Methodology — Fair Value, Buy Zone, and Strong Buy Zone

**Phase:** VALUATION-RESEARCH-001. Pure research/design — no production code was written. Companion to `VALUATION_RESEARCH.md` (formula/data-source research) and `VALUATION_SCORING_MODEL.md` (confidence model, sector normalization, negative-earnings handling). Bound by the same governance already enforced across this platform's other engines (`canonicalVerdict.js`'s `FORBIDDEN_COMMITTEE_KEYS`, the Options Agent's identical discipline in `OPTIONS_AGENT_ARCHITECTURE.md` §1) — **this methodology defines a price *zone* relative to an estimated fair value, never a buy/sell/hold action**. Section 4 below addresses this mission's own "Buy Zone"/"Strong Buy Zone" terminology directly, since those names carry real risk of being misread as a directive if not deliberately labeled.

---

## 1. Fair Value methodology

### 1.1 Design principle: a composite of methods, never a single formula

No single multiple from `VALUATION_RESEARCH.md` §2-7 is trustworthy alone — each has known blind spots (P/E fails on negative earnings; P/B fails on asset-light businesses; EV/EBITDA ignores capex; P/S ignores margin). The Fair Value estimate should therefore be a **composite of implied prices from multiple independent methods**, each converted onto a common "implied fair price per share" scale, then combined — never a single ratio compared to a single historical average.

### 1.2 Step 1 — compute an implied fair price from each usable method

For each method, apply the company's own **sector-relative target multiple** (per `VALUATION_RESEARCH.md` §9 — the sector peer-group median or Damodaran industry-average multiple, not a market-wide constant) to the company's own trailing (or, where available and disclosed as such, forward) fundamental:

| Method | Implied fair price formula |
|---|---|
| P/E-implied | `sectorMedianPE × companyEPS` |
| Forward P/E-implied | `sectorMedianForwardPE × companyForwardEPS` |
| PEG-implied | `(sectorMedianPEG × companyGrowthRate) × companyEPS` — i.e., back out the P/E a PEG-of-1-to-sector-norm would imply, then apply it to EPS |
| EV/EBITDA-implied | `(sectorMedianEV/EBITDA × companyEBITDA − netDebt) / sharesOutstanding` — converts an implied enterprise value back to an implied *equity* price per share by subtracting net debt, a step easy to omit and a common real error |
| P/S-implied | `(sectorMedianPS × companyRevenuePerShare)` |
| P/B-implied | `sectorMedianPB × companyBookValuePerShare` |
| FCF Yield-implied | `companyFCFPerShare / sectorMedianFCFYield` — inverted, since yield is expressed the opposite direction of a multiple |

Each method that cannot be computed (missing data, or structurally inapplicable per §8 of `VALUATION_RESEARCH.md` — e.g. P/E for negative earnings) is **excluded from the composite entirely, not defaulted to zero or a fabricated placeholder** — the same "a detector that can't compute contributes nothing" discipline already proven in `optionsAnomalyConfidence.js`.

### 1.3 Step 2 — weight and combine the usable implied prices

Recommend **not** a simple unweighted average — different methods deserve different weight depending on the company's own characteristics, determined by real, disclosed rules rather than a fitted/opaque model (consistent with this platform's own "hand-set, disclosed weights, not a black box" convention already used in `optionsAnomalyConfidence.js`'s `CLASSIFICATION_STRENGTH` constants and `scoringVocabulary.js`'s `QUALITY_WEIGHTS`):

| Company profile | Weighting guidance |
|---|---|
| Profitable, stable-margin (the "normal" case) | Roughly equal weight across P/E, Forward P/E, EV/EBITDA, FCF Yield; lower weight on P/S and P/B (still shown, but treated as secondary corroboration, not primary drivers) |
| Unprofitable / negative earnings | P/E and PEG excluded entirely (§8/negative-earnings handling); weight shifts primarily to P/S, with FCF Yield included **only if FCF is actually positive** (a real, common case even for GAAP-unprofitable companies per `VALUATION_RESEARCH.md` §7); EV/EBITDA excluded if EBITDA is also negative |
| Asset-heavy / financial-sector | P/B weighted more heavily than for a typical company (this is exactly the intended, structurally-correct use case for P/B); EV/EBITDA de-emphasized or excluded, since "enterprise value" and leverage-based multiples are less meaningful for banks/insurers, whose balance sheet *is* the business |
| Every profile | ROIC is **never** one of the weighted inputs to the price composite itself — it remains a confidence gate/discount only (per `VALUATION_RESEARCH.md` §8 and the confidence model in `VALUATION_SCORING_MODEL.md`), since it is a quality signal, not a price-implying ratio |

The final `fairValueEstimate` = the weighted average of all usable implied prices, using the profile-appropriate weights above. This value, together with its full breakdown (which methods contributed, at what weight, and why any were excluded), must always be surfaced alongside the number — never as a single unexplained figure — following this platform's established `decisionTraceExplainabilityService.js` precedent of full input-to-output traceability.

### 1.4 Explicitly out of scope for MVP: full discounted cash flow (DCF)

A rigorous multi-year DCF (explicit FCF projections, a terminal value, and a discount rate derived from a real WACC calculation) is the traditional "gold standard" fair-value approach in professional equity research, but is deliberately **not** recommended for an MVP:

- It requires far more assumptions (multi-year growth/margin trajectories, a terminal growth rate, a company-specific discount rate) than the multiples-composite approach above, each of which is a real place for silent, hard-to-audit bias to creep in.
- The multiples-composite approach above is directly and transparently traceable to real, currently-observable peer/sector data — a DCF's terminal value alone often dominates the entire valuation and is the hardest single number to defend or explain to a retail user (this platform's own target audience per `COMPANY_STRATEGY_REVIEW.md`'s "financial literacy company" positioning).
- **Recommended sequencing:** ship the multiples-composite Fair Value first; consider a simplified DCF as a clearly-labeled *secondary* cross-check once production data (better forward-estimate coverage, a company-specific WACC input) supports it — never as a silent replacement for the primary methodology, and never blended into one opaque number with the multiples composite without disclosing both independently.

---

## 2. Buy Zone calculation

### 2.1 Core mechanism: a margin-of-safety band below Fair Value

Reusing the classic Benjamin Graham "margin of safety" principle: a stock enters the **Buy Zone** when its current price sits at a meaningful discount to the computed `fairValueEstimate`, not merely below it by any amount (noise/estimation error alone could put a fairly-valued stock a few percent under its own estimate).

```
discountToFairValue = (fairValueEstimate − currentPrice) / fairValueEstimate

Buy Zone condition:
  discountToFairValue >= BUY_ZONE_THRESHOLD   (proposed: 10-15%)
  AND fairValueConfidence >= MINIMUM_CONFIDENCE_FOR_ZONE_LABELING (see VALUATION_SCORING_MODEL.md §2)
```

Both the discount threshold and the confidence gate are **required simultaneously** — a large apparent discount computed from a low-confidence Fair Value estimate (few usable methods, thin sector peer group, conflicting method disagreement) must not be labeled a "Buy Zone," since the discount itself may simply be estimation noise rather than a real mispricing.

### 2.2 Why a gate, not just a threshold

Per `VALUATION_RESEARCH.md` §8's ROIC discussion: a stock can show a large nominal discount to a naive multiples-based fair value precisely *because* it is a genuine value trap (deteriorating fundamentals, ROIC below cost of capital, a structurally justified low multiple) — recommend the Buy Zone condition also require:

```
  AND roic >= (sectorMedianWACC × VALUE_TRAP_ROIC_FLOOR_MULTIPLIER)   (proposed multiplier: 0.8,
       i.e. ROIC doesn't have to exceed WACC outright to avoid the trap flag, but shouldn't be
       badly below it either — a company modestly below its own cost of capital may still be a
       legitimate turnaround candidate, not automatically a trap; a company far below is a trap)
```

When this ROIC gate fails, the signal should still be computed and shown (never suppressed entirely — that would itself be a form of silent, unexplained data withholding), but explicitly labeled with a disclosed caveat (e.g., `"Trades at a discount to estimated fair value, but return on invested capital is below its sector's typical cost of capital — a discount alone may not indicate an attractive opportunity."`) rather than a clean, unqualified "Buy Zone" badge.

---

## 3. Strong Buy Zone calculation

### 3.1 A stricter version of the same mechanism, not a different one

The **Strong Buy Zone** is **not** a qualitatively different methodology — it is the same margin-of-safety mechanism at a materially larger discount threshold, **plus** a positive (not merely non-failing) ROIC corroboration, **plus** a higher confidence-gate requirement:

```
Strong Buy Zone condition:
  discountToFairValue >= STRONG_BUY_ZONE_THRESHOLD   (proposed: 25-30%, roughly double the
       standard Buy Zone threshold — a deliberately large gap so the two bands are visibly,
       meaningfully distinct, not adjacent slivers of the same range)
  AND fairValueConfidence >= MINIMUM_CONFIDENCE_FOR_STRONG_ZONE_LABELING
       (proposed: strictly higher than the ordinary Buy Zone's confidence floor — a Strong
       claim deserves stronger evidence, mirroring optionsAnomalyConfidence.js's own
       "SWEEP+BLOCK scores higher than either alone" corroboration-rewards-corroboration principle)
  AND roic > sectorMedianWACC   (a genuine, not-merely-non-failing, value-creation signal —
       stricter than the Buy Zone's 0.8x-multiplier tolerance)
  AND methodAgreement >= MINIMUM_METHOD_AGREEMENT_FOR_STRONG_ZONE
       (see VALUATION_SCORING_MODEL.md §2's dispersion-based confidence discount — the
       individual methods' implied fair prices must actually agree with each other reasonably
       closely, not merely average out to a large discount while wildly disagreeing on WHY)
```

### 3.2 Why all four gates matter together

Each gate independently addresses a different, real failure mode already identified in this research:

- **Threshold size** guards against labeling routine estimation noise as an extreme opportunity.
- **Confidence floor** guards against a data-poor company (few usable methods, thin sector peer group) appearing to qualify purely because there was too little real evidence to disagree with itself.
- **ROIC-above-WACC** guards against the value-trap risk (§2.2) — the single most important differentiator between "statistically cheap" and "genuinely undervalued."
- **Method agreement** guards against a case where, say, P/S alone shows an enormous discount while EV/EBITDA and FCF Yield show a much smaller one (or none) — a headline composite discount can mathematically average to a large number even when the underlying methods substantially disagree about the company's actual valuation, and averaging away that disagreement rather than surfacing it would be a real, avoidable loss of information, inconsistent with this platform's "surface contradiction, never silently resolve it" principle already established for Claims (`IMPACTONE_ANTI_PATTERNS.md`).

---

## 4. Naming and labeling — the governance-critical section

### 4.1 The real risk

"Buy Zone" and "Strong Buy Zone," read plainly, sound like a directive ("you should buy this") rather than a description of a price's relationship to an estimate — this is precisely the same category of risk already found and fixed once in this codebase (Phase E3.5: Finnhub's raw analyst consensus was originally shown under a heading literally titled "Recommendation" until it was relabeled "Wall Street Analyst Consensus — Third-party data, not an ImpactOne recommendation"). The Valuation Agent's own zone labels are at real risk of repeating that exact mistake if shipped with the mission's literal requested names and no further treatment.

### 4.2 Recommended resolution — keep the analytical concept, change the user-facing label

The **internal/technical concept names** ("Buy Zone," "Strong Buy Zone," as requested by this mission, and as used for the calculation logic above) can remain exactly as specified for internal fields/documentation — but recommend the **user-facing presentation layer** use unambiguous, non-directive phrasing wherever this reaches a real user or feeds a Claim/evidence record, for example:

- Internal field: `valuationZone: "STRONG_BUY_ZONE"` → user-facing label: **"Trading well below its estimated fair value"** (Strong) / **"Trading below its estimated fair value"** (standard), each with the actual discount percentage and confidence shown alongside, never a bare badge with no supporting numbers.
- Every surface where this appears must carry the same explicit disclaimer pattern already proven in this codebase: **"A valuation signal, not a recommendation — evaluate this alongside your own research and the platform's other evidence."**
- This value must flow into `DecisionTrace.evidenceReferences`/the Claim Layer as **evidence**, exactly like the Options Agent's signals (`OPTIONS_AGENT_ARCHITECTURE.md` §1) — never as a standalone action field, and must never itself set or override `Recommendation.action`.

### 4.3 Explicit governance requirement for implementation

Whenever this design is actually implemented, the resulting code should be checked against `canonicalVerdict.js`'s `FORBIDDEN_COMMITTEE_KEYS` denylist the same way every other engine's output already is, and — per the pattern already established for the Options Agent — should **never** emit a field literally named `action`, `decision`, `verdict`, or `recommendation`. `valuationZone` (an enum of `FAIR_VALUE_RANGE` / `BUY_ZONE` / `STRONG_BUY_ZONE` / `OVERVALUED` — a genuinely symmetric scale, not a one-sided cheap-only scale, since a stock trading well *above* its estimated fair value is equally real, useful information) is a defensible field name because it describes a *price-to-estimate relationship*, not an instruction — but this reasoning should be revisited explicitly, not assumed, at actual implementation time.
