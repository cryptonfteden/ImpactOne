// Phase FIBONACCI-AGENT-001 — automatic swing detection. Deliberately
// simple and transparent (the same "honest first version, not a claim
// of statistical optimality" discipline technicalIndicators.js's own
// detectSupportResistance already documents): over the most recent
// `lookback` real bars, find the real highest high and real lowest
// low, then determine which occurred first chronologically — that
// ordering IS the swing's direction. A low before a high is an
// up-swing (continuation bias up); a high before a low is a
// down-swing (continuation bias down).
const MIN_BARS_FOR_SWING = 10;

/**
 * @param {Array<object>} bars - oldest-first real bars
 * @param {number} lookback
 * @returns {{ direction: "UP"|"DOWN", swingLow: number, swingHigh: number, swingLowDate: string, swingHighDate: string, swingLowIndex: number, swingHighIndex: number } | null}
 */
function detectPrimarySwing(bars, lookback = 90) {
  if (!bars || bars.length < MIN_BARS_FOR_SWING) return null;

  const window = bars.slice(-Math.min(lookback, bars.length));

  let highIndex = 0;
  let lowIndex = 0;
  for (let i = 1; i < window.length; i++) {
    if (window[i].high > window[highIndex].high) highIndex = i;
    if (window[i].low < window[lowIndex].low) lowIndex = i;
  }

  if (highIndex === lowIndex) return null; // no real, distinct swing in this window

  const direction = lowIndex < highIndex ? "UP" : "DOWN";
  return {
    direction,
    swingLow: window[lowIndex].low,
    swingHigh: window[highIndex].high,
    swingLowDate: window[lowIndex].date,
    swingHighDate: window[highIndex].date,
    swingLowIndex: lowIndex,
    swingHighIndex: highIndex,
  };
}

module.exports = { detectPrimarySwing, MIN_BARS_FOR_SWING };
