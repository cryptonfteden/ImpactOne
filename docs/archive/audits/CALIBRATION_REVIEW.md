# Calibration Review — Phase X11

**Scope:** `backend/services/calibrationReportService.js` (Sprint 31, unchanged since), its live API/UI surface, and fresh empirical numbers pulled directly from the running Postgres database on 2026-07-25.

---

## 1. What the mechanism actually does

`computeCalibrationReports()`:
1. Reads every `Outcome` row where `gradeLabel !== "UNGRADEABLE"` and `directionCorrect !== null`, ordered by `gradedAt` ascending.
2. Groups them by `Outcome.action` ("family": `BUY`/`REDUCE`/`EXIT`).
3. For each family, computes:
   - `expectedConfidence` — average of the linked `WorldMemoryPrediction.predictedConfidence`.
   - `actualOutcomeHitRate` — `% directionCorrect === true`.
   - `calibrationTrend` — splits the family's outcomes at the midpoint index into an "earlier" and "recent" half, computes hit rate for each, and labels `improving` (delta > +5pp), `declining` (delta < −5pp), or `stable`.
4. Below `MIN_SAMPLE_SIZE = 5`, every numeric field is suppressed and replaced with an honest `"More observations required (N so far, need at least 5)."` message. Below `MIN_TREND_HALF_SIZE = 3` per half, the trend specifically (even if the headline number is shown) says `"insufficient data for trend"`.
5. This is exposed publicly at `GET /v2/calibration-reports` and rendered on the real (not developer-only) Recommendations screen per `SPRINT_31_REPORT.md` — this is genuinely user-facing trust content, not an internal dashboard.

This is honest, well-tested code (`calibrationReportService.test.js`, 7 tests, including a dedicated test proving UNGRADEABLE outcomes are always excluded from any family's sample). Nothing in this section is a fabrication finding.

---

## 2. Fresh live numbers (2026-07-25, direct Postgres query, backend Express down but DB reachable)

| Family | Correct | Incorrect | Sample size | Hit rate |
|---|---|---|---|---|
| BUY | 91 | 5 | 96 | **95%** |
| REDUCE | 14 | 24 | 38 | **37%** |
| EXIT | 2 | 0 | 2 | 100% (below `MIN_SAMPLE_SIZE`, would show "insufficient data") |

Two things worth naming plainly:

- **REDUCE recommendations are wrong roughly 6 times out of 10** in the platform's own real graded history. This is exactly the kind of signal `calibrationReportService` exists to surface, and per its own design it *would* surface it faithfully (assuming `expectedConfidence` for REDUCE calls is meaningfully above 37, which — since REDUCE recommendations only trigger above a real conviction threshold — it almost certainly is). This is a real, live, currently-unaddressed calibration gap in the actual product today, not a hypothetical.
- **BUY's 95% hit rate is a real number, but not from 96 independent tests.** Per `LEARNING_LOOP_REVIEW.md` §6, 70% of the underlying `Recommendation` table is exact-content duplicates. A large share of these 96 "observations" are the same BUY call re-stamped every scan cycle, not 96 independently-arrived-at predictions. `calibrationReportService.js` has no deduplication step — it counts rows.

---

## 3. Statistical rigor gaps

None of these are implemented, and none are silently claimed either (the service's honesty about *what it does* show is real) — but the mission asks whether the process is "statistically safe," so each gap is named directly:

1. **No confidence interval / standard error anywhere.** `MIN_SAMPLE_SIZE = 5` and `MIN_TREND_HALF_SIZE = 3` are round, undocumented, non-power-calculated numbers — not derived from a target margin of error or significance level. A 3-vs-3 split hit-rate comparison labeled "improving" at a >5-percentage-point delta has no statistical backing that 5pp is meaningfully different from noise at n=3.
2. **No correction for non-independence.** As above — duplicate-content rows are counted as independent trials. A genuine calibration/statistical-safety pass would need to deduplicate or downweight near-identical recommendations before computing any family's sample size or hit rate.
3. **No Brier score or reliability diagram.** `VISION.md`'s own stated primary success metric is "calibration error... trending toward zero over time, per confidence bucket" — this requires binning by predicted-confidence bucket and comparing to realized frequency (a reliability diagram) or a proper scoring rule (Brier score). The live implementation computes one *average* expected confidence vs. one *aggregate* hit rate per family — a coarser, single-point comparison, not a calibration curve. `OUTCOME_ENGINE_REVIEW.md`'s original 2026-07-12 critique named this exact gap; it is unchanged as of this review.
4. **No time-window differentiation.** Only the `D1` (24-hour) window is ever graded (`GRADING_WINDOW_MS`, confirmed unchanged in `outcomeGradingService.js`), despite the schema modeling 6 windows (`D1/W1/M1/M3/M6/Y1`). A recommendation's stated `timeHorizon` (often "1-3 months") is never actually checked against a matching grading window — calibration is only ever measured against a horizon the recommendation didn't claim to be judged on.
5. **The trend label is descriptive, not causal or predictive.** "Improving"/"declining"/"stable" describes what already happened to two halves of a historical sample; it makes no forecast and, per §1 of `LEARNING_LOOP_REVIEW.md`, feeds no adjustment back into how the next prediction's confidence is generated.

---

## 4. Direct answer: "Can confidence become better calibrated over time?"

**Split answer, and the split is the finding:**

- **Can calibration be *measured* over time, honestly, with an appropriate "not enough data yet" gate?** Yes — `calibrationReportService.js` does this today, live, and does it without fabricating precision it doesn't have.
- **Does the platform's confidence *actually get better calibrated* as a result?** No. `modelConfidence` in `computeQualityScore()` is still `convictionScore`, computed the same way regardless of what `calibrationReportService` reports. A REDUCE recommendation generated tomorrow will carry the same confidence-generation logic as one generated a year ago, even though the platform's own real history shows REDUCE confidence should currently be trusted less than BUY confidence.

**This is a measurement system, not yet a calibration system.** The distinction matters for certification: the mission asks whether confidence "can become better calibrated," which requires the second half, not just the first.
