// Sprint 31 — Outcome Intelligence (Priority 4). "Surface lessons learned
// from completed recommendations. Explain: what was correct, what was
// wrong, what changed, what we learned. Never rewrite history."
//
// WorldMemoryLesson existed as schema only since Sprint 21B, with no
// production writer anywhere (confirmed by grep before writing anything
// here — the same orphaned-table pattern Sprint 29 found and fixed for
// WorldMemoryPrediction/Outcome). This wires it up for real: every graded
// Outcome (Sprint 29's outcomeGradingService) gets exactly one lesson,
// generated once and never edited (appendLesson exposes create-only; a
// changed understanding writes a NEW lesson referencing the old one via
// supersedesId, it never rewrites the original row).
const worldMemoryRepository = require("./worldMemoryRepository");
const autonomousRecommendationRepository = require("./autonomousRecommendationRepository");

const METHODOLOGY_VERSION = "sprint31-v1";

/**
 * Every sentence is built only from fields the Outcome/Recommendation
 * rows actually carry — no invented causal narrative. When the outcome
 * couldn't be graded (no live quote available), the lesson honestly says
 * so instead of fabricating a correct/incorrect verdict.
 */
function buildLessonText({ symbol, action, predictedConfidence, outcome, reasoning }) {
  if (outcome.gradeLabel === "UNGRADEABLE") {
    return (
      `${symbol} (${action}, predicted confidence ${predictedConfidence ?? "unknown"}/100): ` +
      `could not be graded — ${outcome.ungradeableReason || "no live quote was available for this window"}. ` +
      `What we learned: this outcome adds to the ungraded pool, not the calibration sample — it neither confirms nor challenges the ${action} thesis.`
    );
  }

  const returnPct = outcome.windowReturnPct !== null ? Number(outcome.windowReturnPct).toFixed(2) : null;
  const directionText = returnPct !== null ? `price moved ${returnPct >= 0 ? "+" : ""}${returnPct}% over the ${outcome.timeWindow} window` : "price movement over the window was not recorded";

  if (outcome.directionCorrect === true) {
    return (
      `${symbol} (${action}, predicted confidence ${predictedConfidence ?? "unknown"}/100): ${directionText}, confirming the predicted direction. ` +
      `What was correct: the ${action} thesis played out as predicted. ` +
      `What we learned: this outcome supports the reasoning behind it${reasoning ? ` (${reasoning})` : ""} — feeds into this action type's calibration going forward.`
    );
  }

  if (outcome.directionCorrect === false) {
    return (
      `${symbol} (${action}, predicted confidence ${predictedConfidence ?? "unknown"}/100): ${directionText}, contradicting the predicted direction. ` +
      `What was wrong: the ${action} thesis did not play out within the ${outcome.timeWindow} window. ` +
      `What changed: the real price move diverged from the reasoning at the time${reasoning ? ` ("${reasoning}")` : ""}. ` +
      `What we learned: confidence at this level may be miscalibrated for ${action} calls in this window — feeds into calibration tracking, not into today's live scoring.`
    );
  }

  return (
    `${symbol} (${action}, predicted confidence ${predictedConfidence ?? "unknown"}/100): ${directionText}, but direction correctness could not be determined. ` +
    `What we learned: this outcome is recorded but inconclusive.`
  );
}

async function generateLessonsFromOutcomes() {
  const pendingOutcomes = await worldMemoryRepository.listOutcomesWithoutLesson();
  const results = [];

  for (const outcome of pendingOutcomes) {
    try {
      const recommendation = await autonomousRecommendationRepository.getById(outcome.recommendationId);

      const lessonText = buildLessonText({
        symbol: outcome.symbol,
        action: outcome.action,
        predictedConfidence: recommendation ? Math.round(Number(recommendation.confidenceScore)) : null,
        outcome,
        reasoning: recommendation?.reasoning || null,
      });

      const lesson = await worldMemoryRepository.appendLesson({
        outcomeId: outcome.id,
        lessonText,
        methodologyVersion: METHODOLOGY_VERSION,
      });
      results.push(lesson);
    } catch (error) {
      // one outcome's lesson-generation failure must never block the batch
    }
  }

  return { generated: results.length, lessons: results };
}

async function listRecentLessons({ limit = 20 } = {}) {
  return worldMemoryRepository.listRecentLessons({ limit });
}

module.exports = {
  generateLessonsFromOutcomes,
  listRecentLessons,
  buildLessonText,
};
