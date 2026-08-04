// Sprint 29 — Feedback Intelligence Layer, Priority 4 (Recommendation
// Quality Dashboard, internal only). Every metric is a real aggregation
// over the Outcome/WorldMemoryPrediction/DecisionTrace tables Priority 1
// wired up this same sprint — no new scoring model, no fabricated
// benchmark. Honestly returns null for any metric with zero qualifying
// samples rather than a misleading 0.
const { getPrismaClient } = require("../db/prismaClient");

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function computeQualityDashboard() {
  const prisma = getPrismaClient();

  const [outcomes, totalPredictions, gradedPredictionRows, traces] = await Promise.all([
    prisma.outcome.findMany(),
    prisma.worldMemoryPrediction.count(),
    prisma.outcome.findMany({ select: { worldMemoryPredictionId: true } }),
    prisma.decisionTrace.findMany({ select: { confidenceCalculation: true } }),
  ]);

  // Hit rate — of outcomes that were actually gradeable (a real quote was
  // available), what fraction called the direction correctly.
  const gradedOutcomes = outcomes.filter((outcome) => outcome.gradeLabel !== "UNGRADEABLE" && outcome.directionCorrect !== null);
  const hitCount = gradedOutcomes.filter((outcome) => outcome.directionCorrect === true).length;
  const hitRate = gradedOutcomes.length ? Math.round((hitCount / gradedOutcomes.length) * 100) : null;

  // Confidence calibration — for each graded outcome, how much the
  // recommendation's own predicted confidence matched whether it turned
  // out correct (1.0 = confidence perfectly tracked correctness).
  const predictionIds = gradedOutcomes.map((outcome) => outcome.worldMemoryPredictionId).filter(Boolean);
  const predictions = predictionIds.length
    ? await prisma.worldMemoryPrediction.findMany({ where: { id: { in: predictionIds } } })
    : [];
  const predictionById = new Map(predictions.map((prediction) => [prediction.id, prediction]));

  const calibrationScores = [];
  for (const outcome of gradedOutcomes) {
    const prediction = predictionById.get(outcome.worldMemoryPredictionId);
    if (!prediction) continue;
    const confidenceFraction = prediction.predictedConfidence / 100;
    calibrationScores.push(outcome.directionCorrect ? confidenceFraction : 1 - confidenceFraction);
  }
  const confidenceCalibrationAvg = average(calibrationScores);
  const confidenceCalibration = confidenceCalibrationAvg === null ? null : Math.round(confidenceCalibrationAvg * 100);

  // Average holding period — time between a recommendation's creation and
  // the moment its outcome was graded (this sprint's D1 window, so this
  // is expected to read close to 24h until longer windows are graded).
  const recommendationIds = Array.from(new Set(outcomes.map((outcome) => outcome.recommendationId)));
  const recommendations = recommendationIds.length
    ? await prisma.recommendation.findMany({ where: { id: { in: recommendationIds } }, select: { id: true, createdAt: true } })
    : [];
  const recommendationById = new Map(recommendations.map((recommendation) => [recommendation.id, recommendation]));
  const holdingPeriodsHours = outcomes
    .map((outcome) => {
      const recommendation = recommendationById.get(outcome.recommendationId);
      if (!recommendation) return null;
      return (outcome.gradedAt.getTime() - recommendation.createdAt.getTime()) / (1000 * 60 * 60);
    })
    .filter((hours) => Number.isFinite(hours));
  const avgHoldingPeriodHoursRaw = average(holdingPeriodsHours);
  const avgHoldingPeriodHours = avgHoldingPeriodHoursRaw === null ? null : Math.round(avgHoldingPeriodHoursRaw * 10) / 10;

  // Average uncertainty — the same scoringVocabulary.computeUncertainty
  // value already stored on every DecisionTrace.
  const uncertainties = traces
    .map((trace) => Number(trace.confidenceCalculation?.uncertainty))
    .filter((value) => Number.isFinite(value));
  const avgUncertaintyRaw = average(uncertainties);
  const avgUncertainty = avgUncertaintyRaw === null ? null : Math.round(avgUncertaintyRaw);

  // Outcome completion — of every prediction ever written, what fraction
  // has been graded (regardless of grade outcome, including UNGRADEABLE —
  // "completion" measures the pipeline ran, not that it succeeded).
  const outcomeCompletion = totalPredictions ? Math.round((gradedPredictionRows.length / totalPredictions) * 100) : null;

  return {
    hitRate,
    confidenceCalibration,
    avgHoldingPeriodHours,
    avgUncertainty,
    outcomeCompletion,
    sampleSizes: {
      totalPredictions,
      totalOutcomes: outcomes.length,
      gradedOutcomes: gradedOutcomes.length,
      decisionTraces: traces.length,
    },
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { computeQualityDashboard };
