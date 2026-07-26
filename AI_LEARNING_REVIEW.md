# AI Learning Review — Phase X10
## Chief AI Scientist — Adaptive Intelligence Architecture

**Scope discipline:** UI and implementation quality are explicitly out of scope. This document evaluates one thing only — whether ImpactOne's architecture constitutes a genuine *learning system*, i.e. one whose future outputs are causally changed by its own past performance.

---

## 1. Learning Engine

**What is real:** a complete, honest outcome-grading pipeline exists.
- `outcomeGradingService.js` grades each recommendation's D1 (24h) window against a real subsequent quote, produces `gradeLabel` (`CORRECT`/`PARTIALLY_CORRECT`/`INCORRECT`/`UNGRADEABLE`), and — since Sprint 42 — real benchmark/risk-adjusted-return fields via `performanceEngineService`.
- `calibrationReportService.js` groups graded outcomes by action-family (BUY/REDUCE/EXIT), computes expected-vs-actual hit rate, and an honest `earlier-half vs recent-half` calibration trend — explicitly refusing to report anything below `MIN_SAMPLE_SIZE = 5`.
- `learningLoopService.js` aggregates `RecommendationFeedback`, outcome hit rate, and theme-evolution signals into one internal "learning signals" object.

**The decisive finding, stated in the code's own comments:** `learningLoopService.js`'s file header states plainly — *"This module is deliberately read-only and one-directional: it is never imported by `autonomousRecommendationEngine.js` … or by `personalIntelligenceService.js` … grep confirms zero references either direction."* This is not an inference; it is the author's own documented design.

Confirmed independently: `autonomousRecommendationEngine.js`'s `computeQualityScore()` and its `QUALITY_WEIGHTS` (sourceQuality 0.15, evidenceFreshness 0.15, portfolioRelevance 0.2, evidenceAgreement 0.2, dataCompleteness 0.1, modelConfidence 0.2) are hardcoded constants. Nothing in the generation path reads `hitRate`, `confidenceCalibration`, or any other outcome-derived signal before producing the next recommendation.

**Verdict: The system measures itself honestly. It does not learn from what it measures.** Every recommendation this quarter is scored by the exact same fixed formula as the first one this platform ever produced, regardless of how many of the intervening ones turned out right or wrong.

## 2. Market Memory (World Memory)

The World Memory model (`WorldMemoryRecord` spine + satellites: `WorldMemoryLesson`, `WorldMemoryCausalLink`, `WorldMemoryPrediction`, `Outcome`) is a real, append-only schema, genuinely well-designed for historical integrity (no update path exists on any of these tables — confirmed by repository-level test coverage per repo history).

**Lesson generation is real and consumed — but only for read-only display, not for learning.** `worldMemoryRepository.listOutcomesWithoutLesson()` finds graded outcomes that haven't yet produced a lesson (Sprint 31, Outcome Intelligence); `listRecentLessons()` / `getLessonForOutcome()` are real read functions with real callers (the Decision Review surface, per the Sprint 32 code comment). This is genuine memory-formation-and-recall — but recall here means "show a person what was learned," not "change what the system does next." No lesson is ever read by `autonomousRecommendationEngine.js`, the committee, or the scoring formulas.

**Verdict: Real, honest, append-only memory exists. It is a library, not yet a feedback loop.**

## 3. AI Performance Dashboard

`qualityDashboardService.js` (hit rate, confidence calibration, avg holding period, avg uncertainty, outcome completion) and `ttvMetricsService.js` are both real, correctly-honest aggregations (return `null`, never a misleading `0`, under low sample size). Both are exposed via `GET /v2/quality-dashboard` and `GET /v2/analytics/ttv-metrics`, rendered in `IntelligenceConsoleScreen.jsx` — but gated behind `VITE_DEV_CONSOLE=true`, i.e. an internal, founder/engineer-only tool with no nav entry.

**Verdict: A real, honest self-assessment dashboard exists. It is not connected to anything that acts on what it shows** — the same finding as §1, from a different angle: the platform can *see* its own hit rate, but nothing downstream consumes that number.

## 4. Direct Answer: Does the System Genuinely Improve Over Time?

**No — not architecturally, not yet.** Every real component required for self-improvement already exists in isolation: grading (`outcomeGradingService`), calibration (`calibrationReportService`), lesson formation (`worldMemoryRepository`'s lesson functions), and a dashboard to see it all (`qualityDashboardService`). What is missing is the single connecting piece: a mechanism that reads any of this and adjusts `QUALITY_WEIGHTS`, committee scoring, or source-quality assumptions as a result. As of this review, that piece does not exist anywhere in the codebase — confirmed by direct grep and by the responsible engineer's own code comments stating this is intentional for now ("never allow immediate feedback to bias today's recommendations").

This is a defensible, safety-conscious *design choice* at this stage (it prevents a small, noisy, 2-user beta from over-fitting to a handful of outcomes) — but it means the honest technical answer to "does it improve over time" is no, by design, today.
