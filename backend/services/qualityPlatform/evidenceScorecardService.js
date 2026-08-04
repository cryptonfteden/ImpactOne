// Sprint 42 — Evidence Scorecard.
//
// Every evidence-matrix category (NEWS, SOCIAL, INSTITUTIONS, ANALYSTS,
// OPTIONS, TECHNICAL, SENTIMENT, COT, FUNDAMENTALS, RESEARCH — the same 10
// mission-named categories from Sprint 37's evidenceMatrixService)
// accumulates real statistics from every graded outcome: how often a
// category was actually cited by a committee member as supporting or
// counter evidence, whether citing it that way was actually correct, and
// the committee members' own average confidence when citing it. A
// category with zero real citations across all graded outcomes simply
// doesn't appear — never a fabricated zero-row for every possible category.
const { loadGradedRows } = require("./scorecardDataSource");

function round(value, decimals = 2) {
  return Number.isFinite(value) ? Number(value.toFixed(decimals)) : null;
}

function computeCategoryStats(rows) {
  const byCategory = new Map();
  let totalGradedRows = 0;

  for (const { outcome, committee } of rows) {
    if (!committee) continue;
    totalGradedRows += 1;
    const windowReturnPct = Number(outcome.windowReturnPct);
    const hasReturn = Number.isFinite(windowReturnPct);
    const positiveReturn = hasReturn && windowReturnPct > 0;

    for (const member of committee.members) {
      const citations = [
        ...(member.supportingEvidence || []).map((item) => ({ category: item.category, direction: "SUPPORT" })),
        ...(member.counterEvidence || []).map((item) => ({ category: item.category, direction: "COUNTER" })),
      ];
      for (const { category, direction } of citations) {
        if (!category) continue;
        if (!byCategory.has(category)) {
          byCategory.set(category, { category, usageCount: 0, wins: 0, losses: 0, alphaSum: 0, alphaCount: 0, confidenceSum: 0, confidenceCount: 0 });
        }
        const stat = byCategory.get(category);
        stat.usageCount += 1;
        if (Number.isFinite(member.confidence)) {
          stat.confidenceSum += member.confidence;
          stat.confidenceCount += 1;
        }
        if (!hasReturn) continue;
        const correct = (direction === "SUPPORT" && positiveReturn) || (direction === "COUNTER" && !positiveReturn);
        if (correct) stat.wins += 1;
        else stat.losses += 1;
        const signedReturn = direction === "SUPPORT" ? windowReturnPct : -windowReturnPct;
        stat.alphaSum += signedReturn;
        stat.alphaCount += 1;
      }
    }
  }

  return { byCategory, totalGradedRows };
}

async function getEvidenceScorecard({ windowDays } = {}) {
  const rows = await loadGradedRows({ sinceDays: windowDays });
  const { byCategory, totalGradedRows } = computeCategoryStats(rows);

  const categories = [...byCategory.values()]
    .map((stat) => ({
      category: stat.category,
      usageCount: stat.usageCount,
      // Citations per 100 graded recommendations — can exceed 100 since
      // more than one committee member may cite the same category on the
      // same recommendation; this is a rate, not a bounded percentage.
      usageFrequency: totalGradedRows ? round((stat.usageCount / totalGradedRows) * 100) : null,
      winRate: stat.wins + stat.losses ? round((stat.wins / (stat.wins + stat.losses)) * 100) : null,
      averageAlphaPct: stat.alphaCount ? round(stat.alphaSum / stat.alphaCount) : null,
      averageConfidence: stat.confidenceCount ? round(stat.confidenceSum / stat.confidenceCount) : null,
    }))
    .sort((a, b) => b.usageCount - a.usageCount);

  return { windowDays: windowDays || null, generatedAt: new Date().toISOString(), totalGradedRecommendations: totalGradedRows, categories };
}

module.exports = { getEvidenceScorecard };
