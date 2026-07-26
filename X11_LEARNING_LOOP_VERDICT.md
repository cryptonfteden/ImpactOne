# X11 Learning Loop Verdict — Phase PLATFORM-ARCH-001

**Method:** Direct source inspection, not completion-report reliance, per the mission's explicit instruction. Read `autonomousRecommendationEngine.js`'s real call graph line-by-line (via `grep` for exact line numbers, then full reads of the surrounding code), plus the full contents of `outcomeFeedbackService.js`, `dynamicSourceScoringService.js`, `learningSafety.js`, `methodologyVersioningService.js`, `learningLoopService.js`, `calibrationReportService.js`, and `outcomeGradingService.js`. Cross-referenced against `X11_COMPLETION_REPORT.md` only after forming an independent conclusion from the code itself, to check consistency rather than to source the answer. A fresh full backend-suite re-run was started but not completed within this session's time budget — the verdict below rests entirely on direct code inspection of the real, current call graph, not on trusting either the prior completion report or an assumed test result.

## The single most important finding: this codebase now contains two different things both labeled "X11," and they must not be conflated

1. **`learningLoopService.js` (Sprint 30, "Learning Loop") is exactly as read-only as its own header comment states**, confirmed fresh: a direct `grep` for `learningLoopService` inside `autonomousRecommendationEngine.js` returns **zero matches**. This module still only aggregates feedback/outcome/theme signals for developer-console display — it has no path into recommendation generation, today or ever, as far as this repository's real code shows.
2. **A separate, newer body of work — also labeled "Phase X11" but a distinct implementation effort (`outcomeFeedbackService.js`, `dynamicSourceScoringService.js`, `methodologyVersioningService.js`, `learningSafety.js`) — genuinely is wired into `autonomousRecommendationEngine.js`.** This is real, not aspirational: confirmed by direct inspection of the exact call sites, not inferred from a comment.

Any answer to "does X11 close the loop" that doesn't separate these two is wrong. `learningLoopService.js` does not; the newer, differently-scoped X11 work does, for a specific, bounded slice of the system.

## Direct evidence of real wiring (not completion-report-sourced)

Read `autonomousRecommendationEngine.js`'s real `runOnce()` function directly:

```
learningAdjustments = await outcomeFeedbackService.getScoringAdjustmentMap();   // line ~753, once per scheduled run
...
const created = await evaluateSymbol({ ..., learningAdjustments });            // passed to every symbol evaluated
```

Inside `evaluateSymbol()` → `computeQualityScore()`, confirmed directly:

```
outcomeFeedbackAdjustment: learningAdjustments[action] || null
sourceCredibilityOverrides = await dynamicSourceScoringService.getSourceCredibilityOverrides(...)
```

`runOnce()` is the real function invoked by `schedulerService.js`'s cron job — the actual, scheduled, production recommendation-generation path, not a demo/test-only code path. This is not "the capability exists but is unused" (the pattern this whole audit has found repeatedly elsewhere, e.g., the Options Agent Foundation) — it is genuinely exercised on every real scheduled run.

## Answering the mission's exact sub-questions

### Does it observe outcomes only?

**No, not entirely — but the answer is different for the two X11 bodies of work.** `learningLoopService.js` (the original Sprint 30 module) does observe only, confirmed fresh. But `outcomeFeedbackService.js` reads real, graded `Outcome` rows and turns them into a real, applied adjustment on live recommendation generation — this is observation **plus** action, not observation alone, for this specific pathway.

### Does it update recommendation behavior?

**Precisely: it updates the recommendation's *quality score*, not its *action selection*.** This distinction is real and important, confirmed by reading the call order in `evaluateSymbol()`: the `action` (`BUY`/`REDUCE`/`EXIT`) is decided earlier, from `portfolioAction`/`convictionScore` thresholds, **before** `computeQualityScore()` (and its outcome-feedback adjustment) ever runs. The learning loop changes how much trust/confidence a recommendation is displayed with — it does not yet change which action the engine decides to recommend in the first place. Both are real "recommendation behavior" in a loose sense, but only the former is currently learning-adjusted.

