// Sprint 31 — Calibration Reports (Priority 1). "For every recommendation
// family expose: expected confidence, actual outcome, calibration trend,
// sample size. Only show calibrated metrics when statistically
// meaningful. Otherwise explicitly state that more observations are
// required." Reuses the same Outcome/WorldMemoryPrediction tables Sprint
// 29/30 already wired up — no new grading logic, no new AI model, purely
// a real aggregation grouped by "family" (each recommendation action:
// BUY/REDUCE/EXIT).
const { getPrismaClient } = require("../db/prismaClient");

const MIN_SAMPLE_SIZE = 5;
const MIN_TREND_HALF_SIZE = 3;

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function computeTrend(outcomesChronological) {
  if (outcomesChronological.length < MIN_TREND_HALF_SIZE * 2) {
    return { trend: "insufficient data for trend", earlierHitRate: null, recentHitRate: null };
  }

  const midpoint = Math.floor(outcomesChronological.length / 2);
  const earlier = outcomesChronological.slice(0, midpoint);
  const recent = outcomesChronological.slice(midpoint);

  const earlierHitRate = Math.round((earlier.filter((o) => o.directionCorrect === true).length / earlier.length) * 100);
  const recentHitRate = Math.round((recent.filter((o) => o.directionCorrect === true).length / recent.length) * 100);

  const delta = recentHitRate - earlierHitRate;
  const trend = delta > 5 ? "improving" : delta < -5 ? "declining" : "stable";
  return { trend, earlierHitRate, recentHitRate };
}

async function computeCalibrationReports() {
  const prisma = getPrismaClient();
  const outcomes = await prisma.outcome.findMany({
    where: { gradeLabel: { not: "UNGRADEABLE" }, directionCorrect: { not: null } },
    orderBy: { gradedAt: "asc" },
  });

  const predictionIds = outcomes.map((o) => o.worldMemoryPredictionId).filter(Boolean);
  const predictions = predictionIds.length
    ? await prisma.worldMemoryPrediction.findMany({ where: { id: { in: predictionIds } } })
    : [];
  const predictionById = new Map(predictions.map((p) => [p.id, p]));

  const families = new Map();
  for (const outcome of outcomes) {
    if (!families.has(outcome.action)) families.set(outcome.action, []);
    families.get(outcome.action).push(outcome);
  }

  const reports = [];
  for (const [family, familyOutcomes] of families.entries()) {
    const sampleSize = familyOutcomes.length;
    const isStatisticallyMeaningful = sampleSize >= MIN_SAMPLE_SIZE;

    const confidences = familyOutcomes
      .map((o) => predictionById.get(o.worldMemoryPredictionId)?.predictedConfidence)
      .filter((value) => Number.isFinite(value));
    const expectedConfidenceRaw = average(confidences);
    const expectedConfidence = expectedConfidenceRaw === null ? null : Math.round(expectedConfidenceRaw);

    const hitCount = familyOutcomes.filter((o) => o.directionCorrect === true).length;
    const actualOutcomeHitRate = Math.round((hitCount / sampleSize) * 100);

    const { trend, earlierHitRate, recentHitRate } = computeTrend(familyOutcomes);

    reports.push({
      family,
      sampleSize,
      isStatisticallyMeaningful,
      insufficientDataMessage: isStatisticallyMeaningful ? null : `More observations required (${sampleSize} so far, need at least ${MIN_SAMPLE_SIZE}).`,
      expectedConfidence: isStatisticallyMeaningful ? expectedConfidence : null,
      actualOutcomeHitRate: isStatisticallyMeaningful ? actualOutcomeHitRate : null,
      calibrationTrend: isStatisticallyMeaningful ? trend : "insufficient data for trend",
      earlierHitRate: isStatisticallyMeaningful ? earlierHitRate : null,
      recentHitRate: isStatisticallyMeaningful ? recentHitRate : null,
    });
  }

  return { families: reports, generatedAt: new Date().toISOString() };
}

module.exports = {
  computeCalibrationReports,
  MIN_SAMPLE_SIZE,
  MIN_TREND_HALF_SIZE,
};
