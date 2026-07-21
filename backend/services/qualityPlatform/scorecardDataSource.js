// Sprint 42 — shared read-only data source for every scorecard (committee,
// CIO, evidence). Joins graded Outcomes back to their real Recommendation
// and DecisionTrace — only rows backed by the ONE unified committee
// (Sprint 41, DecisionTrace.committeeDebate.committee) are included, so
// scorecards never blend in historical rows from the retired legacy
// committee system. UNGRADEABLE outcomes are excluded — there is no real
// win/loss signal to attribute.
const { getPrismaClient } = require("../../db/prismaClient");

async function loadGradedRows({ sinceDays } = {}) {
  const prisma = getPrismaClient();
  const outcomes = await prisma.outcome.findMany({
    where: { gradeLabel: { not: "UNGRADEABLE" }, directionCorrect: { not: null } },
    orderBy: { gradedAt: "desc" },
  });
  if (!outcomes.length) return [];

  const recommendationIds = [...new Set(outcomes.map((outcome) => outcome.recommendationId))];
  const [recommendations, traces] = await Promise.all([
    prisma.recommendation.findMany({ where: { id: { in: recommendationIds } } }),
    prisma.decisionTrace.findMany({ where: { recommendationId: { in: recommendationIds } } }),
  ]);
  const recommendationsById = new Map(recommendations.map((rec) => [rec.id, rec]));
  const tracesByRecommendationId = new Map(traces.map((trace) => [trace.recommendationId, trace]));

  const cutoff = sinceDays ? new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000) : null;
  const rows = [];
  for (const outcome of outcomes) {
    const recommendation = recommendationsById.get(outcome.recommendationId);
    if (!recommendation) continue;
    if (cutoff && recommendation.createdAt < cutoff) continue;

    const trace = tracesByRecommendationId.get(outcome.recommendationId);
    const committee = trace?.committeeDebate?.committee || null;
    rows.push({ outcome, recommendation, committee });
  }
  return rows;
}

module.exports = { loadGradedRows };
