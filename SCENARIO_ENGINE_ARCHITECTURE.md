# Predictive Scenario Engine — Architecture (Phase SCENARIO-ENGINE-001)

**Status:** Architecture only. Nothing in this document is implemented. No code was written, no migration was run. Every reference to an existing file/service below is real and was read directly from this repository to ground the design — every new module/table/endpoint named below is proposed, not built. This document follows the exact documentation convention `OPTIONS_AGENT_ARCHITECTURE.md`/`MARKET_SENTIMENT_ENGINE.md`/`INTELLIGENCE_BUS_ARCHITECTURE.md` already established.

## 1. What this is, and the single most important finding from research

The **Predictive Scenario Engine** proactively answers, without the user ever asking a question or knowing any financial terminology: *"Here is what is most likely to happen next, why it matters to you, and what would change our view."*

Before writing one line of new design, this codebase was audited for what already exists toward this goal — and the finding is decisive: **every one of the mission's required capabilities already has a real, working, cited precedent.** This is not a new engine built from nothing; it is an **orchestration layer** that composes existing services into one proactive, ranked, plain-language surface. Building a parallel scenario-generation/grading/calibration system instead of reusing what's real would repeat exactly the anti-pattern this platform has already corrected once (`canonicalVerdict.js`'s entire reason for existing — "two engines disagree" — and the Options Agent/Sentiment Engine's shared governance reuse instead of each inventing their own).

| Required capability | Real, existing precedent |
|---|---|
| Base/upside/downside scenario generation | `autonomousRecommendationEngine.buildScenarios()` — already produces exactly this triad, each with `narrative`, `probability`, `priceImpact`, `portfolioImpact`, `catalysts`, `risks`, `invalidationTrigger` |
| Plain-language translation | `dailyBriefService.js`'s `generateAiSummary()`/`buildRuleSummary()` — an AI translator with an honest rule-based fallback, already tagged `source: "openai"` vs `"fallback"` |
| Evidence intake across engines | The Intelligence Bus (Phase AI-ENGINE-003) — `intelligenceBusService.getEvents()`/`subscribe()`/`aggregateEvidence()` |
| Personal portfolio impact | `autonomousRecommendationEngine.js`'s real `positionWeightPct`/`sectorWeightPct`/`concentrationTriggered` + `portfolioEngineService.getPortfolioSummary()` |
| Observed vs. inferred vs. predicted vs. uncertain | `evidenceMatrixService.js`'s `stance` vocabulary (SUPPORTIVE/CONTRADICTORY/NEUTRAL/UNAVAILABLE) + `canonicalVerdict.js`'s evidence/verdict separation + the `WorldMemoryRecord` → `WorldMemoryCausalLink` → `WorldMemoryPrediction` → `Outcome` four-way split |
| Learn from outcomes | `outcomeGradingService.gradePendingOutcomes()` — a fully real, working "compare prediction to later real price, grade it" pipeline |
| Source credibility | `newsSourceScoringService.computeScoreForSource()` — real `trustScore`/`accuracyRate`, computed only from graded `Outcome` rows |
| Probability calibration | `calibrationReportService.computeCalibrationReports()` — real "when we said 70% confident, were we right 70% of the time" analysis, gated by a minimum sample size |
| Agent/committee reliability | `committeeScorecardService.computeMemberStats()` — real per-member win rate, calibration, contribution score |
| Indicator weights pending calibration | `scoringVocabulary.QUALITY_WEIGHTS` + the Options Agent's/Sentiment Engine's own disclosed "fixed, hand-set weights until enough graded Outcome history exists" precedent |

## 2. What genuinely does NOT exist yet — the real gap this design fills

Auditing also found what's missing — the actual new work:

1. **Nothing proactively identifies and ranks "the most important upcoming scenarios" across the whole platform.** `buildScenarios()` runs reactively, per-recommendation, only for symbols already being analyzed. There is no cross-symbol, cross-engine "what are the top N things about to matter" surface.
2. **Nothing ranks by urgency.** Probability and portfolio impact have real precedent (above); a real "how soon, and how close to its invalidation condition" urgency score does not exist anywhere.
3. **Nothing grades a *scenario* as a first-class entity.** `Outcome` is scoped to a `Recommendation` (`@@unique([recommendationId, timeWindow, methodologyVersion])`). A scenario is a different, more specific claim ("if X happens, expect Y") that can resolve TRUE/FALSE/PENDING independent of whether the recommendation engine's `action` was ultimately right.
4. **Nothing measures whether the *selection/ranking itself* was good** — distinct from whether each individual scenario's probability was calibrated. "We correctly said this had 70% probability" and "we correctly identified this as the #1 thing to show the user today" are different questions; only the first has a real answer today (`calibrationReportService`).
5. **No single surface composes evidence from multiple engines (Bus) into one scenario's evidence list.** Each engine's evidence is real and Bus-published; nothing today reads across `engineId`s to build one scenario's `evidence[]`.

This document designs the layer that fills exactly these 5 gaps, reusing everything else.

## 3. Where this sits in the real platform

