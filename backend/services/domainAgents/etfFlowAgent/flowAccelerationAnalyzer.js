// Phase ETF-FLOW-AGENT-001 — "Flow acceleration": compares the real
// recent (weekly-window) average daily rate of the proxy's price
// change against the real longer-baseline (monthly-window) average
// daily rate — a real, disclosed rate-of-change comparison, honestly
// reporting "insufficient data" rather than guessing when either
// window isn't real.
const ACCELERATION_THRESHOLD = 0.05; // percentage points per day — a disclosed, hand-set sensitivity

/**
 * @param {{ weekly: object|null, monthly: object|null }} flows - from flowProxyCalculator.computeDailyWeeklyMonthlyFlows
 * @returns {{ classification: "ACCELERATING"|"DECELERATING"|"STABLE"|"UNKNOWN", accelerationRate: number|null }}
 */
function analyzeFlowAcceleration({ weekly, monthly }) {
  if (!weekly || !monthly) {
    return { classification: "UNKNOWN", accelerationRate: null };
  }

  const weeklyDailyRate = weekly.priceChangePercent / 5;
  const monthlyDailyRate = monthly.priceChangePercent / 21;
  const accelerationRate = Math.round((weeklyDailyRate - monthlyDailyRate) * 1000) / 1000;

  let classification = "STABLE";
  if (Math.abs(accelerationRate) > ACCELERATION_THRESHOLD) {
    classification = accelerationRate > 0 ? "ACCELERATING" : "DECELERATING";
  }

  return { classification, accelerationRate };
}

module.exports = { analyzeFlowAcceleration, ACCELERATION_THRESHOLD };
