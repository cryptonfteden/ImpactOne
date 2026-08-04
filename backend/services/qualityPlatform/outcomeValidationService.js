// Phase D1 — Learning Data Remediation. Outcome Validation.
//
// Read-only integrity checks over existing, already-persisted data — never
// corrects, rewrites, or deletes anything it finds wrong (matching this
// codebase's immutability convention throughout). Every finding is a
// reported flag for a future human/process to act on, not an automatic fix.
const { getPrismaClient } = require("../../db/prismaClient");
const recommendationLifecycleService = require("./recommendationLifecycleService");

const GRADING_WINDOW_MS = 24 * 60 * 60 * 1000; // matches outcomeGradingService's own D1 cutoff

// A lifecycle state may only ever be preceded by one of these — this is
// the real, deterministic ordering this engine's own lifecycle service
// (Sprint 42) is defined to produce; a violation means something wrote an
// event outside the expected flow.
const VALID_PREDECESSORS = {
  GENERATED: [],
  PUBLISHED: ["GENERATED"],
  ACTIVE: ["PUBLISHED"],
  VIEWED: ["ACTIVE", "VIEWED"],
  PAPER_TRADED: ["ACTIVE", "VIEWED"],
  SUCCEEDED: ["ACTIVE", "VIEWED", "PAPER_TRADED"],
  FAILED: ["ACTIVE", "VIEWED", "PAPER_TRADED"],
  EXPIRED: ["ACTIVE", "VIEWED", "PAPER_TRADED"],
  CANCELLED: ["ACTIVE", "VIEWED", "PAPER_TRADED"],
};
const TERMINAL_STATES = new Set(["SUCCEEDED", "FAILED", "EXPIRED", "CANCELLED"]);

async function detectDuplicateGrading() {
  const prisma = getPrismaClient();
  const outcomes = await prisma.outcome.findMany({ select: { id: true, recommendationId: true, timeWindow: true, methodologyVersion: true } });
  const seen = new Map();
  const duplicates = [];
  for (const outcome of outcomes) {
    const key = `${outcome.recommendationId}:${outcome.timeWindow}:${outcome.methodologyVersion}`;
    if (seen.has(key)) {
      duplicates.push({ recommendationId: outcome.recommendationId, reason: "DUPLICATE_GRADING", detail: key });
    } else {
      seen.set(key, outcome.id);
    }
  }
  return duplicates;
}

async function detectMissingGrading() {
  const prisma = getPrismaClient();
  const cutoff = new Date(Date.now() - GRADING_WINDOW_MS);
  const stalePredictions = await prisma.worldMemoryPrediction.findMany({
    where: { recommendationId: { not: null }, predictedAt: { lte: cutoff } },
    select: { recommendationId: true },
  });
  const recommendationIds = [...new Set(stalePredictions.map((prediction) => prediction.recommendationId))];
  if (!recommendationIds.length) return [];

  const graded = await prisma.outcome.findMany({ where: { recommendationId: { in: recommendationIds } }, select: { recommendationId: true } });
  const gradedSet = new Set(graded.map((outcome) => outcome.recommendationId));
  return recommendationIds
    .filter((id) => !gradedSet.has(id))
    .map((id) => ({ recommendationId: id, reason: "MISSING_GRADING", detail: "Prediction is past the grading window with no Outcome row." }));
}

async function detectInvalidLifecycle() {
  const prisma = getPrismaClient();
  const recommendations = await prisma.recommendation.findMany({ select: { id: true, createdAt: true } });
  const findings = [];
  const now = Date.now();

  for (const recommendation of recommendations) {
    const lifecycle = await recommendationLifecycleService.getLifecycle(recommendation.id);
    if (!lifecycle.events.length) continue;

    let priorState = null;
    let sawTerminal = false;
    for (const event of lifecycle.events) {
      if (new Date(event.occurredAt).getTime() > now) {
        findings.push({ recommendationId: recommendation.id, reason: "FUTURE_TIMESTAMP", detail: `${event.state} at ${event.occurredAt}` });
      }
      if (new Date(event.occurredAt) < recommendation.createdAt) {
        findings.push({ recommendationId: recommendation.id, reason: "TIME_INCONSISTENCY", detail: `${event.state} occurred before the recommendation's own createdAt` });
      }
      if (sawTerminal && event.state !== "VIEWED") {
        findings.push({ recommendationId: recommendation.id, reason: "INVALID_LIFECYCLE", detail: `${event.state} recorded after a terminal state` });
      }
      const validPredecessors = VALID_PREDECESSORS[event.state] || [];
      if (validPredecessors.length && priorState && !validPredecessors.includes(priorState) && event.state !== priorState) {
        findings.push({ recommendationId: recommendation.id, reason: "INVALID_LIFECYCLE", detail: `${event.state} followed ${priorState}, which is not a valid predecessor` });
      }
      if (TERMINAL_STATES.has(event.state)) sawTerminal = true;
      priorState = event.state;
    }
  }
  return findings;
}