```
Options Agent, Sentiment Engine, Macro/Earnings/Ownership/etc. (future)
                    │  publish evidence
                    ▼
        Intelligence Bus (intelligenceBusService.getEvents/subscribe)
                    │
                    ▼
   scenarioIdentificationService (new) — "what are the top N things
   about to matter, across symbols/markets/portfolio, right now?"
                    │
                    ▼
   scenarioGenerationService (new) — extends buildScenarios()'s real
   base/upside/downside shape to a proactive, Bus-evidence-backed scenario
                    │
       ┌────────────┼─────────────────┐
       ▼            ▼                 ▼
  rankingService  plainLanguageService  evidenceComposer
  (probability,   (reuses dailyBrief-   (observed/inferred/
   urgency,        Service's AI+fallback predicted/uncertain
   personal        translation contract) labeling, per §6)
   impact)
                    │
                    ▼
        Scenario (new, persisted) ── evidenceRefs → IntelligenceBusEvent ids
                    │
                    ▼
   scenarioOutcomeGradingService (new) — same real grading discipline as
   outcomeGradingService, scoped to ScenarioOutcome (new) instead of
   Recommendation-scoped Outcome
                    │
                    ▼
   Feeds back into: newsSourceScoringService (source credibility),
   committeeScorecardService-style agent reliability, calibrationReportService-
   style probability calibration, scoringVocabulary-style indicator weights —
   ALL EXISTING, extended to also read ScenarioOutcome rows (§8)
```

## 4. Proactive identification — never require the user to formulate a scenario

`scenarioIdentificationService` (new) runs on the platform's existing tracked universe (portfolio + watchlist + `AUTONOMOUS_SCAN_UNIVERSE` — the same bounded, disclosed set every other engine already uses, never a second hardcoded universe) and asks, for each symbol/market: *is there real, fresh, sufficiently-confident evidence on the Bus that something is about to matter?* This is a real filter over `intelligenceBusService.getEvents({ lifecycleStatus: "ACTIVE" })`, not a fabricated "top scenarios" list — a symbol with no fresh Bus evidence produces no scenario at all, honestly, rather than a manufactured low-confidence one (same null-not-zero discipline as the Sentiment Engine's rollup).

The user never sees a form, a query box, or a "select a symbol" step — the ranked scenario list (§5) is the entire interaction surface, matching the mission's product-experience line verbatim.

## 5. Ranking — probability, urgency, personal portfolio impact

- **Probability**: reuses `scenarioEngineService.getScenario()`'s real theme-matched probability (already flowing into `buildScenarios()`'s `bullCase.probability` etc.) — not recomputed.
- **Personal portfolio impact**: reuses `positionWeightPct`/`sectorWeightPct`/`concentrationTriggered` (real, already computed in `autonomousRecommendationEngine.js`) plus `portfolioEngineService.getPortfolioSummary()`'s real `allocation.bySector`. A scenario about a symbol/sector the user doesn't hold and isn't watching scores a real, low, honestly-computed impact — never hidden or dropped, just ranked lower, so the user can still see "the market's biggest story today" even when it doesn't touch their portfolio (distinct from "how much does this touch YOU").
- **Urgency** (the one genuinely new score, §2 item 2): a function of (a) the evidence's real freshness/decay (reusing `autonomousMarketService.recencyScore`'s existing decay-over-time philosophy) and (b) real proximity to the scenario's own stated invalidation/confirmation condition (e.g. a price level, an earnings date, a Fed meeting date already known from real calendar/price data) — never a fabricated countdown when no real triggering date/level exists; a scenario with no real time-anchor honestly scores urgency as `null`/lowest-priority, not a guessed mid-range value.
- **Composite rank**: mirrors the Sentiment Engine's disclosed-weight, capped-dominance rollup pattern (`marketSentimentRollup.capAndRedistributeWeights`) — no single one of probability/urgency/impact may alone determine the ranking; weights start fixed and disclosed (§8), pending real calibration data from `ScenarioOutcome` history.

## 6. Observed facts, inferred relationships, predicted outcomes, uncertainty — made explicit

Every scenario's evidence composer labels each piece of evidence with exactly one of 4 real, already-precedented categories, carried through to the plain-language layer so the user can (without needing to know the terminology) see the difference between "this already happened" and "we think this will happen":

| Category | Definition | Reused precedent |
|---|---|---|
| **Observed** | A real, already-occurred, already-published fact (a headline, a price move, a filed COT report, a captured sentiment snapshot) | `WorldMemoryRecord` (the spine — "what happened"), `evidenceMatrixService`'s per-category real inputs |
| **Inferred** | A causal or correlational relationship connecting observed facts (e.g. "this rate move historically precedes X") | `WorldMemoryCausalLink` (real, evidence-based, `confidence`-scored edges — "why it happened"), `evidenceMatrixService`'s `stance` field |
| **Predicted** | What the scenario expects to happen, with a real probability | `WorldMemoryPrediction` ("what prediction did we make") + `buildScenarios()`'s `probability` |
| **Uncertainty** | What isn't known / what would change the view | `scoringVocabulary.uncertainty` (already documented: "how much genuine disagreement exists... distinct from confidence") + the scenario's own `invalidationTrigger`/confirmation condition |

