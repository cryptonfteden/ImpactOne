// Phase MACRO-AGENT-001 — "GDP" + "Employment" + "Yield curve" →
// "Economic Cycle". A disclosed rule table over three real signals:
// real GDP (GDPC1) YoY growth, real employment trend
// (employmentAnalyzer.analyzeEmployment), and real yield-curve
// classification (yieldCurveAnalyzer.analyzeYieldCurve) — never a
// naive average, an explicit if/else decision table instead.
const GROWTH_THRESHOLD = 1.5; // real GDP YoY % below this is treated as weak growth

/**
 * @param {{ dataAvailable: boolean, changeYoY: number|null }} gdpSeries - from fredSeriesProvider (GDPC1)
 * @param {{ trend: string }} employmentResult - from employmentAnalyzer.analyzeEmployment
 * @param {{ classification: string }} yieldCurveResult - from yieldCurveAnalyzer.analyzeYieldCurve
 * @returns {{ cycle: "EXPANSION"|"SLOWDOWN"|"CONTRACTION"|"RECOVERY"|"UNKNOWN", gdpChangeYoY: number|null }}
 */
function analyzeEconomicCycle(gdpSeries, employmentResult, yieldCurveResult) {
  if (!gdpSeries.dataAvailable || !Number.isFinite(gdpSeries.changeYoY)) {
    return { cycle: "UNKNOWN", gdpChangeYoY: null };
  }

  const gdpChangeYoY = gdpSeries.changeYoY;
  const isGrowing = gdpChangeYoY > 0;
  const isWeakGrowth = gdpChangeYoY < GROWTH_THRESHOLD;
  const employmentWorsening = employmentResult.trend === "WORSENING";
  const employmentImproving = employmentResult.trend === "IMPROVING";
  const curveInverted = yieldCurveResult.classification === "INVERTED";

  let cycle;
  if (!isGrowing) {
    cycle = "CONTRACTION";
  } else if (isWeakGrowth && (employmentWorsening || curveInverted)) {
    cycle = "SLOWDOWN";
  } else if (isWeakGrowth && employmentImproving) {
    cycle = "RECOVERY";
  } else {
    cycle = "EXPANSION";
  }

  return { cycle, gdpChangeYoY };
}

module.exports = { analyzeEconomicCycle, GROWTH_THRESHOLD };
