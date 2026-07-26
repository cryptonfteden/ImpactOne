// Phase X11 — Part 2, Dynamic Source Scoring. Replaces the static provider
// trust model (autonomousMarketService.sourceQualityScore's fixed 95/60
// table) with a real, evolving, outcome-informed score — built on top of
// X10's newsSourceScoringService.js (accuracy/false-positive/timeliness/
// credibility/engagement), adding the two components this phase's mission
// names that X10 didn't compute: a real false-negative proxy and a
// persisted, queryable audit history (SourceScoreSnapshot). Part 6 safety
// is folded in directly: below the minimum sample threshold, this
// honestly falls back to the existing static score rather than trusting a
// thin sample.
const { getPrismaClient } = require("../db/prismaClient");
const autonomousMarketService = require("./autonomousMarketService");
const newsSourceScoringService = require("./newsSourceScoringService");
const learningSafety = require("./learningSafety");
const methodologyVersioningService = require("./methodologyVersioningService");

const MODEL_NAME = "dynamicSourceScoring";
const FALLBACK_METHODOLOGY_VERSION = "x11-source-scoring-baseline";

async function resolveMethodologyVersion() {
  const active = await methodologyVersioningService.getActiveVersion(MODEL_NAME);
  return active ? active.version : FALLBACK_METHODOLOGY_VERSION;
}

// Real, honestly-scoped proxy: of this source's real CanonicalEvent rows,
// what fraction were never matched into any World Memory prediction at
// all — i.e., evidence that never got the chance to be judged right or
// wrong. Distinct from the false-positive rate (which is about graded,
// judged predictions that turned out wrong).
async function computeFalseNegativeRate(sourceName) {
  const prisma = getPrismaClient();
  const events = await prisma.canonicalEvent.findMany({ where: { sourceName }, select: { id: true } });
  if (!events.length) return { rate: null, sampleSize: 0 };

  const records = await prisma.worldMemoryRecord.findMany({ where: { canonicalEventId: { in: events.map((event) => event.id) } }, select: { id: true } });
  if (!records.length) return { rate: 1, sampleSize: events.length };

  const predictions = await prisma.worldMemoryPrediction.count({ where: { worldMemoryRecordId: { in: records.map((record) => record.id) } } });
  const recordsWithPredictions = predictions > 0 ? await prisma.worldMemoryPrediction.findMany({ where: { worldMemoryRecordId: { in: records.map((record) => record.id) } }, select: { worldMemoryRecordId: true }, distinct: ["worldMemoryRecordId"] }) : [];

  const eventsWithoutPrediction = events.length - recordsWithPredictions.length;
  return { rate: Math.max(0, eventsWithoutPrediction) / events.length, sampleSize: events.length };
}

async function computeAndSnapshotSourceScore(sourceName) {
  const [baseScore, falseNegative] = await Promise.all([newsSourceScoringService.getSourceScore(sourceName), computeFalseNegativeRate(sourceName)]);
  const methodologyVersion = await resolveMethodologyVersion();

  const prisma = getPrismaClient();
  const snapshot = await prisma.sourceScoreSnapshot.create({
    data: {
      sourceName,
      trustScore: baseScore.trustScore,
      accuracyRate: baseScore.accuracyRate,
      falsePositiveRate: baseScore.falsePositiveRate,
      falseNegativeRate: falseNegative.rate,
      timelinessMs: baseScore.avgTimelinessMs,
      engagementCount: baseScore.userEngagementEventCount,
      sampleSize: baseScore.predictionQualitySampleSize,
      methodologyVersion,
    },
  });

  return { ...baseScore, falseNegativeRate: falseNegative.rate === null ? null : Math.round(falseNegative.rate * 100) / 100, snapshotId: snapshot.id, methodologyVersion };
}

// The real replacement for the static lookup: dynamic when there's
// enough real evidence, an honest, disclosed fallback to the existing
// static score otherwise — never a fabricated dynamic number from a thin
// sample.
async function getDynamicCredibility(sourceName) {
  const scored = await computeAndSnapshotSourceScore(sourceName);
  const staticFallback = autonomousMarketService.sourceQualityScore(sourceName);

  if (!learningSafety.meetsMinimumSample(scored.predictionQualitySampleSize)) {
    return {
      sourceName,
      value: staticFallback,
      isDynamic: false,
      reason: `Only ${scored.predictionQualitySampleSize} graded predictions for this source — using the static baseline (${staticFallback}) until at least ${learningSafety.MIN_SAMPLE_SIZE} exist.`,
    };
  }

  return { sourceName, value: scored.trustScore ?? staticFallback, isDynamic: true, reason: null };
}

// The synchronous-friendly read path the recommendation engine consumes:
// build once per run for every source actually present in this run's
// matched events, then look up synchronously inside the pure scoring
// function — same pattern as outcomeFeedbackService.getScoringAdjustmentMap.
async function getSourceCredibilityOverrides(sourceNames = []) {
  const uniqueNames = Array.from(new Set(sourceNames.filter(Boolean)));
  const results = await Promise.all(uniqueNames.map((sourceName) => getDynamicCredibility(sourceName)));
  const map = {};
  for (const result of results) map[result.sourceName] = result;
  return map;
}

async function getSnapshotHistory(sourceName, { limit = 50 } = {}) {
  const prisma = getPrismaClient();
  return prisma.sourceScoreSnapshot.findMany({ where: { sourceName }, orderBy: { computedAt: "desc" }, take: limit });
}

module.exports = { computeAndSnapshotSourceScore, getDynamicCredibility, getSourceCredibilityOverrides, getSnapshotHistory };
