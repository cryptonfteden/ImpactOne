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

const METHODOLOGY_VERSION = "sprint29-v1";
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
        methodologyVersion: METHODOLOGY_VERSION,
        dataSourceSnapshot: { windowStartPrice, windowEndPrice },
      });
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
};
