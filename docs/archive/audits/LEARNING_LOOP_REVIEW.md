# Learning Loop Review — Phase X11

**Role:** Chief AI Auditor
**Mission:** Determine whether ImpactOne truly learns from experience.
**Method:** Static code audit of every service touching outcomes, calibration, source scoring, and market memory, cross-checked against a live, read-only query against the running Postgres database (Express backend was down at review time; Postgres was up — see `BLOCKER_CLASSIFICATION.md`/prior session memory for this technique). No code changed. No commits. No implementation.

---

## 0. What "the learning loop" actually consists of today

| Stage | Real component | Status |
|---|---|---|
| 1. Predict | `autonomousRecommendationEngine.js` (`QUALITY_WEIGHTS`, `computeQualityScore`) | Real, live, generates `Recommendation` + `DecisionTrace` |
| 2. Record | `worldMemoryRepository.js` (`WorldMemoryPrediction`) | Real, append-only |
| 3. Grade | `outcomeGradingService.js` (`gradePendingOutcomes`) | Real, D1-window only, `METHODOLOGY_VERSION = "sprint29-v1"` |
| 4. Explain | `outcomeIntelligenceService.js` (`WorldMemoryLesson`) | Real, honest, append-only |
| 5. Aggregate | `calibrationReportService.js`, `qualityDashboardService.js`, `newsSourceScoringService.js`, `marketMemoryService.js` | Real, all read-only |
| 6. **Feed back into stage 1** | — | **Does not exist.** No code path connects any output of stages 3–5 back into `QUALITY_WEIGHTS`, `sourceQualityScore()`, or `computeConvictionScore()`. |

Stage 6 is the load-bearing fact for this entire review. Every other finding below is a variation on "the plumbing to observe is real and honest; the plumbing to act on what was observed does not exist yet."

---

## 1. Outcome feedback — does historical performance influence future recommendations?

**No.** Verified three independent ways:

1. **Static grep-enforced isolation.** `learningLoopService.js`'s own header comment states it is "deliberately read-only and one-directional... never imported by `autonomousRecommendationEngine.js`," and this is enforced by a dedicated test (`learningLoopService.test.js`, "Learning Loop never appears as a dependency of the recommendation engine or the personal ranking engine") that reads both engine files' source at runtime and asserts no `learningLoopService` reference exists.
2. **Import audit.** `autonomousRecommendationEngine.js` (full file read) imports `outcomeGradingService` and `outcomeIntelligenceService` — but only to *trigger grading and lesson-generation as side effects after a recommendation already exists*, never to *read back* a hit rate, calibration trend, or source score into `QUALITY_WEIGHTS` or `computeQualityScore()`. `QUALITY_WEIGHTS` (`sourceQuality .15 / evidenceFreshness .15 / portfolioRelevance .2 / evidenceAgreement .2 / dataCompleteness .1 / modelConfidence .2`) are the same hardcoded object today as in every prior sprint reviewed (Sprint 16 Phase D through Phase X10).
3. **Live data confirms the disconnect is not just theoretical.** Fresh Postgres query (2026-07-25):
   - 554 recommendations, 138 graded outcomes (up from 96 on 2026-07-22 — the engine did run again since the last audit).
   - Outcome hit rate by action: **BUY 91 correct / 5 incorrect (95%)**, **REDUCE 14 correct / 24 incorrect (37%)**, **EXIT 2/0**.
   - Despite REDUCE calls being wrong roughly 63% of the time in the platform's own recorded history, `choosePortfolioAction()`/`buildPortfolioAction()` in `autonomousMarketService.js` still map the same static conviction-score thresholds to the same static REDUCE/EXIT position-size and stop-level guidance as before — the demonstrated poor track record for REDUCE calls has changed nothing about how future REDUCE calls are scored, sized, or worded.

**Verdict on this question: No — the platform records history faithfully but does not yet act on it.**

---

## 2. Dynamic source scoring — can weak sources automatically lose influence?

**No — a real dynamic score exists, but it is not connected to anything that has influence.**

