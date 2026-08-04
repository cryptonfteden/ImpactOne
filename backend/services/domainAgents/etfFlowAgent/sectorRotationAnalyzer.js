// Phase ETF-FLOW-AGENT-001 — "Sector Rotation": compares the real
// target ETF's real monthly price-change proxy against the real
// broad-market reference ETF's (SPY) own real monthly price-change
// proxy over the same window — real relative strength, a disclosed,
// hand-set threshold decides whether capital appears to be rotating
// into or out of this sector/theme relative to the market.
const { computeFlowProxy, MONTHLY_WINDOW } = require("./flowProxyCalculator");

const ROTATION_THRESHOLD_PERCENT = 2; // percentage points of real relative outperformance/underperformance

/**
 * @param {object|null} etfMonthlyFlow - the target ETF's own real monthly flow proxy
 * @param {Array<object>} marketBars - real daily bars for the market reference ETF (SPY)
 * @returns {{ classification: "ROTATING_IN"|"ROTATING_OUT"|"NEUTRAL"|"UNKNOWN", relativeStrengthPercent: number|null }}
 */
function analyzeSectorRotation(etfMonthlyFlow, marketBars) {
  if (!etfMonthlyFlow || !marketBars || !marketBars.length) {
    return { classification: "UNKNOWN", relativeStrengthPercent: null };
  }

  const marketMonthlyFlow = computeFlowProxy(marketBars, MONTHLY_WINDOW);
  if (!marketMonthlyFlow) {
    return { classification: "UNKNOWN", relativeStrengthPercent: null };
  }

  const relativeStrengthPercent = Math.round((etfMonthlyFlow.priceChangePercent - marketMonthlyFlow.priceChangePercent) * 100) / 100;

  let classification = "NEUTRAL";
  if (relativeStrengthPercent > ROTATION_THRESHOLD_PERCENT) classification = "ROTATING_IN";
  else if (relativeStrengthPercent < -ROTATION_THRESHOLD_PERCENT) classification = "ROTATING_OUT";

  return { classification, relativeStrengthPercent };
}

module.exports = { analyzeSectorRotation, ROTATION_THRESHOLD_PERCENT };
