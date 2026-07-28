// Phase EARNINGS-AGENT-001 — a pure, deterministic scoring function: no
// ML model, no LLM call. Every weight documented below, every input a
// real number already present on EarningsMetrics — the same
// explainable-scoring discipline OPTIONS-AGENT-001's marketBiasAnalyzer
// established for this platform's Domain Agents.
const GROWTH_CAP_PERCENT = 40; // growth beyond +/-40% YoY is treated as maximal for scoring purposes — avoids one outlier quarter saturating the score

function clampGrowthToScore(growthYoY) {
  if (growthYoY === null || growthYoY === undefined) return null;
  const clamped = Math.max(-GROWTH_CAP_PERCENT, Math.min(GROWTH_CAP_PERCENT, growthYoY));
  // Maps [-40, +40] -> [0, 100], 0% growth -> 50 (the real midpoint, not an arbitrary "neutral" constant).
  return Math.round(((clamped + GROWTH_CAP_PERCENT) / (GROWTH_CAP_PERCENT * 2)) * 100);
}

/**
 * @param {import("./earningsDataProvider").EarningsMetrics} metrics
 * @returns {{ growthScore: number|null, contributions: object }}
 */
function analyzeGrowth(metrics) {
  if (!metrics?.dataAvailable) {
    return { growthScore: null, contributions: {} };
  }

  const revenueScore = clampGrowthToScore(metrics.revenue.growthYoY);
  const epsScore = clampGrowthToScore(metrics.eps.growthYoY);

  const contributions = {};
  if (revenueScore !== null) contributions.revenueGrowth = revenueScore;
  if (epsScore !== null) contributions.epsGrowth = epsScore;

  const available = [revenueScore, epsScore].filter((value) => value !== null);
  if (!available.length) {
    return { growthScore: null, contributions };
  }

  const growthScore = Math.round(available.reduce((sum, value) => sum + value, 0) / available.length);
  return { growthScore, contributions };
}

module.exports = { analyzeGrowth, clampGrowthToScore, GROWTH_CAP_PERCENT };
