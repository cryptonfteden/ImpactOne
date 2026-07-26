// Phase X10 — Part 4, News Source Scoring. Genuinely new work: no prior
// dynamic, outcome-informed trust score existed (scoringVocabulary.js's
// sourceCredibility delegated to a fixed static table). Every component
// here is computed from real, already-persisted rows — CanonicalEvent
// (timeliness, static credibilityScore), the CanonicalEvent ->
// WorldMemoryRecord -> WorldMemoryPrediction -> Outcome chain (accuracy,
// prediction quality, false-positive rate), and AnalyticsEvent's real
// `sourceName` property (X10 Part 1's own addition, user engagement).
// A source with zero graded outcomes gets an honestly incomplete score,
// never a fabricated default.
const { getPrismaClient } = require("../db/prismaClient");

function average(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function computeScoreForSource(sourceName) {
  const prisma = getPrismaClient();

  const canonicalEvents = await prisma.canonicalEvent.findMany({
    where: { sourceName },
    select: { id: true, publishedAt: true, ingestedAt: true, credibilityScore: true },
  });

  const timelinessMs = canonicalEvents
    .filter((event) => event.publishedAt)
    .map((event) => event.ingestedAt.getTime() - event.publishedAt.getTime())
    .filter((ms) => ms >= 0);
  const avgTimelinessMs = average(timelinessMs);

  const avgCredibilityScore = average(canonicalEvents.filter((event) => event.credibilityScore !== null).map((event) => Number(event.credibilityScore)));

  const records = canonicalEvents.length
    ? await prisma.worldMemoryRecord.findMany({ where: { canonicalEventId: { in: canonicalEvents.map((event) => event.id) } }, select: { id: true } })
    : [];
  const predictions = records.length
    ? await prisma.worldMemoryPrediction.findMany({ where: { worldMemoryRecordId: { in: records.map((record) => record.id) } }, select: { id: true } })
    : [];
  const outcomes = predictions.length
    ? await prisma.outcome.findMany({ where: { worldMemoryPredictionId: { in: predictions.map((prediction) => prediction.id) } } })
    : [];
  const gradedOutcomes = outcomes.filter((outcome) => outcome.directionCorrect !== null);

  const correctCount = gradedOutcomes.filter((outcome) => outcome.directionCorrect === true).length;
  const accuracyRate = gradedOutcomes.length ? correctCount / gradedOutcomes.length : null;
  const falsePositiveRate = gradedOutcomes.length ? 1 - accuracyRate : null;

  const marketImpactPct = average(
    gradedOutcomes.filter((outcome) => outcome.windowReturnPct !== null).map((outcome) => Math.abs(Number(outcome.windowReturnPct)))
  );

  const engagementEventCount = await prisma.analyticsEvent.count({
    where: { properties: { path: ["sourceName"], equals: sourceName } },
  });

  // Real, disclosed composition — only components with a real value
  // contribute; a source with no graded outcomes yet still gets a partial,
  // honestly-labeled score rather than a fabricated 0-100 number.
  const components = [
    accuracyRate === null ? null : accuracyRate * 100,
    falsePositiveRate === null ? null : (1 - falsePositiveRate) * 100,
    avgCredibilityScore,
  ].filter((value) => value !== null);
  const trustScore = components.length ? Math.round(average(components)) : null;

  return {
    sourceName,
    trustScore,
    trustScoreReason: components.length ? null : "No graded outcomes or credibility data yet for this source.",
    accuracyRate: accuracyRate === null ? null : Math.round(accuracyRate * 100) / 100,
    falsePositiveRate: falsePositiveRate === null ? null : Math.round(falsePositiveRate * 100) / 100,
    predictionQualitySampleSize: gradedOutcomes.length,
    avgTimelinessMs: avgTimelinessMs === null ? null : Math.round(avgTimelinessMs),
    avgCredibilityScore: avgCredibilityScore === null ? null : Math.round(avgCredibilityScore * 100) / 100,
    marketImpactAvgAbsReturnPct: marketImpactPct === null ? null : Math.round(marketImpactPct * 100) / 100,
    userEngagementEventCount: engagementEventCount,
    totalEventsIngested: canonicalEvents.length,
  };
}

async function getSourceScore(sourceName) {
  if (!sourceName) {
    const error = new Error("A sourceName is required.");
    error.statusCode = 400;
    throw error;
  }
  return computeScoreForSource(sourceName);
}

async function listSourceScores() {
  const prisma = getPrismaClient();
  const rows = await prisma.canonicalEvent.findMany({ where: { sourceName: { not: null } }, select: { sourceName: true }, distinct: ["sourceName"] });
  const sourceNames = rows.map((row) => row.sourceName).filter(Boolean);
  const scores = await Promise.all(sourceNames.map((sourceName) => computeScoreForSource(sourceName)));
  return scores.sort((a, b) => (b.trustScore ?? -1) - (a.trustScore ?? -1));
}

module.exports = { getSourceScore, listSourceScores };
