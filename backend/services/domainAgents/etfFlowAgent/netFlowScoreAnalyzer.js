// Phase ETF-FLOW-AGENT-001 — "ETF Flow Bias" (Bullish/Neutral/Bearish)
// and "Net Flow Score" (-100..100). A disclosed, hand-set weighted
// formula (never a naive average) over the three real, already-computed
// window directions — monthly weighted most heavily (0.5), weekly next
// (0.3), daily least (0.2), since a longer real trend is more
// meaningful evidence than a single real day. A missing window
// (insufficient real bars) contributes a real, honest 0 rather than
// being fabricated or silently dropped from the weighting.
const MONTHLY_WEIGHT = 0.5;
const WEEKLY_WEIGHT = 0.3;
const DAILY_WEIGHT = 0.2;

const BULLISH_THRESHOLD = 20;
const BEARISH_THRESHOLD = -20;

function directionSign(flow) {
  if (!flow) return 0;
  if (flow.direction === "INFLOW") return 1;
  if (flow.direction === "OUTFLOW") return -1;
  return 0;
}

/**
 * @param {{ daily: object|null, weekly: object|null, monthly: object|null }} flows
 * @returns {{ etfFlowBias: "BULLISH"|"NEUTRAL"|"BEARISH", netFlowScore: number }}
 */
function analyzeNetFlowScore({ daily, weekly, monthly }) {
  const netFlowScore = Math.round((directionSign(monthly) * MONTHLY_WEIGHT + directionSign(weekly) * WEEKLY_WEIGHT + directionSign(daily) * DAILY_WEIGHT) * 100);

  let etfFlowBias = "NEUTRAL";
  if (netFlowScore >= BULLISH_THRESHOLD) etfFlowBias = "BULLISH";
  else if (netFlowScore <= BEARISH_THRESHOLD) etfFlowBias = "BEARISH";

  return { etfFlowBias, netFlowScore };
}

module.exports = { analyzeNetFlowScore, MONTHLY_WEIGHT, WEEKLY_WEIGHT, DAILY_WEIGHT, BULLISH_THRESHOLD, BEARISH_THRESHOLD };