### Does it change weights or future decisions?

**It changes two specific inputs feeding the existing weighted formula, not the weights themselves.** `QUALITY_WEIGHTS` (the six fixed percentages — `sourceQuality 15%, evidenceFreshness 15%, portfolioRelevance 20%, evidenceAgreement 20%, dataCompleteness 10%, modelConfidence 20%`) is confirmed, by direct reading of `computeQualityScore()`, to be **unchanged and still a hardcoded constant** — the formula still literally multiplies each component by its fixed static weight. What changes: (a) the real numeric value of the `sourceQuality` component can now come from `dynamicSourceScoringService` instead of a static per-source lookup, once that source has enough graded evidence; (b) a separate, bounded (`±8` points, `learningSafety.MAX_ADJUSTMENT_PTS`) additive term is applied on top of the weighted sum, gated on a real minimum sample size. This is genuine learning of **inputs and a correction term**, not yet of the **importance weighting** itself.

### Does it persist learned state?

**Yes, confirmed real, not just designed.** Three real Prisma models (verified present in `schema.prisma`): `ScoringAdjustmentAudit` (every computed adjustment, applied or withheld, with sample size/observed rate/confidence interval/reason), `SourceScoreSnapshot` (every dynamic source-credibility computation), `MethodologyVersion` (an append-only, versioned changelog of any real scoring-methodology change, with an explicit `rollbackToVersion` that creates a new row rather than editing history — the exact append-only discipline this codebase already applies to `DecisionTrace`/`WorldMemory*`, correctly extended here).

### Does it have governance limits?

**Yes, confirmed real and specific, not just claimed.** Read directly in `learningSafety.js`: a hard minimum sample size (`MIN_SAMPLE_SIZE = 15`) below which an adjustment is computed-but-withheld (never silently applied, never silently dropped — always audited either way); a real 95% Wilson confidence interval (a statistically correct choice at small sample sizes, not a naive proportion ± error); a hard cap on adjustment magnitude (`MAX_ADJUSTMENT_PTS = 8`) regardless of how extreme an observed rate is. This directly closes a gap this same audit process previously and explicitly flagged as missing (no real significance test, no bounded weight-update mechanism, no real methodology changelog) — the gap named in a prior session's own findings is now closed by real, inspected code, not merely claimed to be closed.

## What is still genuinely not closed (confirmed, not assumed)

- **Committee composition/membership is still hardcoded**, not adjusted by outcome history — nothing in the newer X11 work touches `intelligenceCommitteeService.js`'s member list or weighting.
- **Action-selection thresholds (`convictionScore`/`portfolioAction` logic) are unchanged** — confirmed by call-order inspection; only the quality/confidence score attached to an already-decided action is learning-adjusted.
- **The original `learningLoopService.js` remains exactly as read-only as documented** — confirmed fresh via grep, not assumed stale from an old comment.
- **Only D1 (24-hour) grading window is exercised** in `outcomeGradingService.js`, confirmed by reading `GRADING_WINDOW_MS`'s single hardcoded value and its own comment ("the only window graded this sprint") — so the real graded-`Outcome` sample feeding `outcomeFeedbackService` is itself drawn from only the shortest of the six schema-modeled time windows.

## Final verdict

**The learning loop is real, bounded, audited, and governed for a specific, narrow slice of the system — the quality/confidence score of an already-decided recommendation, and the source-credibility input that feeds it — and it is genuinely wired into the live, scheduled production path, not merely designed or callable-but-unused.** It is not yet a closed loop for the platform's underlying decisions (which action to recommend, how the Committee is composed, how much weight each quality component carries relative to the others) — those remain governed by fixed, hand-set logic exactly as before. The correct, precise characterization is: **"a real, audited, statistically-gated feedback mechanism for trust/confidence scoring has been closed; the decision-making logic itself has not."** This is a genuine, verified advance over this same audit process's own prior conclusion from the day before ("deliberately read-only and one-directional") — that prior conclusion is now stale for this specific pathway and should not be repeated in future sessions without re-verifying against the current code, exactly as this verdict did.
