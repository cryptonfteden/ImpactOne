// Sprint 32 — Decision Review (Priority 3). "For every recommendation
// create a complete review page. Timeline. Evidence. Thesis evolution.
// Outcome. Lesson. Calibration. Everything traceable." A read-only
// aggregator over data this engagement already computes and persists —
// no new engine, no new writer. Every section is honestly null/empty
// when the real data doesn't exist yet (e.g. no Outcome until the D1
// window has elapsed), never fabricated to make the page look complete.
const autonomousRecommendationRepository = require("./autonomousRecommendationRepository");
const worldMemoryRepository = require("./worldMemoryRepository");
const calibrationReportService = require("./calibrationReportService");

function notFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

async function getDecisionReview(recommendationId) {
  const recommendation = await autonomousRecommendationRepository.getById(recommendationId);
  if (!recommendation) {
    throw notFound("Recommendation not found.");
  }

  const [decisionTrace, symbolHistory, feedback] = await Promise.all([
    autonomousRecommendationRepository.getDecisionTraceByRecommendationId(recommendationId),
    autonomousRecommendationRepository.listAll({ symbol: recommendation.symbol, limit: 100 }),
    autonomousRecommendationRepository.listFeedbackForRecommendation(recommendationId),
  ]);

  const outcome = await worldMemoryRepository.getOutcomeForRecommendation(recommendationId);
  const lesson = outcome ? await worldMemoryRepository.getLessonForOutcome(outcome.id) : null;

  const calibrationReport = await calibrationReportService.computeCalibrationReports();
  const calibrationForFamily = calibrationReport.families.find((family) => family.family === recommendation.action) || null;

  // Timeline: the same real recommendation history for this symbol,
  // oldest first, so a review page can render exactly how the thesis
  // moved over time — never re-derived differently than the
  // Recommendations screen's own "What changed" timeline (Sprint 27/29).
  const timeline = symbolHistory
    .slice()
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((entry) => ({
      id: entry.id,
      createdAt: entry.createdAt,
      action: entry.action,
      status: entry.status,
      confidenceScore: Number(entry.confidenceScore),
      reasoning: entry.reasoning,
      isCurrent: entry.id === recommendationId,
    }));

  return {
    recommendation: {
      id: recommendation.id,
      symbol: recommendation.symbol,
      action: recommendation.action,
      status: recommendation.status,
      confidenceScore: Number(recommendation.confidenceScore),
      qualityScore: Number(recommendation.qualityScore),
      riskScore: Number(recommendation.riskScore),
      riskLabel: recommendation.riskLabel,
      reasoning: recommendation.reasoning,
      createdAt: recommendation.createdAt,
      expiresAt: recommendation.expiresAt,
    },
    evidence: recommendation.evidence,
    explanation: recommendation.explanation,
    decisionTrace,
    timeline,
    outcome,
    lesson,
    calibration: calibrationForFamily,
    feedback,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { getDecisionReview };
