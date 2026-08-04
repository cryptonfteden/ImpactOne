# Sprint 31 — Making Learning Visible, Measurable, Trustworthy — Final Report

**Branch:** `sprint-16-live-data` (not pushed) · **Commits:** 5 · **Date:** 2026-07-16

## Mission

The platform now learns. This sprint makes that learning visible, measurable, and trustworthy — no new AI engines, no speculative features, only improvements that increase long-term decision quality.

## Priority 1 — Calibration Reports

"For every recommendation family expose: expected confidence, actual outcome, calibration trend, sample size. Only show calibrated metrics when statistically meaningful. Otherwise explicitly state that more observations are required." New `calibrationReportService.computeCalibrationReports` groups real graded `Outcome` rows by their recommendation's action (BUY/REDUCE/EXIT as the "family") — reusing the same `Outcome`/`WorldMemoryPrediction` tables Sprint 29 wired up, no new grading logic.

Below a minimum sample size (5), a family shows only an honest "More observations required (N so far, need at least 5)" message — never a misleading metric computed from too little data. The calibration trend additionally requires its own minimum per-half sample size before comparing earlier-vs-recent hit rate, so a family can have enough total samples to show a headline number while still honestly saying "insufficient data for trend" for the trend specifically. New public `GET /v2/calibration-reports` route and a "Calibration" section on the real Recommendations screen (not developer-only — this is trust-building content for the actual user).

## Priority 2 — Personal Progress

"Allow users to see how their understanding evolved, how their portfolio discipline evolved, how their reading habits evolved. Never gamify. Only educate." New `personalProgressService.computePersonalProgress` reuses only existing data: `RecommendationFeedback`'s DONT_UNDERSTAND ratio trend (Sprint 29) for understanding, `UserMemoryEvent` counts (Sprint 30) for reading habits, and `PerformanceSnapshot`'s real cash-reserve ratio for a discipline-adjacent trend — deliberately named "cash reserve," not oversold as a broader discipline score this data can't actually support.

Every field is either an honest trend label or a real count — no score, points, streak, or badge anywhere (a dedicated test asserts the full JSON response never contains those words). **A real correctness bug was caught by my own test before commit**: the initial trend split compared raw counts between two index-based array halves, which by construction are always near-equal length regardless of actual activity pattern — meaning a genuine burst of recent engagement would still read as "stable." Replaced with a time-based midpoint split (events before vs. after the real midpoint of the elapsed time range), so an actual change in activity rate shows up correctly. New "Your progress" section on the persistent My Profile view only, never shown during onboarding.

## Priority 3 — Improve Morning Brief

"Reduce it to the smallest possible amount of information while preserving full understanding. Every sentence must justify its existence." Auditing Sprint 30's `buildMorningPersonalBrief` found a real redundancy: when the top personally-ranked recommendation, the biggest opportunity, and the action-needed symbol were the same stock (a common case, since all three derive from overlapping data), the brief showed the identical fact up to three times in different words — "Top for you: NVDA — BUY", "Opportunity: NVDA", "Action needed: NVDA — BUY".

Fixed: Opportunity and Action-needed lines now only add a line when they name a symbol "Top for you" hasn't already covered. Verified live: a real Home load now shows two genuinely different symbols (AAPL as top-for-you, TSLA as opportunity) rather than one fact restated three ways.

## Priority 4 — Outcome Intelligence

"Surface lessons learned from completed recommendations. Explain: what was correct, what was wrong, what changed, what we learned. Never rewrite history." `WorldMemoryLesson` existed as schema only since Sprint 21B, with no production writer anywhere (confirmed by grep before building — the same orphaned-table pattern Sprint 29 found and fixed for `WorldMemoryPrediction`/`Outcome`). New `outcomeIntelligenceService.generateLessonsFromOutcomes` writes exactly one lesson per graded `Outcome`, built only from fields the `Outcome`/`Recommendation` rows actually carry — never an invented causal narrative. An `UNGRADEABLE` outcome (no live quote available) gets an honest "could not be graded" lesson instead of a fabricated correct/incorrect verdict.

Create-only, same discipline as every other World Memory table this engagement has touched: `appendLesson` exposes no update — a changed understanding appends a new lesson referencing the old one via `supersedesId`, never rewrites the original row. Runs on the existing recommendation-generation schedule, right after outcome grading. New public `GET /v2/lessons` route and a "Lessons Learned" section on the Recommendations screen.

## Priority 5 — Private Beta Hardening

- **Full regression**: backend and frontend suites run after every priority (5 full passes total this sprint), plus one final consolidated pass: **backend 319/319, frontend 125/125**.
- **Critical-flow browser sweep**: all 12 sidebar screens navigate cleanly with zero console errors; Portfolio's two-click reset confirmation flow verified end-to-end (arm → confirm → cash balance returns to $100,000); the internal `VITE_DEV_CONSOLE`-gated Intelligence Console verified with both the Recommendation Quality Dashboard (Sprint 29) and the Learning Loop panel (Sprint 30) rendering correctly.
- **Every new surface this sprint verified live against the running dev servers**, not just unit-tested: Calibration ("Calibration" section, honest empty state), Personal Progress ("Your progress" on My Profile, honest empty state), the deduplicated Morning Brief, and Lessons Learned (honest empty state, since no D1 grading windows had elapsed at verification time in this fresh dev environment).

## Verification

- **Backend:** 319/319 tests passing (full suite), up from 301 at the start of this sprint.
- **Frontend:** 125/125 tests passing (full suite), up from 121 at the start of this sprint.
- **5 commits**, each preceded by its own test run, none pushed.
- Every priority's live verification used the real dev-DB state rather than seeded fixtures for the browser pass — several checks correctly returned honest "not enough data" empty states (Calibration, Lessons Learned, two of three Personal Progress dimensions) because this fresh environment genuinely hasn't accumulated 24+ hours of graded outcomes yet. That is the expected, honest behavior of a system that has only just started learning from itself, not a bug.

## What still remains (named, not hidden)

- **Every new metric this sprint will read as "insufficient data" until the app has run for real time.** Calibration Reports need 5+ graded outcomes per family; Personal Progress needs 6+ feedback/view/snapshot entries per dimension; Lessons Learned need at least one graded outcome. All of this is honestly gated rather than faked — but it means a fresh demo of this sprint's work will look sparse until the scheduler has run for a day or more. Worth calling out before any demo.
- **Portfolio discipline in Personal Progress is a real but narrow proxy** (cash-reserve ratio trend) — the mission's phrase "portfolio discipline" more naturally suggests adherence to the platform's own stated rules (max 10% per position, max 25% per sector), but no historical per-position-size or per-sector-concentration data is persisted over time today. Cash reserve was chosen because it's the one real, already-persisted signal available; a future sprint that wants a richer discipline metric would need to start persisting concentration snapshots first, not fabricate one from what already exists.
- **Calibration Reports and Lessons Learned are grouped/keyed only by action** (BUY/REDUCE/EXIT), not by sector or symbol. The mission said "for every recommendation family," and action is the cleanest real grouping the data already supports; a finer-grained family (e.g., by sector) is a natural extension once enough volume exists to keep each finer group above the statistical-significance threshold.

## Recommendation

This sprint's defining discipline was refusing to let "make learning visible" become "make learning look more finished than it is." Every new number is gated behind a real sample-size check, every new dimension is honestly labeled by exactly what it measures, and the one metric where the mission's stated intent (portfolio discipline) outran what the data actually supports was named narrowly (cash reserve) rather than oversold. That restraint is worth preserving as more real usage data accumulates and these reports start showing genuinely meaningful numbers instead of "not enough data yet."
