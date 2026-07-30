// Phase ANALYST-CONSENSUS-AGENT-001 — "Analyst coverage" →
// "Coverage Quality". Disclosed thresholds over the real total analyst
// count in the latest real Finnhub reporting period — more real
// analysts covering a stock generally means a more statistically
// reliable consensus reading.
const LOW_THRESHOLD = 10;
const MODERATE_THRESHOLD = 20;

/**
 * @param {number} totalAnalysts - real analyst count in the latest period
 * @returns {{ coverageQuality: "LOW"|"MODERATE"|"HIGH"|"UNKNOWN", totalAnalysts: number }}
 */
function analyzeCoverageQuality(totalAnalysts) {
  if (!Number.isFinite(totalAnalysts) || totalAnalysts <= 0) {
    return { coverageQuality: "UNKNOWN", totalAnalysts: 0 };
  }

  let coverageQuality = "HIGH";
  if (totalAnalysts < LOW_THRESHOLD) coverageQuality = "LOW";
  else if (totalAnalysts < MODERATE_THRESHOLD) coverageQuality = "MODERATE";

  return { coverageQuality, totalAnalysts };
}

module.exports = { analyzeCoverageQuality, LOW_THRESHOLD, MODERATE_THRESHOLD };
