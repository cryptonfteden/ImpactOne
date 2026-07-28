// Phase EARNINGS-AGENT-001 — pure, deterministic Forward Outlook
// scoring. Combines whatever real signals are actually available this
// run (growth momentum, surprise momentum, and — once a real feed
// exists — guidance changes and analyst revisions) into one
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
  const contributions = {};
  const weightedComponents = [];

  if (growth?.growthScore !== null && growth?.growthScore !== undefined) {
    contributions.growth = growth.growthScore;
    weightedComponents.push({ score: growth.growthScore, weight: 35 });
  }
  if (surprise?.surpriseScore !== null && surprise?.surpriseScore !== undefined) {
    contributions.surprise = surprise.surpriseScore;
    weightedComponents.push({ score: surprise.surpriseScore, weight: 30 });
  }
  if (metrics?.guidance?.direction && GUIDANCE_DIRECTION_SCORE[metrics.guidance.direction] !== undefined) {
    const score = GUIDANCE_DIRECTION_SCORE[metrics.guidance.direction];
    contributions.guidance = score;
    weightedComponents.push({ score, weight: 20 });
  }
  if (metrics?.analystRevisions?.direction && REVISION_DIRECTION_SCORE[metrics.analystRevisions.direction] !== undefined) {
    const score = REVISION_DIRECTION_SCORE[metrics.analystRevisions.direction];
    contributions.analystRevisions = score;
    weightedComponents.push({ score, weight: 15 });
  }

  if (!weightedComponents.length) {
    return { outlook: "UNKNOWN", confidenceContribution: 0, contributions };
  }

  const totalWeight = weightedComponents.reduce((sum, c) => sum + c.weight, 0);
  const weightedScore = weightedComponents.reduce((sum, c) => sum + c.score * c.weight, 0) / totalWeight;

  let outlook = "NEUTRAL";
  if (weightedScore > 50 + NEUTRAL_BAND) outlook = "POSITIVE";
  else if (weightedScore < 50 - NEUTRAL_BAND) outlook = "NEGATIVE";

  // How much of the FULL signal set (growth + surprise + guidance +
  // revisions = 100 possible weight) is actually present this run —
  // used as one real input into the report's overall confidence, so a
  // read built from 1 of 4 real signals is honestly less confident than
  // one built from all 4.
  const confidenceContribution = Math.round((totalWeight / 100) * 100);

  return { outlook, confidenceContribution, contributions };
}

module.exports = { analyzeOutlook, NEUTRAL_BAND };
