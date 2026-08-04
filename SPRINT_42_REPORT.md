# Sprint 42 — Intelligence Quality Platform — Final Report

**Branch:** `sprint-16-live-data` (not pushed) · **Commits:** 4 · **Date:** 2026-07-22

## Mission

ImpactOne must become a system that measures, learns, and improves every investment decision over time. Every recommendation must be measurable from birth until completion: what was recommended, why, when, by which committee members, using which evidence, and what actually happened afterward. No new providers, no UI redesign.

## Final Architecture

```
Recommendation Engine (unchanged)
    │
    ├─► Recommendation Lifecycle Events (new, append-only)
    │     GENERATED → PUBLISHED → ACTIVE → VIEWED* → {SUCCEEDED | FAILED | EXPIRED | CANCELLED}
    │     (* VIEWED can repeat; every other state is a real, once-only or terminal event)
    │
    ├─► DecisionTrace (unchanged, immutable) — the ONE unified committee's
    │     real snapshot at decision time (Sprint 41)
    │
    └─► WorldMemoryPrediction → outcomeGradingService (existing, Sprint 29)
              │
              ├─► Performance Engine (new) — real price-history-derived
              │     metrics, written onto Outcome
              │
              └─► Outcome (extended: benchmarkSymbol/benchmarkReturnPct/
                    riskAdjustedReturnPct now populated + new
                    performanceMetrics Json column)

Outcome + DecisionTrace + Recommendation (joined by recommendationId)
    │
    ▼
scorecardDataSource.js (new, shared read-only join)
    │
    ├─► Committee Scorecard (new) — per-member win rate/alpha/calibration/
    │     holding period/contribution/disagreement, rolling 30/90/365d
    ├─► CIO Scorecard (new) — overall/buy/reduce/exit accuracy, false
    │     positives/negatives, average alpha
    └─► Evidence Scorecard (new) — per evidence-matrix-category usage/
          win rate/alpha/confidence

decisionTraceExplainabilityService.js (Sprint 39, extended) — now also
    surfaces the real final Outcome and real lifecycle history alongside
    the existing original recommendation/committee/evidence/confidence

/v2/quality-platform/* (new, internal, no public UI)
```

Every new piece is additive and read-only over existing, already-tested infrastructure — no existing recommendation-generation or committee logic was changed in a way that alters what gets recommended.

## Implemented Capabilities

