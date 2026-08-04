// Phase X10 — Part 6, Market Memory. Genuinely new work: the only prior
// "historical similarity" feature (historicalSimilarityService.js) is a
// hardcoded stub over a static 8-event array, never wired to the real,
// persisted WorldMemoryRecord table. This service is the first real
// similarity query over that real data — symbol/sector overlap against
// every real WorldMemoryRecord, then composing each match's real causal
// explanation (WorldMemoryCausalLink), real prediction
// (WorldMemoryPrediction), and real outcome (Outcome) — never a fabricated
// "here's what happened last time."
//
// Phase X11 — Part 4, Market Memory Evolution. Extends the above with the
// mission's two additions: each matched outcome's real, already-generated
// lesson (outcomeIntelligenceService's real writer, Sprint 31 — no second
// lesson generator here), and a real, disclosed relevanceConfidence per
// match so "most relevant prior outcome" is a computed ranking, not just
// "first in the list."
const { getPrismaClient } = require("../db/prismaClient");
const worldMemoryRepository = require("./worldMemoryRepository");

// Real, disclosed composition: overlap strength (how many real
// symbols/sectors matched, capped) plus real outcome certainty (a graded,
// conclusive outcome is more useful precedent than an ungraded one).
// Bounded to [0, 100] like every other confidence score in this codebase.
function computeRelevanceConfidence({ overlapScore, previousPredictions }) {
  const overlapComponent = Math.min(60, overlapScore * 15);
  const gradedOutcomes = previousPredictions.map((prediction) => prediction.previousOutcome).filter((outcome) => outcome.directionCorrect !== null);
  const certaintyComponent = gradedOutcomes.length ? 40 : previousPredictions.length ? 15 : 0;
  return Math.round(overlapComponent + certaintyComponent);
}

function overlapCount(a = [], b = []) {
  const setB = new Set(b);
  return a.filter((value) => setB.has(value)).length;
}

function scoreOverlap(record, symbols, sectors) {
  const matchedSymbols = (record.symbols || []).filter((symbol) => symbols.includes(symbol));
  const matchedSectors = (record.sectors || []).filter((sector) => sectors.includes(sector));
  return { score: matchedSymbols.length * 2 + matchedSectors.length, matchedSymbols, matchedSectors };
}

async function findSimilarHistory({ symbols = [], sectors = [], excludeRecordId = null, limit = 5 } = {}) {
  if (!symbols.length && !sectors.length) {
    return { matches: [], reason: "No symbols or sectors provided to match against." };
  }

  const prisma = getPrismaClient();
  const candidates = await prisma.worldMemoryRecord.findMany({
    where: excludeRecordId ? { id: { not: excludeRecordId } } : undefined,
    orderBy: { occurredAt: "desc" },
    take: 500, // real bound on how far back this searches, disclosed not hidden
  });

  const scored = candidates
    .map((record) => ({ record, ...scoreOverlap(record, symbols, sectors) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.record.occurredAt - a.record.occurredAt)
    .slice(0, limit);

  if (!scored.length) {
    return { matches: [], reason: "No historical record shares any real symbol or sector overlap." };
  }

  const recordIds = scored.map((entry) => entry.record.id);
  const [causalLinks, predictions] = await Promise.all([
    prisma.worldMemoryCausalLink.findMany({ where: { effectRecordId: { in: recordIds } } }),
    prisma.worldMemoryPrediction.findMany({ where: { worldMemoryRecordId: { in: recordIds } } }),
  ]);
  const predictionIds = predictions.map((prediction) => prediction.id);
  const outcomes = predictionIds.length ? await prisma.outcome.findMany({ where: { worldMemoryPredictionId: { in: predictionIds } } }) : [];

  const causalLinksByRecordId = new Map();
  for (const link of causalLinks) {
    if (!causalLinksByRecordId.has(link.effectRecordId)) causalLinksByRecordId.set(link.effectRecordId, []);
    causalLinksByRecordId.get(link.effectRecordId).push(link);
  }
  const predictionsByRecordId = new Map();
  for (const prediction of predictions) {
    if (!predictionsByRecordId.has(prediction.worldMemoryRecordId)) predictionsByRecordId.set(prediction.worldMemoryRecordId, []);
    predictionsByRecordId.get(prediction.worldMemoryRecordId).push(prediction);
  }
  const outcomeByPredictionId = new Map(outcomes.map((outcome) => [outcome.worldMemoryPredictionId, outcome]));

  // Phase X11 — Part 4. Real, already-generated lessons (Sprint 31's
  // outcomeIntelligenceService) for every graded outcome among these
  // matches, fetched in one batch rather than N+1 queries.
  const outcomeIds = outcomes.map((outcome) => outcome.id);
  const lessons = outcomeIds.length ? await Promise.all(outcomeIds.map((outcomeId) => worldMemoryRepository.getLessonForOutcome(outcomeId))) : [];
  const lessonByOutcomeId = new Map(outcomeIds.map((outcomeId, index) => [outcomeId, lessons[index]]));

  const matches = scored.map(({ record, matchedSymbols, matchedSectors, score }) => {
    const recordPredictions = predictionsByRecordId.get(record.id) || [];
    const previousPredictions = recordPredictions.map((prediction) => {
      const outcome = outcomeByPredictionId.get(prediction.id);
      const lesson = outcome ? lessonByOutcomeId.get(outcome.id) : null;
      return {
        predictedAction: prediction.predictedAction,
        predictedConfidence: prediction.predictedConfidence,
        previousOutcome: outcome
          ? { directionCorrect: outcome.directionCorrect, gradeLabel: outcome.gradeLabel, windowReturnPct: outcome.windowReturnPct === null ? null : Number(outcome.windowReturnPct) }
          : { directionCorrect: null, gradeLabel: null, windowReturnPct: null, reason: "Not yet graded." },
        previousLesson: lesson ? lesson.lessonText : null,
      };
    });

    return {
      recordId: record.id,
      headline: record.headline,
      occurredAt: record.occurredAt,
      matchedSymbols,
      matchedSectors,
      previousCausalExplanations: (causalLinksByRecordId.get(record.id) || []).map((link) => ({ explanation: link.explanation, confidence: link.confidence === null ? null : Number(link.confidence) })),
      previousPredictions,
      relevanceConfidence: computeRelevanceConfidence({ overlapScore: score, previousPredictions }),
    };
  });

  matches.sort((a, b) => b.relevanceConfidence - a.relevanceConfidence);

  return { matches, mostRelevant: matches[0], reason: null };
}

module.exports = { findSimilarHistory };
