// Phase ETF-FLOW-AGENT-001 — "Flow persistence": real day-over-day
// price direction (as the same real, disclosed proxy for daily
// flow direction) over a real recent window, measuring how
// consistently one direction dominates — a real, disclosed
// consistency ratio, not a claim about actual fund-level flow
// persistence data.
const DEFAULT_LOOKBACK_DAYS = 10;
// Note: persistenceRatio is always >= 0.5 by construction (it's the
// dominant direction's own share of the total) — thresholds are set
// below 0.5 headroom accordingly, so LOW/MODERATE/HIGH are all real,
// reachable classifications rather than LOW being permanently unused.
const HIGH_PERSISTENCE_THRESHOLD = 0.8;
const MODERATE_PERSISTENCE_THRESHOLD = 0.6;

function dailyDirections(bars) {
  const directions = [];
  for (let i = 1; i < bars.length; i += 1) {
    if (!Number.isFinite(bars[i].close) || !Number.isFinite(bars[i - 1].close)) continue;
    if (bars[i].close > bars[i - 1].close) directions.push("INFLOW");
    else if (bars[i].close < bars[i - 1].close) directions.push("OUTFLOW");
    else directions.push("FLAT");
  }
  return directions;
}

/**
 * @param {Array<object>} bars - oldest-first real daily bars
 * @returns {{ classification: "HIGH"|"MODERATE"|"LOW"|"UNKNOWN", persistenceRatio: number|null, dominantDirection: string|null }}
 */
function analyzeFlowPersistence(bars, { lookbackDays = DEFAULT_LOOKBACK_DAYS } = {}) {
  const recentBars = bars.slice(-(lookbackDays + 1));
  const directions = dailyDirections(recentBars).filter((direction) => direction !== "FLAT");

  if (directions.length < 2) {
    return { classification: "UNKNOWN", persistenceRatio: null, dominantDirection: null };
  }

  const inflowCount = directions.filter((direction) => direction === "INFLOW").length;
  const outflowCount = directions.length - inflowCount;
  const dominantDirection = inflowCount >= outflowCount ? "INFLOW" : "OUTFLOW";
  const persistenceRatio = Math.round((Math.max(inflowCount, outflowCount) / directions.length) * 100) / 100;

  let classification = "LOW";
  if (persistenceRatio >= HIGH_PERSISTENCE_THRESHOLD) classification = "HIGH";
  else if (persistenceRatio >= MODERATE_PERSISTENCE_THRESHOLD) classification = "MODERATE";

  return { classification, persistenceRatio, dominantDirection };
}

module.exports = { analyzeFlowPersistence, DEFAULT_LOOKBACK_DAYS, HIGH_PERSISTENCE_THRESHOLD, MODERATE_PERSISTENCE_THRESHOLD };
