// Phase ETF-FLOW-AGENT-001 — "Passive vs Active flows" / "Passive Flow
// Impact". Combines the disclosed, hand-set passive/active
// classification (etfClassificationReference.js — real, well-known
// tickers only, honestly `null`/UNKNOWN otherwise) with the real
// monthly dollar-volume proxy's magnitude, tiered by disclosed
// thresholds, to describe how much real trading-activity flow is
// associated with this passive- or active-style fund.
const HIGH_MAGNITUDE_THRESHOLD = 1_000_000_000; // $1B monthly dollar volume
const MODERATE_MAGNITUDE_THRESHOLD = 100_000_000; // $100M

function magnitudeTierOf(dollarVolume) {
  if (dollarVolume >= HIGH_MAGNITUDE_THRESHOLD) return "HIGH";
  if (dollarVolume >= MODERATE_MAGNITUDE_THRESHOLD) return "MODERATE";
  return "LOW";
}

/**
 * @param {"PASSIVE"|"ACTIVE"|null} classification
 * @param {object|null} monthlyFlow - from flowProxyCalculator
 * @returns {{ classification: "PASSIVE"|"ACTIVE"|"UNKNOWN", direction: string|null, magnitudeTier: "LOW"|"MODERATE"|"HIGH"|"UNKNOWN" }}
 */
function analyzePassiveActiveImpact(classification, monthlyFlow) {
  return {
    classification: classification || "UNKNOWN",
    direction: monthlyFlow?.direction || null,
    magnitudeTier: monthlyFlow ? magnitudeTierOf(monthlyFlow.dollarVolume) : "UNKNOWN",
  };
}

module.exports = { analyzePassiveActiveImpact, magnitudeTierOf, HIGH_MAGNITUDE_THRESHOLD, MODERATE_MAGNITUDE_THRESHOLD };
