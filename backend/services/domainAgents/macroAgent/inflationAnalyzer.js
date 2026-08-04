// Phase MACRO-AGENT-001 — "Inflation" → "Inflation Pressure". Real,
// disclosed thresholds over the real CPI (CPIAUCSL) year-over-year
// change — the Fed's own ~2% target anchors the LOW/MODERATE boundary.
const LOW_THRESHOLD = 2;
const MODERATE_THRESHOLD = 4;
const HIGH_THRESHOLD = 6;

/**
 * @param {{ dataAvailable: boolean, changeYoY: number|null }} inflationSeries - from fredSeriesProvider (CPIAUCSL)
 * @returns {{ classification: "LOW"|"MODERATE"|"HIGH"|"ELEVATED"|"UNKNOWN", cpiChangeYoY: number|null }}
 */
function analyzeInflationPressure(inflationSeries) {
  if (!inflationSeries.dataAvailable || !Number.isFinite(inflationSeries.changeYoY)) {
    return { classification: "UNKNOWN", cpiChangeYoY: null };
  }

  const cpiChangeYoY = inflationSeries.changeYoY;
  let classification = "ELEVATED";
  if (cpiChangeYoY < LOW_THRESHOLD) classification = "LOW";
  else if (cpiChangeYoY < MODERATE_THRESHOLD) classification = "MODERATE";
  else if (cpiChangeYoY < HIGH_THRESHOLD) classification = "HIGH";

  return { classification, cpiChangeYoY };
}

module.exports = { analyzeInflationPressure, LOW_THRESHOLD, MODERATE_THRESHOLD, HIGH_THRESHOLD };
