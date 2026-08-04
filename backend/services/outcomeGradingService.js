// Sprint 29 — Feedback Intelligence Layer, Priority 1 (Outcome Pipeline).
// WorldMemoryPrediction/Outcome existed since Sprint 21B as schema-only,
// with no grading algorithm ("a future grading engine has somewhere real
// to write" — see the Outcome model's own schema comment). This is that
// grading engine's first version: reuses the existing finnhubService
// quote lookup and the entry price already persisted on each
// Recommendation's own evidence.currentPrice — no new price-tracking
// mechanism, no new AI model.
const worldMemoryRepository = require("./worldMemoryRepository");
const autonomousRecommendationRepository = require("./autonomousRecommendationRepository");
const finnhubService = require("./finnhubService");
// Sprint 42 — Intelligence Quality Platform.
const performanceEngineService = require("./qualityPlatform/performanceEngineService");
const recommendationLifecycleService = require("./qualityPlatform/recommendationLifecycleService");

const METHODOLOGY_VERSION = "sprint29-v1";
// Phase D1 — Learning Data Remediation. Identifies which real version of
// the benchmark-population pipeline (performanceEngineService, Sprint 42)
// computed this row's benchmark fields — required so a future learning
// process can distinguish rows benchmarked under different real pipelines
// rather than assuming they're comparable. Only ever set alongside a real
// benchmark (never on its own) — see the benchmarkVersion assignment below.
const BENCHMARK_PIPELINE_VERSION = "d1-v1";
const GRADING_WINDOW_MS = 24 * 60 * 60 * 1000; // D1 — the only window graded this sprint.

// A BUY is graded correct if price rose over the window; an EXIT/REDUCE
// (avoiding or cutting exposure) is graded correct if price fell — the
// action's own real intent, not a fabricated symmetric threshold.
function computeDirectionCorrect(action, windowReturnPct) {
  if (!Number.isFinite(windowReturnPct)) return null;
  if (action === "BUY") return windowReturnPct > 0;
  if (action === "EXIT" || action === "REDUCE") return windowReturnPct < 0;
  return null;
}

function computeGrade({ directionCorrect, windowReturnPct }) {
  if (directionCorrect === null) {
    return { grade: null, gradeLabel: "UNGRADEABLE" };
  }
  const magnitude = Math.min(Math.abs(windowReturnPct) * 10, 100);
  if (directionCorrect) {
    return { grade: Math.max(50, magnitude), gradeLabel: magnitude >= 20 ? "CORRECT" : "PARTIALLY_CORRECT" };
  }
  return { grade: Math.max(0, 50 - magnitude), gradeLabel: "INCORRECT" };
}

async function gradePendingOutcomes({ timeWindow = "D1" } = {}) {
  const cutoff = new Date(Date.now() - GRADING_WINDOW_MS);
  const pending = await worldMemoryRepository.listPredictionsPendingOutcome({ olderThan: cutoff, timeWindow });
  const results = [];

  for (const prediction of pending) {
    try {
      const recommendation = await autonomousRecommendationRepository.getById(prediction.recommendationId);
      if (!recommendation) continue;

      const windowStartPrice = Number(recommendation.evidence?.currentPrice);
      const quoteResult = await finnhubService.getQuote(recommendation.symbol).catch(() => null);
      const windowEndPrice = Number(quoteResult?.quote?.price);

      if (!Number.isFinite(windowStartPrice) || windowStartPrice === 0 || !Number.isFinite(windowEndPrice)) {
        const ungradeable = await worldMemoryRepository.createOutcome({
          recommendationId: recommendation.id,
          decisionTraceId: prediction.decisionTraceId,
          worldMemoryPredictionId: prediction.id,
          symbol: recommendation.symbol,
          action: prediction.predictedAction,
          timeWindow,
          windowStartPrice: Number.isFinite(windowStartPrice) ? windowStartPrice : 0,
          gradeLabel: "UNGRADEABLE",
          ungradeableReason: "No live quote available to grade this window.",
          methodologyVersion: METHODOLOGY_VERSION,
          dataSourceSnapshot: { quoteAvailable: Boolean(quoteResult) },
        });
        results.push({ recommendationId: recommendation.id, gradeLabel: ungradeable.gradeLabel });
        continue;
      }

      const windowReturnPct = ((windowEndPrice - windowStartPrice) / windowStartPrice) * 100;
      const directionCorrect = computeDirectionCorrect(prediction.predictedAction, windowReturnPct);
      const { grade, gradeLabel } = computeGrade({ directionCorrect, windowReturnPct });

      // Sprint 42 — Performance Engine. Best-effort: a real price-history
      // fetch failure must never block grading itself, so this degrades to
      // null (honestly absent metrics), never a fabricated number.
      const performanceMetrics = await performanceEngineService
        .computePerformanceMetrics({
          symbol: recommendation.symbol,
          entryPrice: windowStartPrice,
          startDate: recommendation.createdAt,
          sector: recommendation.portfolioContext?.sector || null,
          expectedUpside: recommendation.expectedUpside,
          expectedDownside: recommendation.expectedDownside,
        })
        .catch(() => null);

      const outcome = await worldMemoryRepository.createOutcome({
        recommendationId: recommendation.id,
        decisionTraceId: prediction.decisionTraceId,
        worldMemoryPredictionId: prediction.id,
        symbol: recommendation.symbol,
        action: prediction.predictedAction,
        timeWindow,
        windowStartPrice,
        windowEndPrice,
        windowReturnPct,
        directionCorrect,
        grade,
        gradeLabel,
        benchmarkSymbol: performanceMetrics ? "SPY" : null,
        benchmarkReturnPct: performanceMetrics?.spyReturnPct ?? null,
        // Phase D1 — Alpha (riskAdjustedReturnPct) is only ever populated
        // in the same branch where a real benchmark was actually computed
        // — never before a benchmark exists.
        riskAdjustedReturnPct: performanceMetrics?.returnVsSpyPct ?? null,
        benchmarkVersion: performanceMetrics ? BENCHMARK_PIPELINE_VERSION : null,
        methodologyVersion: METHODOLOGY_VERSION,
        dataSourceSnapshot: { windowStartPrice, windowEndPrice },
        performanceMetrics,
      });

      // Sprint 42 — Recommendation Lifecycle: a graded outcome is a real
      // terminal transition. UNGRADEABLE stays whatever it was (no honest
      // success/failure signal exists), never forced into either bucket.
      if (directionCorrect === true) {
        await recommendationLifecycleService.recordTransitionSafely({ recommendationId: recommendation.id, state: "SUCCEEDED", metadata: { windowReturnPct, timeWindow } });
      } else if (directionCorrect === false) {
        await recommendationLifecycleService.recordTransitionSafely({ recommendationId: recommendation.id, state: "FAILED", metadata: { windowReturnPct, timeWindow } });
      }

      results.push({ recommendationId: recommendation.id, gradeLabel: outcome.gradeLabel });
    } catch (error) {
      // One recommendation's grading failure must never block the batch —
      // it simply stays pending and is retried on the next run.
    }
  }

  return { graded: results.length, results };
}

module.exports = {
  gradePendingOutcomes,
  computeDirectionCorrect,
  computeGrade,
  METHODOLOGY_VERSION,
  BENCHMARK_PIPELINE_VERSION,
};
