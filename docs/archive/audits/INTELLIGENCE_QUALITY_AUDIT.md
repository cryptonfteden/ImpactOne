# Intelligence Quality Audit
## Sprint 42 — Can the Measurement System Answer Hard Business Questions?

**Method:** this audit assumes the implementation is complete and does not judge code quality. It asks one question of every table, service, and field: *if someone asked this system a hard question about its own performance right now, could it actually answer — using data that already exists — or would it have to guess, aggregate something else instead, or simply fail?* Findings are based on direct reading of `schema.prisma`, the outcome/grading/calibration/quality-dashboard services, the committee coordinator, and the autonomous recommendation engine — not on live queries, since the backend remains unreachable this session (see below).

**A note on today's environment:** the backend is still down (confirmed via port check — only the frontend's port is listening). This does not block this particular audit, because the mission is to judge the *measurement system's design*, not to run it. Everything below is a static capability audit: could this schema and this pipeline answer the question, not did it today.

---

## Question-by-Question Verdict

### 1. Which committee member created the most alpha?
**Cannot be answered. Missing field: no link between an individual committee member's vote and a graded `Outcome` exists anywhere in the schema.**

`DecisionTrace.committeeDebate` stores each member's vote as unstructured JSON (`expertVotes`, by design, per `committeeCoordinator.js`'s explicit rule that votes are never blended into one number). But nothing in `Outcome` — the one table that actually knows whether a recommendation was right — references a member. There is no `CommitteeVote` table with a `memberId` foreign key and a link to `Outcome.grade`. Even if one existed, "alpha" itself (return above a benchmark) is not computed at the recommendation level at all — see #4.

### 2. Which evidence category performs worst?
**Cannot be answered. Missing field: evidence items are stored as opaque JSON blobs, never tagged with a stable, indexed category and never linked individually to grading outcome.**

`Recommendation.evidence`, `DecisionTrace.inputEvidence`, and `DecisionTrace.evidenceReferences` are all `Json`. `CanonicalEvent.category` exists and is a real indexed string field on ingested events — but nothing connects a specific `CanonicalEvent.category` to whether the recommendation it fed into was later graded correct. To answer this question would require, at minimum, a queryable `outcomeId`/`evidenceCategory` join row per contributing evidence item, which does not exist.

### 3. Which recommendation type underperforms?
**Answerable today.** `calibrationReportService.computeCalibrationReports()` already groups every graded `Outcome` by `action` (BUY/REDUCE/EXIT — the closest proxy this system has to "recommendation type") and reports sample size, expected confidence, actual hit rate, and calibration trend, gated behind a minimum sample size of 5. This is one of the few genuinely working answers in the system.

### 4. Which confidence levels are overconfident?
**Cannot be answered as asked — only a single aggregate number exists, not a calibration curve.** `qualityDashboardService.computeQualityDashboard()` computes one blended `confidenceCalibration` score across *all* graded outcomes. Nothing buckets predictions by confidence decile (e.g., 90–100% vs. 50–60%) and compares each bucket's stated confidence to its actual hit rate — which is the actual definition of an overconfidence question. The raw ingredients (`WorldMemoryPrediction.predictedConfidence`, `Outcome.directionCorrect`) exist and this is derivable, but it is not built.

### 5. Does high confidence actually outperform low confidence?
**Cannot be answered — same missing aggregation as #4.** No service groups outcomes by confidence bucket and compares realized returns or hit rates across buckets. This is the single most important question a "confidence score" feature can be asked, and today it is un-askable without writing new aggregation code.

### 6. Which sector produces the highest success rate?
**Cannot be answered. Missing field: neither `Recommendation` nor `Outcome` stores a sector.** Sector only appears in the JSON `explanation`/`decisionTrace` payload, and only when the symbol is a currently-held portfolio position (pulled from `Position.sector` at generation time) — recommendations for symbols not currently held carry no sector attribution at all. A sector-success-rate query would require joining `Outcome.symbol` against an external symbol→sector mapping computed after the fact, because the data was never captured at the point of decision for most recommendations.

