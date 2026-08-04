// Phase MACRO-AGENT-001 — "Employment". Real UNRATE trend classification.
// Unemployment RATE falling YoY means employment conditions are
// IMPROVING; rising means WORSENING — disclosed thresholds (±0.2 pp is
// treated as noise/STABLE, matching FRED's own reporting granularity).
const STABLE_BAND = 0.2;

/**
 * @param {{ dataAvailable: boolean, changeYoY: number|null, latest: {value:number}|null }} employmentSeries - from fredSeriesProvider (UNRATE)
 * @returns {{ trend: "IMPROVING"|"WORSENING"|"STABLE"|"UNKNOWN", unemploymentRate: number|null, unemploymentChangeYoY: number|null }}
 */
function analyzeEmployment(employmentSeries) {
  if (!employmentSeries.dataAvailable || !Number.isFinite(employmentSeries.changeYoY)) {
    return { trend: "UNKNOWN", unemploymentRate: null, unemploymentChangeYoY: null };
  }

  const unemploymentChangeYoY = employmentSeries.changeYoY;
  let trend = "STABLE";
  if (unemploymentChangeYoY > STABLE_BAND) trend = "WORSENING";
  else if (unemploymentChangeYoY < -STABLE_BAND) trend = "IMPROVING";

  return {
    trend,
    unemploymentRate: employmentSeries.latest ? employmentSeries.latest.value : null,
    unemploymentChangeYoY,
  };
}

module.exports = { analyzeEmployment, STABLE_BAND };
