// Phase EARNINGS-AGENT-001 — pure, deterministic "Earnings Health"
// rating, blending real profit margins, real growth score, and real
// historical consistency — whichever of those three are actually
// available this run. `UNKNOWN` (never a guessed default) when none are.
const MARGIN_CAP_PERCENT = 30; // a 30%+ net profit margin is treated as maximal for scoring purposes
const MARGIN_FLOOR_PERCENT = -10; // a -10% (loss-making) margin is treated as minimal

const CONSISTENCY_SCORE = { HIGH: 100, MODERATE: 60, LOW: 30 };

function marginToScore(netProfitMargin) {
  if (netProfitMargin === null || netProfitMargin === undefined) return null;
  const clamped = Math.max(MARGIN_FLOOR_PERCENT, Math.min(MARGIN_CAP_PERCENT, netProfitMargin));
  return Math.round(((clamped - MARGIN_FLOOR_PERCENT) / (MARGIN_CAP_PERCENT - MARGIN_FLOOR_PERCENT)) * 100);
}

/**
 * @param {import("./earningsDataProvider").EarningsMetrics} metrics
 * @param {{ growthScore: number|null }} growth
 * @param {{ rating: string }} consistency
 * @returns {{ earningsHealth: "STRONG"|"STABLE"|"WEAK"|"UNKNOWN", healthScore: number|null, contributions: object }}
 */
function analyzeEarningsHealth(metrics, growth, consistency) {
  const contributions = {};

  const marginScore = marginToScore(metrics?.margins?.netProfitMargin);
  if (marginScore !== null) contributions.margin = marginScore;

  if (growth?.growthScore !== null && growth?.growthScore !== undefined) contributions.growth = growth.growthScore;

  if (consistency?.rating && consistency.rating !== "UNKNOWN") {
    contributions.consistency = CONSISTENCY_SCORE[consistency.rating];
  }

  const values = Object.values(contributions);
  if (!values.length) {
    return { earningsHealth: "UNKNOWN", healthScore: null, contributions };
  }

  const healthScore = Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);

  let earningsHealth = "WEAK";
  if (healthScore >= 70) earningsHealth = "STRONG";
  else if (healthScore >= 45) earningsHealth = "STABLE";

  return { earningsHealth, healthScore, contributions };
}

module.exports = { analyzeEarningsHealth, marginToScore, MARGIN_CAP_PERCENT, MARGIN_FLOOR_PERCENT };
