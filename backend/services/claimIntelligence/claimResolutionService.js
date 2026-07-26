// Phase AI-CORE-001 — Claim Intelligence Layer. Learning integration
// (mission §10): grades a resolved claim against a real, externally
// supplied outcome, computes calibration error, and produces BOUNDED,
// disclosed feedback inputs for the existing learning services
// (newsSourceScoringService/committeeScorecardService-style) — this
// layer never calls into those services to mutate anything itself
// (mission's explicit boundary: "do not allow the Claim Layer to change
// action-selection policy directly in this phase").
const { clamp } = require("../../utils/portfolioRiskMetrics");
const { statusForGradeLabel, isPreGradeTerminal } = require("./claimLifecycle");
const { METHODOLOGY_VERSION } = require("./claimDimensions");
const repository = require("./claimRepository");

const MAGNITUDE_PARTIAL_THRESHOLD_PCT = 2; // a directionally-correct claim whose real move is under this magnitude is PARTIALLY_CORRECT, not fully CORRECT
const PER_SOURCE_FEEDBACK_BOUND = 5; // no single graded claim can move a source/agent's reliability signal by more than this many points

function computeDirectionCorrect(predictedDirection, actualDirection) {
  if (!actualDirection) return null;
  return predictedDirection === actualDirection;
}

function computeGradeLabel({ directionCorrect, windowReturnPct }) {
  if (directionCorrect === null || directionCorrect === undefined) return "UNGRADEABLE";
  if (!directionCorrect) return "INCORRECT";
  if (!Number.isFinite(windowReturnPct) || Math.abs(windowReturnPct) < MAGNITUDE_PARTIAL_THRESHOLD_PCT) return "PARTIALLY_CORRECT";
  return "CORRECT";
}

/**
 * A real, deterministic Brier-score-style calibration error:
 * |predictedProbability/100 - actualOutcomeAsOneOrZero|. Honestly null
 * when the claim's own probability was itself null (never fabricated).
 */
function computeCalibrationError(probability, directionCorrect) {
  if (!Number.isFinite(probability) || directionCorrect === null || directionCorrect === undefined) return null;
  const actual = directionCorrect ? 1 : 0;
  return Math.round(Math.abs(probability / 100 - actual) * 10000) / 10000;
}

/**
 * Bounded, per-source/per-agent feedback — a claim resolved CORRECT
 * nudges every contributing source/agent's reliability signal up;
 * INCORRECT nudges it down; every nudge is capped at
 * PER_SOURCE_FEEDBACK_BOUND so one resolved claim can never swing a
 * source's real reliability history. Counter-evidence contributors are
 * nudged in the OPPOSITE direction (a source that correctly contradicted
 * a claim that turned out incorrect was itself right).
 */
function buildLearningFeedback(evidenceRows, gradeLabel) {
  if (gradeLabel === "UNGRADEABLE") {
    return { sourceCredibilityDeltas: [], agentReliabilityDeltas: [], note: "Ungradeable — no real outcome was available, so no feedback is produced." };
  }
  const claimWasCorrect = gradeLabel === "CORRECT" || gradeLabel === "PARTIALLY_CORRECT";
  const magnitude = gradeLabel === "CORRECT" ? PER_SOURCE_FEEDBACK_BOUND : gradeLabel === "PARTIALLY_CORRECT" ? Math.round(PER_SOURCE_FEEDBACK_BOUND / 2) : PER_SOURCE_FEEDBACK_BOUND;

  const bySource = new Map();
  const byAgent = new Map();

  for (const evidence of evidenceRows) {
    const supportsSign = evidence.stance === "SUPPORTS" ? 1 : -1; // a CONTRADICTS entry that turned out right when the claim was wrong should be nudged up, hence the sign flip below
    const correctnessSign = claimWasCorrect ? 1 : -1;
    const delta = clamp(supportsSign * correctnessSign * magnitude, -PER_SOURCE_FEEDBACK_BOUND, PER_SOURCE_FEEDBACK_BOUND);

    const sourceKey = evidence.sourceProvider || evidence.sourceEngine;
    bySource.set(sourceKey, (bySource.get(sourceKey) || 0) + delta);
    byAgent.set(evidence.sourceEngine, (byAgent.get(evidence.sourceEngine) || 0) + delta);
  }

  return {
    sourceCredibilityDeltas: [...bySource.entries()].map(([source, delta]) => ({ source, delta: clamp(delta, -PER_SOURCE_FEEDBACK_BOUND, PER_SOURCE_FEEDBACK_BOUND) })),
    agentReliabilityDeltas: [...byAgent.entries()].map(([engineId, delta]) => ({ engineId, delta: clamp(delta, -PER_SOURCE_FEEDBACK_BOUND, PER_SOURCE_FEEDBACK_BOUND) })),
    note: "Bounded feedback input for the existing learning services (newsSourceScoringService/committeeScorecardService-style) — not automatically applied by the Claim Layer this phase.",
  };
}

