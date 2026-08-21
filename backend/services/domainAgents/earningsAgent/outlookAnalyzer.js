// Phase EARNINGS-AGENT-001 — pure, deterministic Forward Outlook
// scoring. Combines whatever real signals are actually available this
// run. Historical growth and surprise are retained as context, but a
// forward-looking label is produced only from actual guidance and/or
// analyst-revision evidence. Strong past results are not a forecast.
// POSITIVE/NEUTRAL/NEGATIVE/UNKNOWN read. Never fabricates a lean from
// signals this environment doesn't actually have.
const NEUTRAL_BAND = 6; // +/-6 points around the 50-midpoint counts as no real lean

const GUIDANCE_DIRECTION_SCORE = { RAISED: 100, MAINTAINED: 50, LOWERED: 0 };
const REVISION_DIRECTION_SCORE = { UP: 100, MIXED: 50, DOWN: 0 };

/**
 * @param {{ growthScore: number|null }} growth
 * @param {{ surpriseScore: number|null }} surprise
 * @param {import("./earningsDataProvider").EarningsMetrics} metrics
 * @returns {{ outlook: "POSITIVE"|"NEUTRAL"|"NEGATIVE"|"UNKNOWN", confidenceContribution: number, contributions: object }}
 */
function analyzeOutlook({ growth, surprise, metrics }) {
  const contributions = {
    historicalGrowth: growth?.growthScore ?? null,
    historicalSurprise: surprise?.surpriseScore ?? null,
  };
  const weightedComponents = [];

  if (metrics?.guidance?.direction && GUIDANCE_DIRECTION_SCORE[metrics.guidance.direction] !== undefined) {
    const score = GUIDANCE_DIRECTION_SCORE[metrics.guidance.direction];
    contributions.guidance = score;
    weightedComponents.push({ score, weight: 50 });
  }
  if (metrics?.analystRevisions?.direction && REVISION_DIRECTION_SCORE[metrics.analystRevisions.direction] !== undefined) {
    const score = REVISION_DIRECTION_SCORE[metrics.analystRevisions.direction];
    contributions.analystRevisions = score;
    weightedComponents.push({ score, weight: 50 });
  }

  if (!weightedComponents.length) {
    return { outlook: "UNKNOWN", confidenceContribution: 0, contributions };
  }

  const totalWeight = weightedComponents.reduce((sum, c) => sum + c.weight, 0);
  const weightedScore = weightedComponents.reduce((sum, c) => sum + c.score * c.weight, 0) / totalWeight;

  let outlook = "NEUTRAL";
  if (weightedScore > 50 + NEUTRAL_BAND) outlook = "POSITIVE";
  else if (weightedScore < 50 - NEUTRAL_BAND) outlook = "NEGATIVE";

  // Coverage of the two genuinely forward-looking categories.
  const confidenceContribution = Math.round((totalWeight / 100) * 100);

  return { outlook, confidenceContribution, contributions };
}

module.exports = { analyzeOutlook, NEUTRAL_BAND };
