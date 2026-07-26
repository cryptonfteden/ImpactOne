// Phase D1 — Learning Data Remediation. Dataset Quality Report.
//
// Real, computed coverage statistics over the actual persisted dataset —
// every percentage is a genuine count/count, never a placeholder. A metric
// with a zero denominator is honestly null, not a fabricated 0% or 100%.
const { getPrismaClient } = require("../../db/prismaClient");
const datasetValidatorService = require("./datasetValidatorService");

function pct(numerator, denominator) {
  return denominator > 0 ? Number(((numerator / denominator) * 100).toFixed(2)) : null;
}

async function generateDatasetQualityReport() {
  const prisma = getPrismaClient();

  const [totalRecommendations, totalDecisionTraces, totalOutcomes, gradedOutcomes, outcomesWithBenchmark, tracesWithRegimeKnown, tracesWithEvidenceSnapshot, tracesWithCommittee] = await Promise.all([
    prisma.recommendation.count(),
    prisma.decisionTrace.count(),
    prisma.outcome.count(),
    prisma.outcome.count({ where: { gradeLabel: { not: "UNGRADEABLE" } } }),
    prisma.outcome.count({ where: { gradeLabel: { not: "UNGRADEABLE" }, benchmarkSymbol: { not: null } } }),
    prisma.decisionTrace.count({ where: { regimeSnapshot: { path: ["regime"], not: "UNKNOWN" } } }),
    prisma.decisionTrace.count({ where: { evidenceMatrixSnapshot: { not: null } } }),
    prisma.decisionTrace.findMany({ select: { committeeDebate: true } }),
  ]);

  const committeeAttributed = tracesWithCommittee.filter((trace) => Array.isArray(trace.committeeDebate?.committee?.members) && trace.committeeDebate.committee.members.length > 0).length;

  // Evidence-category attribution: real per-member citations present.
  const evidenceAttributed = tracesWithCommittee.filter((trace) =>
    (trace.committeeDebate?.committee?.members || []).some((member) => (member.supportingEvidence?.length || 0) + (member.counterEvidence?.length || 0) > 0)
  ).length;

  const validation = await datasetValidatorService.validateAllRecommendations();
  const statusCounts = validation.reduce((counts, entry) => {
    counts[entry.status] = (counts[entry.status] || 0) + 1;
    return counts;
  }, {});
  const readyOrPartial = (statusCounts.READY || 0) + (statusCounts.PARTIAL || 0);

  // Provider attribution: a real DecisionTrace's evidence-matrix snapshot
  // has at least one category with real (non-UNAVAILABLE) provider
  // participation — never counted as attributed when every category is
  // honestly unavailable.
  const tracesWithSnapshot = await prisma.decisionTrace.findMany({ where: { evidenceMatrixSnapshot: { not: null } }, select: { evidenceMatrixSnapshot: true } });
  const providerAttributed = tracesWithSnapshot.filter((trace) => (trace.evidenceMatrixSnapshot?.categories || []).some((category) => category.stance !== "UNAVAILABLE")).length;

  return {
    generatedAt: new Date().toISOString(),
    totalRecommendations,
    completionPct: pct(readyOrPartial, totalRecommendations),
    benchmarkCoveragePct: pct(outcomesWithBenchmark, gradedOutcomes),
    regimeCoveragePct: pct(tracesWithRegimeKnown, totalDecisionTraces),
    evidenceCoveragePct: pct(evidenceAttributed, totalDecisionTraces),
    committeeAttributionPct: pct(committeeAttributed, totalDecisionTraces),
    providerAttributionPct: pct(providerAttributed, tracesWithSnapshot.length),
    outcomeCoveragePct: pct(totalOutcomes, totalRecommendations),
    unknownPct: pct(statusCounts.UNKNOWN || 0, totalRecommendations),
    statusCounts: {
      READY: statusCounts.READY || 0,
      PARTIAL: statusCounts.PARTIAL || 0,
      INVALID: statusCounts.INVALID || 0,
      CONTAMINATED: statusCounts.CONTAMINATED || 0,
      UNKNOWN: statusCounts.UNKNOWN || 0,
    },
  };
}

module.exports = { generateDatasetQualityReport };
