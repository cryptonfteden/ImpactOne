// Phase MACRO-AGENT-001 — "Monetary policy" → "Policy Direction". Real
// FRED FEDFUNDS (effective federal funds rate) year-over-year change —
// disclosed threshold: a real move of more than 0.25pp (one standard
// real Fed hike/cut increment) YoY is treated as a genuine directional
// stance; anything smaller is treated as HOLDING.
const DIRECTION_THRESHOLD = 0.25;

/**
 * @param {{ dataAvailable: boolean, changeYoYPercentagePoints: number|null, latest: {value:number}|null }} interestRateSeries - from fredSeriesProvider (FEDFUNDS)
 * @returns {{ direction: "TIGHTENING"|"EASING"|"HOLDING"|"UNKNOWN", fedFundsRate: number|null, fedFundsChangeYoY: number|null }}
 */
function analyzePolicyDirection(interestRateSeries) {
  if (!interestRateSeries.dataAvailable || !Number.isFinite(interestRateSeries.changeYoYPercentagePoints)) {
    return { direction: "UNKNOWN", fedFundsRate: null, fedFundsChangeYoY: null };
  }

  const fedFundsChangeYoY = interestRateSeries.changeYoYPercentagePoints;
  let direction = "HOLDING";
  if (fedFundsChangeYoY > DIRECTION_THRESHOLD) direction = "TIGHTENING";
  else if (fedFundsChangeYoY < -DIRECTION_THRESHOLD) direction = "EASING";

  return {
    direction,
    fedFundsRate: interestRateSeries.latest ? interestRateSeries.latest.value : null,
    fedFundsChangeYoY,
  };
}

module.exports = { analyzePolicyDirection, DIRECTION_THRESHOLD };
