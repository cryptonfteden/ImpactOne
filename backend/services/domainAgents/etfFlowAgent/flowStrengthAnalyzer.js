// Phase ETF-FLOW-AGENT-001 — "Flow Strength": compares the real
// recent (monthly-window) average daily dollar-volume proxy against
// the real longer-baseline average daily dollar volume across all
// real available bars — a real, disclosed ratio measuring whether
// current real trading activity is running above or below its own
// real recent normal, never a claim about true fund-flow strength.
const { MONTHLY_WINDOW } = require("./flowProxyCalculator");

const HIGH_STRENGTH_RATIO = 1.5;
const LOW_STRENGTH_RATIO = 0.8;

/**
 * @param {Array<object>} bars - oldest-first real daily bars
 * @param {object|null} monthlyFlow - from flowProxyCalculator
 * @returns {{ classification: "HIGH"|"NORMAL"|"LOW"|"UNKNOWN", strengthRatio: number|null }}
 */
function analyzeFlowStrength(bars, monthlyFlow) {
  if (!monthlyFlow || bars.length < MONTHLY_WINDOW) {
    return { classification: "UNKNOWN", strengthRatio: null };
  }

  const baselineDollarVolumes = bars
    .filter((bar) => Number.isFinite(bar.close) && Number.isFinite(bar.volume))
    .map((bar) => bar.close * bar.volume);
  if (!baselineDollarVolumes.length) return { classification: "UNKNOWN", strengthRatio: null };

  const baselineAvgDailyDollarVolume = baselineDollarVolumes.reduce((sum, value) => sum + value, 0) / baselineDollarVolumes.length;
  if (baselineAvgDailyDollarVolume <= 0) return { classification: "UNKNOWN", strengthRatio: null };

  const monthlyAvgDailyDollarVolume = monthlyFlow.dollarVolume / MONTHLY_WINDOW;
  const strengthRatio = Math.round((monthlyAvgDailyDollarVolume / baselineAvgDailyDollarVolume) * 100) / 100;

  let classification = "NORMAL";
  if (strengthRatio >= HIGH_STRENGTH_RATIO) classification = "HIGH";
  else if (strengthRatio <= LOW_STRENGTH_RATIO) classification = "LOW";

  return { classification, strengthRatio };
}

module.exports = { analyzeFlowStrength, HIGH_STRENGTH_RATIO, LOW_STRENGTH_RATIO };