- `newsSourceScoringService.js` (Phase X10 Part 4) is genuinely new, real work: it computes `trustScore` from real `accuracyRate`/`falsePositiveRate` (via the `CanonicalEvent → WorldMemoryRecord → WorldMemoryPrediction → Outcome` chain) and real `avgCredibilityScore`, honestly returning `trustScore: null` with a `trustScoreReason` when a source has no graded outcomes yet — no fabricated default.
- Its own route-registration comment in `backend/routes/index.js` states the honest scope directly: *"Dynamic, outcome-informed trust score per source — **replaces no existing endpoint** (`scoringVocabulary.js`'s static credibility table **remains the live scoring input**; this is a new, internal, read-only view)."*
- The actual live scoring input, confirmed by reading `autonomousMarketService.js` directly, is still `sourceQualityScore()`: a hardcoded `HIGH_QUALITY_NEWS_SOURCES` allowlist (8 outlet names) mapping to a flat `95`, with a flat `60` for literally everything else — unchanged since it was first reviewed in Phase X10 and every session before it.
- **Live data makes this a moot point today regardless of wiring**: `CanonicalEvent.distinct("sourceName")` returns exactly **1** real source platform-wide — `"CFTC Commitments of Traders"` — out of 2 total ingested events. 14 of 15 registered providers still return `[]` unconditionally (`providerFactory.js`'s `honestStubFetch()`, confirmed present and unchanged). A dynamic trust score computed over a 1-source universe cannot yet differentiate anything, wired in or not.

**Verdict on this question: No — the scoring mechanism to detect a weak source now exists, but (a) it isn't wired into generation, and (b) there is only one real source to ever score.**

---

## 3. Methodology versioning — can every model change be audited?

Addressed in depth in `AI_GOVERNANCE_REVIEW.md`. Summary for this document: every graded `Outcome` carries a `methodologyVersion` string, and a fresh `groupBy` query confirms **100% of the 138 graded outcomes carry the exact same value, `"sprint29-v1"`** — the methodology has never actually changed since it shipped. `BENCHMARK_PIPELINE_VERSION = "d1-v1"` is similarly a single, never-varied tag (populated on only 40/138 rows, exactly where a real SPY benchmark was computable). Tagging is real and honest; but with only one value ever observed, "auditability of a methodology change" has never been tested against a real transition — only designed for one (`OUTCOME_INTELLIGENCE_ENGINE.md` §12's `RecalibrationProposal`, confirmed **not present** in `schema.prisma`).

## 4. Calibration — can confidence become better calibrated over time?

Full review in `CALIBRATION_REVIEW.md`. Summary: `calibrationReportService.js` genuinely computes expected-confidence-vs-actual-hit-rate per action family with an honest `MIN_SAMPLE_SIZE = 5` gate and an earlier/recent-half trend label — real measurement exists. But nothing reads this output back to adjust `modelConfidence` (which is just `convictionScore`, unchanged) — so confidence can be *measured* as miscalibrated, and today, per the live REDUCE numbers above, *is* measurably miscalibrated, but has no mechanism to become *better* calibrated on its own.

## 5. Market memory reuse — is history actually reused, or just logged?

**Both — two competing implementations exist, and the one users actually see is not the honest one.**

- `historicalSimilarityService.js` — a hardcoded, 8-event static array (`covid`, `2008`, `ukraine`, `tariff`, `bank`, `rate`, `oil`, `ai`) matched by crude keyword `includes()` checks against arbitrary text, with a **flat 42% similarity score for anything that doesn't match a hardcoded keyword**. This is the version actually wired into the live product: `impactIntelligenceService.js` imports `getHistoricalMatches` from it directly, and `autonomousMarketService.js`'s `deriveHistoricalOutcome()` builds the user-facing `historicalAnalogs`/`bestHistoricalOutcome`/`worstHistoricalOutcome` text from its output — this is what a real user sees today.
- `marketMemoryService.js` (Phase X10 Part 6) is the honest, real replacement: a genuine similarity query over `WorldMemoryRecord` (symbol/sector overlap, real bound of 500 most-recent candidates, disclosed not hidden), composing each match's real `WorldMemoryCausalLink` explanation and real `WorldMemoryPrediction`→`Outcome` history — never a fabricated "here's what happened last time." Its own header comment is explicit that the old stub was "never wired to the real, persisted `WorldMemoryRecord` table." But per `backend/routes/index.js`'s own comment, it "supersedes no route" — it is mounted only as a new, separate, internal read-only endpoint (`/v2/market-memory`), never substituted into `impactIntelligenceService.js`'s live path.
- **Live data shows this second implementation would be starved even if wired in**: `WorldMemoryCausalLink` count = **0**, platform-wide, confirming the Phase X4 finding ("0 causal links in real dev DB, never seeded") is still true today. `marketMemoryService.findSimilarHistory()` would honestly return an empty `previousCausalExplanations` array for every single match right now — correctly honest, but currently contentless.

**Verdict on this question: History is reused today, but by the fabricated-flavor-text version, not the real, evidence-backed one — and the real one has no causal-link data to serve yet even once wired in.**

---

## 6. Cross-cutting observation: duplicate-content contamination undermines every sample-size claim above

A fresh duplicate-content check (same method as the 2026-07-22 Sprint D1 audit) against the live 554-row `Recommendation` table found **388 of 554 rows (70%) are exact-content duplicates** (identical symbol + action + confidenceScore + reasoning) across 18 groups — materially unchanged from D1's 76% finding three days ago. This matters directly for this review: every sample-size gate reviewed above (`calibrationReportService`'s `MIN_SAMPLE_SIZE = 5`, `newsSourceScoringService`'s `predictionQualitySampleSize`) counts *rows*, not *independent observations*. A family showing "96 BUY outcomes, 95% hit rate" is not showing 96 independent tests of the BUY thesis — a large fraction are the same recommendation re-stamped, and any future feedback wiring would learn from this inflated, non-independent sample exactly as confidently as if it were real.

---

## Answers to the mission's five questions

| Question | Answer | Evidence |
|---|---|---|
| Does historical performance now influence future recommendations? | **No** | `QUALITY_WEIGHTS`/`sourceQualityScore` unchanged; grep-enforced non-import test; live REDUCE 37% hit rate has changed nothing |
| Can every model change be audited? | **Only via git, not via a runtime changelog** | 100% of 138 outcomes share one `methodologyVersion`; `RecalibrationProposal` designed, never built |
| Can weak sources automatically lose influence? | **No** | Static allowlist still live; dynamic score exists but unwired; only 1 real source exists to score |
| Can confidence become better calibrated over time? | **It can be measured, not yet corrected** | `calibrationReportService` is real and honest; nothing reads its output back |
| Is the learning process statistically safe? | **Safe only because it is inert — see `AI_GOVERNANCE_REVIEW.md`** | No auto-applied weight change exists anywhere to be unsafe; sample-size gates don't account for 70% duplicate-content contamination |

See `X11_VERDICT.md` for the final certification decision.
