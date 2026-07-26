// Phase X11 — Part 5, Calibration. Composes the existing, real per-family
// calibration report (calibrationReportService.js, Sprint 31 — predicted
// confidence vs. observed outcome, calibration trend, sample size) with
// two genuinely new computations this mission names that didn't exist
// before: a real confidence-distribution reliability breakdown (does a
// "75% confident" prediction actually come true ~75% of the time?) and a
// calibration-drift signal over real time-ordered outcomes.
const { getPrismaClient } = require("../db/prismaClient");
const calibrationReportService = require("./calibrationReportService");

const MIN_BUCKET_SAMPLE_SIZE = 5;
const BUCKET_WIDTH = 20;

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function bucketFor(confidence) {
  const clamped = Math.max(0, Math.min(99, confidence));
  const lower = Math.floor(clamped / BUCKET_WIDTH) * BUCKET_WIDTH;
  return `${lower}-${lower + BUCKET_WIDTH}`;
}

// A real reliability-diagram computation: for every graded outcome, group
// by its real predicted-confidence bucket, and compare the bucket's
// average predicted confidence against its real observed hit rate. A
// well-calibrated model's buckets track the diagonal (a "70-80%
// confident" bucket that actually hits ~75% of the time); this never
// asserts calibration quality itself — it reports the real numbers and
// lets the caller judge.
async function getConfidenceDistribution() {
  const prisma = getPrismaClient();
  const outcomes = await prisma.outcome.findMany({ where: { directionCorrect: { not: null } }, select: { directionCorrect: true, worldMemoryPredictionId: true } });
  const predictionIds = outcomes.map((outcome) => outcome.worldMemoryPredictionId).filter(Boolean);
  const predictions = predictionIds.length ? await prisma.worldMemoryPrediction.findMany({ where: { id: { in: predictionIds } }, select: { id: true, predictedConfidence: true } }) : [];
  const predictionById = new Map(predictions.map((prediction) => [prediction.id, prediction]));

  const byBucket = new Map();
  for (const outcome of outcomes) {
    const prediction = predictionById.get(outcome.worldMemoryPredictionId);
    if (!prediction || !Number.isFinite(prediction.predictedConfidence)) continue;
    const bucket = bucketFor(prediction.predictedConfidence);
    if (!byBucket.has(bucket)) byBucket.set(bucket, []);
    byBucket.get(bucket).push({ predictedConfidence: prediction.predictedConfidence, correct: outcome.directionCorrect === true });
  }

  const buckets = Array.from(byBucket.entries())
    .map(([bucket, entries]) => {
      const sampleSize = entries.length;
      const isStatisticallyMeaningful = sampleSize >= MIN_BUCKET_SAMPLE_SIZE;
      return {
        bucket,
        sampleSize,
        avgPredictedConfidence: Math.round(average(entries.map((entry) => entry.predictedConfidence))),
        observedHitRate: isStatisticallyMeaningful ? Math.round((entries.filter((entry) => entry.correct).length / sampleSize) * 100) : null,
        reason: isStatisticallyMeaningful ? null : `Only ${sampleSize} graded outcomes in this bucket — need at least ${MIN_BUCKET_SAMPLE_SIZE}.`,
      };
    })
    .sort((a, b) => Number(a.bucket.split("-")[0]) - Number(b.bucket.split("-")[0]));

  return { buckets, generatedAt: new Date().toISOString() };
}

// Real drift signal: the average real calibration error
// (|predictedConfidence/100 - actualCorrectness|) in the earlier half of
// graded history vs. the later half, split at the real median gradedAt —
// same honest-insufficient-data pattern as aiPerformanceDashboardService's
// model drift (X10), scoped here to calibration error specifically.
async function getCalibrationDrift() {
  const prisma = getPrismaClient();
  const outcomes = await prisma.outcome.findMany({
    where: { directionCorrect: { not: null } },
    orderBy: { gradedAt: "asc" },
    select: { directionCorrect: true, worldMemoryPredictionId: true },
  });

  if (outcomes.length < 10) {
    return { earlierCalibrationError: null, laterCalibrationError: null, driftPts: null, reason: `Only ${outcomes.length} graded outcomes — need at least 10 to measure calibration drift.` };
  }

  const predictionIds = outcomes.map((outcome) => outcome.worldMemoryPredictionId).filter(Boolean);
  const predictions = predictionIds.length ? await prisma.worldMemoryPrediction.findMany({ where: { id: { in: predictionIds } }, select: { id: true, predictedConfidence: true } }) : [];
  const predictionById = new Map(predictions.map((prediction) => [prediction.id, prediction]));

  const calibrationErrors = outcomes
    .map((outcome) => {
      const prediction = predictionById.get(outcome.worldMemoryPredictionId);
      if (!prediction || !Number.isFinite(prediction.predictedConfidence)) return null;
      const actual = outcome.directionCorrect ? 1 : 0;
      return Math.abs(prediction.predictedConfidence / 100 - actual);
    })
    .filter((value) => value !== null);

  if (calibrationErrors.length < 10) {
    return { earlierCalibrationError: null, laterCalibrationError: null, driftPts: null, reason: `Only ${calibrationErrors.length} graded outcomes have a real linked prediction confidence — need at least 10.` };
  }

  const midpoint = Math.floor(calibrationErrors.length / 2);
  const earlierCalibrationError = Math.round(average(calibrationErrors.slice(0, midpoint)) * 100) / 100;
  const laterCalibrationError = Math.round(average(calibrationErrors.slice(midpoint)) * 100) / 100;

  return {
    earlierCalibrationError,
    laterCalibrationError,
    // Positive driftPts means calibration error grew (got worse); negative means it improved.
    driftPts: Math.round((laterCalibrationError - earlierCalibrationError) * 100) / 100,
    reason: null,
  };
}

async function getCalibrationReport() {
  const [familyReports, confidenceDistribution, drift] = await Promise.all([
    calibrationReportService.computeCalibrationReports(),
    getConfidenceDistribution(),
    getCalibrationDrift(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    families: familyReports.families,
    confidenceDistribution: confidenceDistribution.buckets,
    calibrationDrift: drift,
  };
}

module.exports = { getConfidenceDistribution, getCalibrationDrift, getCalibrationReport };
