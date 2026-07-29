// Phase FIBONACCI-AGENT-001 — "Extension Targets", built directly from
// the real detected primary swing via the new
// technicalIndicators.fibonacciExtension(swingLow, swingHigh, direction)
// pure function. Every extension target is a continuation TARGET (in
// the swing's own direction), never labeled support/resistance.
const indicators = require("../../intelligence/technicalIndicators");

/**
 * @param {object} swing - from swingDetector.detectPrimarySwing
 * @returns {Array<{ ratio: number, price: number }> | null}
 */
function calculateExtensionTargets(swing) {
  if (!swing) return null;
  return indicators.fibonacciExtension(swing.swingLow, swing.swingHigh, swing.direction);
}

module.exports = { calculateExtensionTargets };