This is a labeling/presentation layer over 4 already-real concepts, not a new taxonomy invented from scratch — the design's job is making the distinction *visible to the user*, plainly, which nothing today surfaces outside a decision-trace API response.

## 7. Plain-language translation — reusing the Daily Brief's real contract

`scenarioPlainLanguageService` (new) reuses `dailyBriefService.js`'s exact two-tier translation contract: an AI translator (`generateAiSummary()`'s pattern — strict JSON schema, gpt-4o-mini) with an honest rule-based fallback (`buildRuleSummary()`'s pattern) when no API key is configured, both tagged with a real `source: "openai" | "fallback"` field, never silently presenting a lower-fidelity fallback as the AI version. Output fields per scenario, mirroring the mission's product-experience line directly: `whatIsExpected` (plain-English base case), `whyItMatters` (personal-impact framing, reusing `homeSummaryService.buildHowDoesItAffectMe()`'s pattern), `whatWouldChangeOurView` (the invalidation/confirmation conditions, translated).

## 8. Learning from outcomes — extending the real chain, not duplicating it

Every scenario, once it resolves (its time horizon passes, or its confirm/invalidate condition triggers), is graded by `scenarioOutcomeGradingService` (new), running the **exact same real logic** `outcomeGradingService.js` already uses (`computeDirectionCorrect`, `computeGrade`) — scoped to a new `ScenarioOutcome` table (§ data model doc) instead of the `Recommendation`-scoped `Outcome`, because a scenario is a different, more specific claim than a recommendation's `action` (§2 item 3).

Once graded, `ScenarioOutcome` rows feed the same real downstream consumers, extended (not replaced):

- **Agent reliability**: `committeeScorecardService`'s real per-member scorecard logic, extended to also read `ScenarioOutcome` rows where a committee member's evidence contributed to a scenario.
- **Source credibility**: `newsSourceScoringService.computeScoreForSource()`, extended to also count a source's contribution to a graded `ScenarioOutcome`, alongside its existing `Outcome`-based counting.
- **Indicator weights**: the ranking formula's (§5) fixed, disclosed weights are revisited once `ScenarioOutcome` sample size crosses the same real `MIN_SAMPLE_SIZE` threshold `calibrationReportService.js` already enforces (5) — never adjusted on a handful of resolved scenarios.
- **Probability calibration**: `calibrationReportService`'s real "expected vs. actual hit rate" logic, extended to group by scenario type (base/upside/downside) in addition to its existing grouping by recommendation `action` family.
- **Scenario-selection quality** (the one genuinely new metric, §2 item 4): a new, disclosed report — `scenarioSelectionQualityService` — comparing each day's top-N ranked scenarios against which ones actually turned out to matter (graded `ScenarioOutcome.gradeLabel !== UNGRADEABLE` and a real realized-impact magnitude), gated by the same minimum-sample-size discipline. This measures ranking quality, not per-scenario probability accuracy — a genuinely new question this platform has never had the data to ask before, honestly reported "insufficient data" until enough scenarios have resolved.

**Disclosed, not hidden**: none of these updates are automatic on day one. Every one of them requires real graded `ScenarioOutcome` history to exist first — exactly the same honest bootstrap-period discipline the Options Agent's baseline-volume detector and the Sentiment Engine's fixed confidence weights already established. Until then, weights stay fixed and disclosed, and calibration/reliability reports honestly say "insufficient data," never a fabricated early verdict.

## 9. Governance — "a scenario is evidence and a forecast, never a trade instruction"

Bound by the same rule every other engine in this platform now follows: a `Scenario` never emits any of `canonicalVerdict.js`'s `FORBIDDEN_COMMITTEE_KEYS` (`action`, `decision`, `verdict`, `finalDecision`, `recommendation`). The scenario engine's entire output is framed as "here is what we think is likely, here is why, here is what would change our mind" — never "here is what to do." When a scenario's evidence includes a real `Recommendation` (the one canonical action-bearing entity), the scenario cites it by id and displays it through the existing `canonicalVerdict.buildCanonicalVerdictView()`, never re-deriving or restating an action itself.

## 10. Known gaps and honest limitations (disclosed up front)

- **Urgency has no real precedent to reuse** (§5) — it is the one score built substantially from scratch this phase's implementation would need to design carefully, with an explicit honest-null behavior when no real time-anchor exists.
- **Scenario-selection quality cannot be measured until real `ScenarioOutcome` history accumulates** — early on, this reports "insufficient data," not a fabricated ranking-quality score.
- **The plain-language layer's AI path requires `OPENAI_API_KEY`** (the same real, disclosed dependency `dailyBriefService.js` already has) — without it, the rule-based fallback is honestly labeled as such, never presented as AI-generated.
- **This document does not specify Express routes, a scheduler, or UI** — per the architecture-only scope of this phase; a follow-up implementation phase (mirroring AI-ENGINE-001 → 001.1) would build `backend/services/scenarioEngine/` against this design.
