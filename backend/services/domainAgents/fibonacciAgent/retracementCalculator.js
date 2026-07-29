// Phase FIBONACCI-AGENT-001 — "Retracement Levels", built directly from
// the real detected primary swing via the existing, already-real
// technicalIndicators.fibonacciRetracement(high, low) pure function.
// Each level is labeled with its real directional meaning: in an
// UP swing (continuation bias up), a pullback toward these levels is
// looking for real SUPPORT; in a DOWN swing, it is looking for real
// RESISTANCE.
const indicators = require("../../intelligence/technicalIndicators");

/**
 * @param {object} swing - from swingDetector.detectPrimarySwing
 * @returns {Array<{ ratio: number, price: number, role: "support"|"resistance" }> | null}
 */
function calculateRetracementLevels(swing) {
  if (!swing) return null;
  const levels = indicators.fibonacciRetracement(swing.swingHigh, swing.swingLow);
  if (!levels) return null;
  const role = swing.direction === "UP" ? "support" : "resistance";
  return levels.map((level) => ({ ...level, role }));
}

module.exports = { calculateRetracementLevels };
