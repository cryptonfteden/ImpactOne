// Phase FIBONACCI-AGENT-001 — "Retracement Levels", built directly from
// the real detected primary swing via the existing, already-real
// technicalIndicators.fibonacciRetracement(high, low) pure function.
// Each level is labeled with its real directional meaning: in an
// UP swing (continuation bias up), a pullback toward these levels is
// looking for real SUPPORT; in a DOWN swing, it is looking for real
// RESISTANCE.
//
// Phase FIBONACCI-DEFAULTS-001 — every supported ratio is still always
// computed by the unmodified `fibonacciRetracement()` call below (real,
// never removed); this function then filters to the approved
// default-active set (0, 0.886, 1 — see fibonacciLevelConfig.js) unless
// the caller explicitly asks for a different (or the full) ratio set.
// No scoring/confluence/confidence logic changed — only which of the
// already-real levels are surfaced by default.
const indicators = require("../../intelligence/technicalIndicators");
const { DEFAULT_ACTIVE_RETRACEMENT_RATIOS } = require("./fibonacciLevelConfig");

/**
 * @param {object} swing - from swingDetector.detectPrimarySwing
 * @param {{ activeRatios?: number[] }} [options] - defaults to the approved active-by-default ratio set
 * @returns {Array<{ ratio: number, price: number, role: "support"|"resistance", enabled: true }> | null}
 */
function calculateRetracementLevels(swing, { activeRatios = DEFAULT_ACTIVE_RETRACEMENT_RATIOS } = {}) {
  if (!swing) return null;
  const levels = indicators.fibonacciRetracement(swing.swingHigh, swing.swingLow);
  if (!levels) return null;
  const role = swing.direction === "UP" ? "support" : "resistance";
  const activeSet = new Set(activeRatios);
  return levels.filter((level) => activeSet.has(level.ratio)).map((level) => ({ ...level, role, enabled: true }));
}

module.exports = { calculateRetracementLevels };
