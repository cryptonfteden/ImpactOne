// Phase FIBONACCI-DEFAULTS-001 — the approved default active/disabled
// state for retracement levels. This is deliberately a config layer,
// not new math: every ratio listed here is already computed by the
// existing, unmodified `technicalIndicators.fibonacciRetracement()` —
// this module only decides which of those already-real levels
// `retracementCalculator.js` surfaces BY DEFAULT. All other supported
// levels remain fully implemented and available on request (pass
// `{ activeRatios: SUPPORTED_RETRACEMENT_RATIOS }` to get every one) —
// never removed, only hidden behind the approved default.
const SUPPORTED_RETRACEMENT_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 0.886, 1];

// Approved configuration: only 0, 0.886, and 1 are active by default.
const DEFAULT_ACTIVE_RETRACEMENT_RATIOS = [0, 0.886, 1];

function isRatioActiveByDefault(ratio) {
  return DEFAULT_ACTIVE_RETRACEMENT_RATIOS.includes(ratio);
}

module.exports = { SUPPORTED_RETRACEMENT_RATIOS, DEFAULT_ACTIVE_RETRACEMENT_RATIOS, isRatioActiveByDefault };
