// Phase D1 — Learning Data Remediation. Data Completeness Audit.
//
// Every field the Learning Data Contract requires (SPRINT_43's
// LEARNING_DATA_CONTRACT.md §1.1), audited against the REAL, current
// dataset — not assumed. classification is a design judgment (documented,
// not computed); presencePct is always a genuine count/count over the real
// data, honestly null when there's nothing to measure yet.
const { getPrismaClient } = require("../../db/prismaClient");

// classification: MISSING (should exist, doesn't yet, fixable) |
// NULLABLE (honestly absent sometimes, by design — never fabricated) |
// DERIVED (computed from other stored fields, not stored itself) |
// IMPOSSIBLE (cannot be captured retroactively without violating temporal
// integrity — LEARNING_DATA_CONTRACT.md §2) | LEGACY (existed before a
// contract/shape change; older rows honestly lack it).
const FIELD_REGISTRY = [
  { field: "Recommendation ID", classification: "DERIVED", note: "Recommendation.id — always present (primary key)." },
  { field: "DecisionTrace ID", classification: "DERIVED", note: "DecisionTrace.id — present whenever a DecisionTrace exists; its absence is itself the INVALID classification in datasetValidatorService." },
  { field: "Asset (symbol)", classification: "DERIVED", note: "Recommendation.symbol — always present." },
  { field: "Asset class", classification: "MISSING", note: "No canonical backend field exists yet — only frontend heuristics (useVirtualPortfolio.js's inferAssetType). A real fix requires a new, backend-owned field, not captured this phase." },
  { field: "Sector", classification: "NULLABLE", note: "Recommendation.portfolioContext.sector — real when held, honestly null for market-scan-sourced recommendations (the majority)." },
  { field: "Market regime", classification: "LEGACY", note: "DecisionTrace.regimeSnapshot (Phase D1, new). Every row created before this phase's migration has no value — honestly absent, never backfilled (backfilling would violate temporal integrity, LEARNING_DATA_CONTRACT.md §2.1)." },
  { field: "Time window", classification: "DERIVED", note: "Outcome.timeWindow — only D1 is ever graded today (unchanged this phase)." },
  { field: "Entry price", classification: "NULLABLE", note: "Recommendation.evidence.currentPrice — best-effort, no fallback/backfill exists (unchanged this phase, a pre-existing gap)." },
  { field: "Exit price", classification: "NULLABLE", note: "Outcome.windowEndPrice — null exactly when gradeLabel is UNGRADEABLE (no live quote was available at grading time)." },
  { field: "Benchmark", classification: "NULLABLE", note: "Outcome.benchmarkSymbol — populated only when performanceEngineService successfully computed one (Sprint 42/Phase D1)." },
  { field: "Benchmark return", classification: "NULLABLE", note: "Outcome.benchmarkReturnPct — same gate as Benchmark." },
  { field: "Absolute return", classification: "NULLABLE", note: "Outcome.windowReturnPct — null exactly when UNGRADEABLE." },
  { field: "Alpha", classification: "DERIVED", note: "Outcome.riskAdjustedReturnPct — only ever populated in the same branch where a real benchmark exists (Phase D1 rule, enforced in outcomeGradingService.js)." },
  { field: "Committee votes", classification: "LEGACY", note: "DecisionTrace.committeeDebate.committee.members — only present for recommendations generated after the Sprint 41 committee unification; earlier rows have the legacy shape or none." },
  { field: "CIO decision", classification: "LEGACY", note: "DecisionTrace.committeeDebate.cio — same gate as Committee votes." },
  { field: "Evidence categories", classification: "LEGACY", note: "Per-member supportingEvidence/counterEvidence[].category inside committeeDebate.committee.members — same gate." },
  { field: "Provider snapshot", classification: "LEGACY", note: "DecisionTrace.evidenceMatrixSnapshot (Phase D1, new) — absent for every row created before this phase's migration." },
  { field: "Data freshness", classification: "LEGACY", note: "Per-category freshness/isStale fields inside evidenceMatrixSnapshot — same gate as Provider snapshot." },
  { field: "Outcome", classification: "NULLABLE", note: "Outcome row — absent until the D1 grading window elapses and grading actually runs; absence before then is UNKNOWN, not a defect." },
  { field: "Lifecycle state", classification: "LEGACY", note: "RecommendationLifecycleEvent rows (Sprint 42) — absent for any recommendation created before that sprint's migration." },
];

async function computeRealPresenceCounts() {
  const prisma = getPrismaClient();
  const [totalRecommendations, withSector, totalTraces, withRegimeSnapshot, withEvidenceSnapshot, withCommittee, totalOutcomes, withBenchmark, withAlpha, totalLifecycleEvents] = await Promise.all([
    prisma.recommendation.count(),
    // portfolioContext is only ever set (non-null) for held positions,
    // which is exactly when this engine also sets a real sector on it
    // (autonomousRecommendationEngine.js's own construction) — a direct
    // proxy for "has a real sector," not a guess.
    prisma.recommendation.count({ where: { portfolioContext: { not: null } } }),
    prisma.decisionTrace.count(),
    prisma.decisionTrace.count({ where: { regimeSnapshot: { not: null } } }),
    prisma.decisionTrace.count({ where: { evidenceMatrixSnapshot: { not: null } } }),
    prisma.decisionTrace.count({ where: { committeeDebate: { not: null } } }),
    prisma.outcome.count(),
    prisma.outcome.count({ where: { benchmarkSymbol: { not: null } } }),
    prisma.outcome.count({ where: { riskAdjustedReturnPct: { not: null } } }),
    prisma.recommendationLifecycleEvent.findMany({ distinct: ["recommendationId"], select: { recommendationId: true } }),
  ]);

  return { totalRecommendations, withSector, totalTraces, withRegimeSnapshot, withEvidenceSnapshot, withCommittee, totalOutcomes, withBenchmark, withAlpha, recommendationsWithLifecycle: totalLifecycleEvents.length };
}

function pct(numerator, denominator) {
  return Number.isFinite(numerator) && denominator > 0 ? Number(((numerator / denominator) * 100).toFixed(2)) : null;
}

async function auditLearningFields() {
  const counts = await computeRealPresenceCounts();
  const presenceByField = {
    Sector: pct(counts.withSector, counts.totalRecommendations),
    "Market regime": pct(counts.withRegimeSnapshot, counts.totalTraces),
    "Committee votes": pct(counts.withCommittee, counts.totalTraces),
    "CIO decision": pct(counts.withCommittee, counts.totalTraces),
    "Evidence categories": pct(counts.withCommittee, counts.totalTraces),
    "Provider snapshot": pct(counts.withEvidenceSnapshot, counts.totalTraces),
    "Data freshness": pct(counts.withEvidenceSnapshot, counts.totalTraces),
    Benchmark: pct(counts.withBenchmark, counts.totalOutcomes),
    "Benchmark return": pct(counts.withBenchmark, counts.totalOutcomes),
    Alpha: pct(counts.withAlpha, counts.totalOutcomes),
    "Lifecycle state": pct(counts.recommendationsWithLifecycle, counts.totalRecommendations),
  };

  return {
    generatedAt: new Date().toISOString(),
    rawCounts: counts,
    fields: FIELD_REGISTRY.map((entry) => ({ ...entry, presencePct: presenceByField[entry.field] ?? null })),
  };
}

module.exports = { FIELD_REGISTRY, auditLearningFields };
