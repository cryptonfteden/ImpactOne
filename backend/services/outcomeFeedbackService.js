// Phase X11 — Part 1, Outcome Feedback Loop. Connects real, graded
// Outcome history to future recommendation scoring — but only when the
// evidence is statistically meaningful (learningSafety.meetsMinimumSample)
// and only within a bounded, disclosed range
// (learningSafety.boundedAdjustmentFromRate). Every computation is
// persisted to ScoringAdjustmentAudit, whether or not it was actually
// applied, so "why did this recommendation's quality score include a
// +5.2 outcome-feedback term" is always answerable from real, stored data.
const { getPrismaClient } = require("../db/prismaClient");
const learningSafety = require("./learningSafety");
const methodologyVersioningService = require("./methodologyVersioningService");

const MODEL_NAME = "autonomousRecommendationEngine";
const FALLBACK_METHODOLOGY_VERSION = "x11-outcome-feedback-baseline";

async function resolveMethodologyVersion() {
  const active = await methodologyVersioningService.getActiveVersion(MODEL_NAME);
  return active ? active.version : FALLBACK_METHODOLOGY_VERSION;
}

function computeAdjustmentForOutcomes(outcomes) {
  const graded = outcomes.filter((outcome) => outcome.directionCorrect !== null);
  const n = graded.length;
  const successes = graded.filter((outcome) => outcome.directionCorrect === true).length;

  if (!learningSafety.meetsMinimumSample(n)) {
    return {
      sampleSize: n,
      observedRate: n ? successes / n : null,
      confidenceInterval: n ? learningSafety.wilsonConfidenceInterval(successes, n) : null,
      adjustmentValue: 0,
      applied: false,
      reason: `Only ${n} graded outcomes — need at least ${learningSafety.MIN_SAMPLE_SIZE} before this evidence may influence scoring.`,
    };
  }

  const observedRate = successes / n;
  const confidenceInterval = learningSafety.wilsonConfidenceInterval(successes, n);
  const adjustmentValue = learningSafety.boundedAdjustmentFromRate(observedRate);

  return {
    sampleSize: n,
    observedRate,
    confidenceInterval,
    adjustmentValue,
    applied: true,
    reason: `${successes}/${n} graded outcomes correct (${Math.round(observedRate * 100)}%) — a statistically meaningful sample, bounded adjustment applied.`,
  };
}

async function persistAdjustment({ adjustmentKey, scope, computed, methodologyVersion }) {
  const prisma = getPrismaClient();
  return prisma.scoringAdjustmentAudit.create({
    data: {
      adjustmentKey,
      scope,
      sampleSize: computed.sampleSize,
      observedRate: computed.observedRate,
      confidenceInterval: computed.confidenceInterval,
      adjustmentValue: computed.adjustmentValue,
      applied: computed.applied,
      reason: computed.reason,
      methodologyVersion,
    },
  });
}

// Real per-action adjustments (BUY/REDUCE/EXIT), computed fresh from the
// real, current Outcome table and persisted as an immutable audit row
// every time this runs — the audit table's own history is the real trend
// line, not something recomputed after the fact.
async function computeAndAuditActionAdjustments() {
  const prisma = getPrismaClient();
  const outcomes = await prisma.outcome.findMany({ select: { action: true, directionCorrect: true } });
  const methodologyVersion = await resolveMethodologyVersion();

  const byAction = new Map();
  for (const outcome of outcomes) {
    if (!byAction.has(outcome.action)) byAction.set(outcome.action, []);
    byAction.get(outcome.action).push(outcome);
  }

  const results = {};
  for (const [action, actionOutcomes] of byAction.entries()) {
    const computed = computeAdjustmentForOutcomes(actionOutcomes);
    await persistAdjustment({ adjustmentKey: action, scope: "action", computed, methodologyVersion });
    results[action] = computed;
  }
  return results;
}

// The synchronous-friendly read path the recommendation engine actually
// consumes: fetch once per run, pass the plain map down into the pure
// scoring function — the engine's inner scoring math stays synchronous
// and testable, this is the one async boundary.
async function getScoringAdjustmentMap() {
  return computeAndAuditActionAdjustments();
}

async function getAuditHistory({ adjustmentKey, limit = 50 } = {}) {
  const prisma = getPrismaClient();
  return prisma.scoringAdjustmentAudit.findMany({
    where: adjustmentKey ? { adjustmentKey } : undefined,
    orderBy: { computedAt: "desc" },
    take: limit,
  });
}

module.exports = { computeAndAuditActionAdjustments, getScoringAdjustmentMap, getAuditHistory, computeAdjustmentForOutcomes };
