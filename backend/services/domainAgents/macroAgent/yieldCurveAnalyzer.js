// Phase MACRO-AGENT-001 — "Yield curve". Real FRED T10Y2Y (10Y minus
// 2Y Treasury spread, FRED's own pre-computed series) — a negative
// spread is the classic, real, widely-cited inversion recession signal.
const FLAT_BAND = 0.10; // percentage points either side of zero treated as FLAT

/**
 * @param {{ dataAvailable: boolean, latest: {value:number}|null }} yieldCurveSeries - from fredSeriesProvider (T10Y2Y)
 * @returns {{ classification: "NORMAL"|"FLAT"|"INVERTED"|"UNKNOWN", spread: number|null }}
 */
function analyzeYieldCurve(yieldCurveSeries) {
  if (!yieldCurveSeries.dataAvailable || !yieldCurveSeries.latest || !Number.isFinite(yieldCurveSeries.latest.value)) {
    return { classification: "UNKNOWN", spread: null };
  }

  const spread = yieldCurveSeries.latest.value;
  let classification = "NORMAL";
  if (spread < -FLAT_BAND) classification = "INVERTED";
  else if (spread <= FLAT_BAND) classification = "FLAT";

  return { classification, spread };
}

module.exports = { analyzeYieldCurve, FLAT_BAND };