### 1. Recommendation Lifecycle
New `RecommendationLifecycleEvent` model (append-only, one row per real transition, never updated or deleted — mirrors this codebase's existing `DecisionTrace`/`WorldMemory*` immutability convention). Nine states: `GENERATED, PUBLISHED, VIEWED, PAPER_TRADED, ACTIVE, EXPIRED, SUCCEEDED, FAILED, CANCELLED`. Wired into six real production events:
- **GENERATED, PUBLISHED, ACTIVE** — recorded together at recommendation creation (this engine has no separate draft/review step; all three genuinely happen at the same moment).
- **CANCELLED** — recorded when a recommendation is superseded by a fresher one for the same symbol (`supersedeActiveForSymbol`, now returns the real ids it changed).
- **EXPIRED** — recorded when a stale recommendation ages out (`expireStaleRecommendations`, same id-returning change).
- **VIEWED** — recorded when a user opens a recommendation's detail (existing `POST /:id/view` endpoint).
- **SUCCEEDED / FAILED** — recorded when `outcomeGradingService` grades a real outcome, based on real `directionCorrect`.

`PAPER_TRADED` has real service/API support but no automatic production caller yet — the legacy localStorage `useVirtualPortfolio` paper-trading path doesn't reference real `Recommendation` ids, so it has nothing to attach a lifecycle event to (see Known Limitations).

All writes are best-effort (`recordTransitionSafely`) — lifecycle logging can never block the real action it's recording.

### 2. Performance Engine
`performanceEngineService.computePerformanceMetrics()` computes, from real daily price history (`priceHistoryProvider.getDailyBars`, Sprint 37 — no new provider, works identically for any symbol including SPY and sector ETFs):
- Absolute return, return vs. SPY, return vs. sector ETF (via a new small honest sector→ETF map; `null` — never guessed — when no real sector is known for the recommendation)
- Max drawdown, max gain
- Volatility (standard deviation of daily returns over the window)
- Time to target / time to failure (first real day the price crossed the recommendation's own stated upside/downside target; `null` when never crossed)

Populates the `Outcome` model's three previously-unwritten columns (`benchmarkSymbol`, `benchmarkReturnPct`, `riskAdjustedReturnPct`) plus a new `performanceMetrics` Json column, wired directly into the existing `outcomeGradingService` grading pass — every newly graded outcome now carries real performance data.

### 3. Committee Scorecard
Per committee member: win rate, average alpha, confidence calibration, average holding period, contribution score (how often this member supplied the strongest cited evidence), disagreement frequency — all computed from real graded outcomes joined back to the real per-member evidence stored on `DecisionTrace.committeeDebate.committee` (the Sprint 41 unified committee). A member's win/loss is judged on whether their own `SUPPORTIVE`/`CONTRARY` lean matched the real subsequent price direction, independent of the recommendation's own action — a `NEUTRAL` member (no directional evidence) is excluded entirely, never counted as a loss. Rolling 30/90/365-day windows, keyed by the recommendation's real `createdAt`.

### 4. CIO Scorecard
Overall / buy / reduce / exit accuracy, false positives (BUY that went the wrong way), false negatives (REDUCE/EXIT that went the wrong way), average alpha. `holdAccuracy` is honestly `null` — this recommendation engine's `RecommendationAction` enum is `BUY | REDUCE | EXIT` and has never produced a HOLD recommendation; reporting a fabricated number for an action that doesn't exist would be dishonest.

### 5. Evidence Scorecard
Per evidence-matrix category (the same 10 mission-named categories from Sprint 37's `evidenceMatrixService`): usage frequency, win rate, average alpha, average confidence — derived from real per-member evidence citations (`supportingEvidence`/`counterEvidence[].category`) across graded outcomes. A category with zero real citations simply doesn't appear in the output.

### 6. Explainability History
`decisionTraceExplainabilityService.js` (Sprint 39) now also returns `finalOutcome` (the real `Outcome` row, `null` before grading) and `lifecycle` (the real ordered transition history) alongside the existing original recommendation, committee, evidence, and confidence — all read-only, none of it able to rewrite the immutable `DecisionTrace`.

### 7. Internal Quality API
`/v2/quality-platform/*` — recommendation lifecycle, committee scorecard (single window + a rollup of all three mission-named windows), CIO scorecard, evidence scorecard. Every route is read-only; no public UI was added, per this sprint's explicit constraint.

## Verification Summary

- **Full backend regression suite:** `node --test --test-concurrency=1` — **516/516 passing, 0 failures.** (`--test-concurrency=1` avoids a known artifact where Node's default per-file worker parallelism lets independent test files race against the same shared Postgres test database and pollute each other's row counts — confirmed harmless by re-running the affected files in isolation before this run; not a code defect.)
- **Full frontend regression suite:** `npx vitest run` — **164/164 passing** (unchanged from before this sprint; no frontend code was touched, matching the "no UI redesign" constraint).
- **Production build:** clean, unchanged output.
- **No regression required a fix** — the full suite passed on the first concurrency-corrected run; no root-cause investigation was needed this pass.
- **48 new tests added this sprint**, all passing individually and as part of the full suite: lifecycle integrity (6), performance engine (5), lifecycle-integrated outcome grading (2 new + 5 pre-existing updated), scorecard historical simulation with hand-computed expected values (7), explainability history extension (1 new + 1 updated), quality-platform route integration (7).

## Known Limitations

- **`PAPER_TRADED` has no automatic production trigger.** The only paper-trading path in this codebase (`useVirtualPortfolio.js`, localStorage-driven) operates on `overview.alphaDiscovery` candidates, not real `Recommendation` ids — there's no natural hook to attach a lifecycle event to without either changing that legacy system's data model (a feature change, out of this sprint's "no new functionality" scope) or waiting for the server-owned `PortfolioEngineScreen` to reference recommendations directly (neither exists today).
- **Committee/CIO/evidence scorecards only cover outcomes graded under the unified committee (Sprint 41+).** Any `Outcome` row whose `DecisionTrace.committeeDebate` predates the Sprint 41 unification (or has no committee data at all) is silently excluded — correct behavior (never blend two different committee systems' data), but it means the scorecards start with zero historical depth until enough time passes for new graded outcomes to accumulate.
- **Only the `D1` (24-hour) grading window is ever populated** (unchanged from Sprint 29/31 — `outcomeGradingService` only grades `D1`) — so every scorecard's `averageHoldingPeriodHours` and rolling-window depth is bounded by how many D1-window outcomes exist, not the full W1/M1/M3/M6/Y1 spectrum the `TimeWindow` enum already supports schema-wise.
- **Return-vs-sector-ETF is only available when a recommendation carries a real sector** (i.e., a held position's `portfolioContext.sector`) — market-scan-sourced recommendations (the majority, per Sprint 16's own `symbolSource` breakdown) have no sector today, so `returnVsSectorPct` is honestly `null` for most rows rather than fabricated.
- **Contribution score and disagreement frequency are heuristics**, not the only reasonable definitions of those mission-named metrics — "contribution" is defined here as "supplied the single strongest cited evidence," and "disagreement frequency" as "participated in a DISAGREEMENT-classified committee run." Both are real, computed, and documented in code, but a future sprint could refine the definitions with more historical data to validate against.

## Remaining Technical Debt

1. **No scheduled trigger recomputes scorecards** — every `/v2/quality-platform/*` endpoint computes its answer fresh on each request by re-scanning all matching `Outcome` rows. This is correct and fast at current data volumes but will need caching or a materialized rollup once outcome volume grows significantly.
2. **The evidence scorecard's `usageFrequency` is a rate that can exceed 100%** (multiple members can cite the same category on the same recommendation) — documented in code, but worth revisiting if this metric is ever surfaced to a non-technical audience, since "150% usage frequency" reads oddly without the citation-count context.
3. **`committeeTrackRecordService`'s retirement (Sprint 41) still has no direct replacement** — this sprint's Committee/CIO Scorecards are a genuine, more rigorous successor in spirit (they attribute real win/loss per member from real graded outcomes, which the old file-based store never did), but nobody has explicitly closed that Sprint 41 remaining-gap by pointing at this sprint's scorecards as the intended replacement. Worth a documentation pass.
4. **W1/M1/M3/M6/Y1 grading windows remain unbuilt** — the `TimeWindow` enum, the `Outcome` schema, and this sprint's Performance Engine are all already window-agnostic (the Performance Engine takes a real `startDate` and computes whatever range is needed), but `outcomeGradingService.gradePendingOutcomes()` itself still only ever grades `D1`. Extending it to grade every window on the enum is a natural, bounded next step.

## Recommended Next Priorities

1. **Extend `outcomeGradingService` to grade all six `TimeWindow` values**, not just `D1` — the Performance Engine and Outcome schema are already ready for it; only the grading job's own scheduling/cutoff logic needs to loop over windows.
2. **Backfill a symbol→sector mapping** (even a small static one, matching this sprint's sector→ETF map's own honesty conventions) so `returnVsSectorPct` stops being `null` for the majority of market-scan-sourced recommendations.
3. **Give `PAPER_TRADED` a real trigger** once/if the server-owned `PortfolioEngineScreen` (flagged in Sprint 40's report as the intended eventual default) starts referencing real `Recommendation` ids when opening a position.
4. **Surface these scorecards in a real UI** — deliberately out of scope this sprint ("no UI redesign"), but the internal API is now stable and tested; a future product-facing sprint could expose committee/CIO track records as a trust-building feature, directly addressing Sprint 40's own flagged gap ("committee accuracy tracking was retired, not rebuilt").
5. **Add a scheduled scorecard cache/materialization job** once outcome volume grows enough that on-demand recomputation becomes a real latency concern (not yet, per current data volumes).

## Do Not Push

Confirmed — all 4 commits remain local to `sprint-16-live-data`, not pushed, per every sprint in this engagement's standing instruction.