async function detectMissingBenchmark() {
  const prisma = getPrismaClient();
  const outcomes = await prisma.outcome.findMany({
    where: { gradeLabel: { not: "UNGRADEABLE" }, benchmarkSymbol: null },
    select: { recommendationId: true },
  });
  return outcomes.map((outcome) => ({ recommendationId: outcome.recommendationId, reason: "MISSING_BENCHMARK", detail: "Gradeable outcome has no benchmark populated." }));
}

async function detectMissingPrices() {
  const prisma = getPrismaClient();
  // windowStartPrice is a required (non-nullable) column — it can never be
  // missing at the database level; the real gap this check can find is a
  // gradeable outcome with no end price, or either price non-finite.
  const outcomes = await prisma.outcome.findMany({
    where: { gradeLabel: { not: "UNGRADEABLE" } },
    select: { recommendationId: true, windowStartPrice: true, windowEndPrice: true },
  });
  return outcomes
    .filter((outcome) => !Number.isFinite(Number(outcome.windowStartPrice)) || outcome.windowEndPrice === null || !Number.isFinite(Number(outcome.windowEndPrice)))
    .map((outcome) => ({ recommendationId: outcome.recommendationId, reason: "MISSING_PRICES", detail: "A gradeable outcome is missing a real start or end price." }));
}

async function detectTimeInconsistencies() {
  const prisma = getPrismaClient();
  const now = new Date();
  const outcomes = await prisma.outcome.findMany({ select: { recommendationId: true, gradedAt: true } });
  const recommendationIds = outcomes.map((outcome) => outcome.recommendationId);
  const recommendations = await prisma.recommendation.findMany({ where: { id: { in: recommendationIds } }, select: { id: true, createdAt: true } });
  const createdAtById = new Map(recommendations.map((rec) => [rec.id, rec.createdAt]));

  const findings = [];
  for (const outcome of outcomes) {
    if (outcome.gradedAt > now) {
      findings.push({ recommendationId: outcome.recommendationId, reason: "FUTURE_TIMESTAMP", detail: `Outcome.gradedAt (${outcome.gradedAt.toISOString()}) is in the future` });
    }
    const createdAt = createdAtById.get(outcome.recommendationId);
    if (createdAt && outcome.gradedAt < createdAt) {
      findings.push({ recommendationId: outcome.recommendationId, reason: "TIME_INCONSISTENCY", detail: "Outcome graded before its own recommendation was created." });
    }
  }
  return findings;
}

/** Runs every check and returns one flat, deduplicated finding list. */
async function runOutcomeValidation() {
  const [duplicateGrading, missingGrading, invalidLifecycle, missingBenchmark, missingPrices, timeInconsistencies] = await Promise.all([
    detectDuplicateGrading(),
    detectMissingGrading(),
    detectInvalidLifecycle(),
    detectMissingBenchmark(),
    detectMissingPrices(),
    detectTimeInconsistencies(),
  ]);

  const findings = [...duplicateGrading, ...missingGrading, ...invalidLifecycle, ...missingBenchmark, ...missingPrices, ...timeInconsistencies];
  return {
    generatedAt: new Date().toISOString(),
    totalFindings: findings.length,
    findings,
    byReason: findings.reduce((counts, finding) => {
      counts[finding.reason] = (counts[finding.reason] || 0) + 1;
      return counts;
    }, {}),
  };
}

module.exports = {
  detectDuplicateGrading,
  detectMissingGrading,
  detectInvalidLifecycle,
  detectMissingBenchmark,
  detectMissingPrices,
  detectTimeInconsistencies,
  runOutcomeValidation,
};