/**
 * Grades one claim against a real, already-fetched outcome descriptor.
 * `actualOutcome` is `null` when no real outcome could be determined
 * (e.g. the symbol was delisted, no price history exists) — graded
 * honestly as UNGRADEABLE/INSUFFICIENT_DATA, never guessed.
 */
async function resolveClaim(claimId, actualOutcome, { now = new Date() } = {}) {
  const claim = await repository.getById(claimId);
  if (!claim) return null;
  if (!isPreGradeTerminal(claim.status)) {
    throw new Error(`Claim ${claimId} is not in a pre-grade-terminal status (EXPIRED/INVALIDATED) — current status: ${claim.status}. Only expired/invalidated claims are graded.`);
  }

  const directionCorrect = computeDirectionCorrect(claim.expectedDirection, actualOutcome?.actualDirection || null);
  const gradeLabel = claim.status === "INVALIDATED" && !actualOutcome ? "INCORRECT" : computeGradeLabel({ directionCorrect, windowReturnPct: actualOutcome?.windowReturnPct });
  const calibrationError = computeCalibrationError(claim.probability, directionCorrect);

  const evidenceRows = await repository.listEvidenceForClaim(claimId);
  const learningFeedback = buildLearningFeedback(evidenceRows, gradeLabel);

  const outcome = await repository.createOutcome({
    claimId,
    gradeLabel,
    predictedDirection: claim.expectedDirection,
    actualDirection: actualOutcome?.actualDirection || null,
    directionCorrect,
    magnitudeErrorPct: actualOutcome?.windowReturnPct ?? null,
    timingErrorDays: actualOutcome?.timingErrorDays ?? null,
    calibrationError,
    windowReturnPct: actualOutcome?.windowReturnPct ?? null,
    benchmarkReturnPct: actualOutcome?.benchmarkReturnPct ?? null,
    learningFeedback,
    methodologyVersion: METHODOLOGY_VERSION,
  });

  const nextStatus = statusForGradeLabel(gradeLabel);
  const resolvedClaim = await repository.updateClaimScalars(claimId, {
    status: nextStatus,
    resolution: { gradeLabel, directionCorrect, calibrationError, windowReturnPct: actualOutcome?.windowReturnPct ?? null, gradedAt: now.toISOString() },
  });
  await repository.createTransition({
    claimId,
    fromStatus: claim.status,
    toStatus: nextStatus,
    reason: `Graded ${gradeLabel} against a real outcome (directionCorrect=${directionCorrect}).`,
    triggeringEvidenceId: null,
  });

  return { claim: resolvedClaim, outcome };
}

module.exports = { computeDirectionCorrect, computeGradeLabel, computeCalibrationError, buildLearningFeedback, resolveClaim, MAGNITUDE_PARTIAL_THRESHOLD_PCT, PER_SOURCE_FEEDBACK_BOUND };
