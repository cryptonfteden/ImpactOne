// Phase FIBONACCI-AGENT-001 — "Dynamic support/resistance": real,
// recent local pivot highs/lows (technicalIndicators.detectSupportResistance's
// already-real pivot output), which shift over time as new bars arrive
// — unlike the static Fibonacci levels, these are recomputed fresh each
// call. Fed into confluenceZoneAnalyzer.js as an independent, real
// source of levels a Fibonacci level can be corroborated (or not) by.
const indicators = require("../../intelligence/technicalIndicators");

/**
 * @param {Array<object>} bars - oldest-first real bars
 * @param {number} lookback
 * @returns {Array<{ price: number, source: string }>}
 */
function analyzeDynamicLevels(bars, lookback = 60) {
  const detail = indicators.detectSupportResistance(bars, lookback);
  if (!detail) return [];
  const levels = [
    { price: detail.resistance, source: `${lookback}-day range high` },
    { price: detail.support, source: `${lookback}-day range low` },
    ...(detail.recentPivotHighs || []).map((price) => ({ price, source: "recent pivot high" })),
    ...(detail.recentPivotLows || []).map((price) => ({ price, source: "recent pivot low" })),
  ];
  return levels;
}

module.exports = { analyzeDynamicLevels };
