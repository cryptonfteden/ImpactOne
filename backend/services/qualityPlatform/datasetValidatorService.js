// Phase D1 — Learning Data Remediation. Dataset Validator Engine.
//
// For every completed recommendation, produces exactly one status:
// READY | PARTIAL | INVALID | CONTAMINATED | UNKNOWN — implementing
// LEARNING_DATA_CONTRACT.md §1.2's classification for real. Read-only:
// never corrects or mutates anything it inspects.
const autonomousRecommendationRepository = require("../autonomousRecommendationRepository");
const worldMemoryRepository = require("../worldMemoryRepository");
const outcomeValidationService = require("./outcomeValidationService");

const GRADING_WINDOW_MS = 24 * 60 * 60 * 1000;

// Fields that are legitimately, honestly nullable (never fabricated) but
// whose absence still means a recommendation is only PARTIAL, not READY —
// matches LEARNING_DATA_CONTRACT.md §1.1's own gap list.
function computePartialReasons({ recommendation, decisionTrace, outcome }) {
  const reasons = [];
  if (!recommendation.portfolioContext?.sector) reasons.push("No real sector is known (market-scan-sourced recommendation).");
  if (!decisionTrace.regimeSnapshot || decisionTrace.regimeSnapshot.regime === "UNKNOWN") reasons.push("Market regime could not be determined at decision time.");
  if (!decisionTrace.evidenceMatrixSnapshot) reasons.push("No evidence-matrix snapshot was captured (pre-Phase-D1 recommendation).");
  if (!outcome.benchmarkVersion) reasons.push("No benchmark version recorded.");
  if (!outcome.performanceMetrics) reasons.push("No performance-engine metrics were computed for this outcome.");
  return reasons;
}

async function validateRecommendation(recommendationId) {
  const recommendation = await autonomousRecommendationRepository.getById(recommendationId);
  if (!recommendation) return { recommendationId, status: "INVALID", reasons: ["Recommendation does not exist."] };

  const decisionTrace = await autonomousRecommendationRepository.getDecisionTraceByRecommendationId(recommendationId);
  if (!decisionTrace) return { recommendationId, status: "INVALID", reasons: ["No DecisionTrace exists for this recommendation — refusing to treat it as learnable."] };

  const outcome = await worldMemoryRepository.getOutcomeForRecommendation(recommendationId);
  const gradingDue = Date.now() - new Date(recommendation.createdAt).getTime() >= GRADING_WINDOW_MS;

  if (!outcome) {
    return gradingDue
      ? { recommendationId, status: "INVALID", reasons: ["Grading window has elapsed with no Outcome recorded."] }
      : { recommendationId, status: "UNKNOWN", reasons: ["Grading is still pending — not yet determinable, not a defect."] };
  }

  if (outcome.gradeLabel === "UNGRADEABLE") {
    return { recommendationId, status: "INVALID", reasons: [outcome.ungradeableReason || "Outcome is UNGRADEABLE — no real win/loss signal exists."] };
  }

  const committee = decisionTrace.committeeDebate?.committee;
  if (!committee || !Array.isArray(committee.members)) {
    return { recommendationId, status: "CONTAMINATED", reasons: ["DecisionTrace predates the unified committee (Sprint 41) or carries no committee data — not comparable to post-unification observations."] };
  }

  if (!outcome.benchmarkSymbol) {
    return { recommendationId, status: "CONTAMINATED", reasons: ["Graded outcome has no benchmark — Alpha cannot be honestly computed for this row."] };
  }
  if (!Number.isFinite(Number(outcome.windowEndPrice))) {
    return { recommendationId, status: "CONTAMINATED", reasons: ["Graded outcome is missing a real end price."] };
  }

  const partialReasons = computePartialReasons({ recommendation, decisionTrace, outcome });
  if (partialReasons.length) {
    return { recommendationId, status: "PARTIAL", reasons: partialReasons };
  }

  return { recommendationId, status: "READY", reasons: [] };
}

/**
 * Bulk classification for every recommendation, reusing one pass of
 * outcomeValidationService's findings (rather than re-querying per row) so
 * this scales to the whole dataset without N+1 aggregate scans.
 */
async function validateAllRecommendations() {
  const { getPrismaClient } = require("../../db/prismaClient");
  const prisma = getPrismaClient();
  const recommendations = await prisma.recommendation.findMany({ select: { id: true } });

  const contaminationReport = await outcomeValidationService.runOutcomeValidation();
  const contaminatedIds = new Set(contaminationReport.findings.map((finding) => finding.recommendationId));

  const results = [];
  for (const { id } of recommendations) {
    const result = await validateRecommendation(id);
    // Cross-reference against the aggregate integrity findings (lifecycle
    // corruption, duplicate grading, time inconsistencies) — a row that
    // otherwise looks READY/PARTIAL but was flagged by those checks is
    // reclassified as CONTAMINATED, never silently left as if it were clean.
    if (contaminatedIds.has(id) && result.status !== "INVALID") {
      results.push({ ...result, status: "CONTAMINATED", reasons: [...result.reasons, "Flagged by outcome/lifecycle integrity validation."] });
    } else {
      results.push(result);
    }
  }
  return results;
}

module.exports = { validateRecommendation, validateAllRecommendations };