### 7. Can the system distinguish luck from skill?
**No.** Three separate gaps compound here: (a) alpha vs. a benchmark is never computed at the recommendation level (`Outcome.benchmarkReturnPct` and `Outcome.riskAdjustedReturnPct` are real schema columns, created by migration, and **never written to by any service in the codebase** — confirmed by a full-repo search), so a "hit" cannot be distinguished from the whole market moving; (b) the only statistical gate in the system is `MIN_SAMPLE_SIZE = 5`, which is a display threshold, not a significance test — there is no variance, confidence interval, or p-value computed anywhere; (c) only one grading window (`D1`, 24 hours) is actually graded today, despite the schema supporting six (`D1/W1/M1/M3/M6/Y1`) — a 24-hour hit rate is dominated by short-term noise, which is close to the textbook definition of a system that cannot yet separate luck from skill.

---

## Structural Audits

### Lifecycle Completeness
Partial. A recommendation's lifecycle is real and traceable end-to-end for status (`ACTIVE → SUPERSEDED/EXPIRED`, no deletes — confirmed no delete method exists in `autonomousRecommendationRepository.js`) and for the prediction→outcome pipeline (`WorldMemoryPrediction → Outcome`, one row, immutable). But the lifecycle stops short of the metric that matters most: `qualityScore` is computed once, at creation, from input-side heuristics (`sourceQuality`, `evidenceFreshness`, `portfolioRelevance`, `evidenceAgreement`, `dataCompleteness`, `modelConfidence` in `autonomousRecommendationEngine.js`) and is never revisited, corrected, or reconciled against the `Outcome` it eventually produces. The loop from "we said this was high quality" to "was it?" never closes.

### Historical Integrity
Weak in one specific place: `Outcome.recommendationId` is a plain `String` column with **no `@relation` to `Recommendation`** in the schema — unlike almost every other foreign key in this codebase, it is not enforced at the database level. Every `Outcome` is only as trustworthy as the assumption that whatever wrote it looked up the right ID; nothing in the schema itself guarantees it.

### Metric Validity
Mixed. The BUY/REDUCE/EXIT calibration report is a valid, real aggregation over real graded data. But the headline "quality" and "confidence" scores users actually see are not validated against outcomes at all (see Lifecycle Completeness) — they are internally consistent (computed the same way every time) but not *externally* valid (never checked against reality).

### Survivorship Bias
Low risk on the deletion axis (nothing is ever deleted — confirmed above), which is good discipline. But real risk on the universe axis: see Selection Bias below — a system that only ever evaluates a small, fixed set of symbols/scenarios cannot claim its success rate generalizes.

### Look-Ahead Bias
No evidence found of future data leaking into a recommendation's own inputs — `windowStartPrice` is frozen from `evidence.currentPrice` at creation time, and grading only ever reads a later, real quote. This is one of the audit's cleaner results.

### Selection Bias
Real and significant. `autonomousMarketService.js`'s `AUTONOMOUS_SCAN_UNIVERSE` and `DEFAULT_WATCHLIST` (`["AAPL", "NVDA", "TSLA"]`) are hardcoded, fixed sets of symbols and headline-scenario templates — not a systematic or representative scan of the investable universe. Any aggregate hit rate this system reports is a hit rate on a small, curated, human-chosen sample, not a random or representative one, and nothing distinguishes "the strategy works" from "we only ever tested it on three large, historically strong mega-caps."

### Metric Gaming Risk
The most important structural finding of this audit: `qualityScore` and `confidenceScore` are computed by the exact same engine (`autonomousRecommendationEngine.js`) that produces the recommendation they are meant to score — a self-graded exam. Nothing routes the independently-graded `Outcome` data back into how quality or confidence is computed for future recommendations. This is confirmed explicitly in `learningLoopService.js`'s own header comment: it is "deliberately read-only and one-directional... never imported by `autonomousRecommendationEngine.js`... exists purely to surface what the platform has learned, for internal visibility." In other words, the system already knows it doesn't close this loop — it says so in its own code comments.

---

## Summary Table

| Question | Answerable today? | Missing field / gap |
|---|---|---|
| Most-alpha committee member | No | No member↔outcome link; no alpha field populated |
| Worst evidence category | No | Evidence is untagged JSON, not linked to grading |
| Underperforming recommendation type | **Yes** | — |
| Overconfident confidence levels | No | No confidence-bucketed calibration curve |
| High vs. low confidence outperformance | No | Same — no bucketed aggregation exists |
| Best-performing sector | No | Sector not stored on Recommendation/Outcome |
| Luck vs. skill | No | No benchmark-relative alpha; no significance testing; only 24h window graded |
