// Phase MACRO-AGENT-001 — "Yield curve" + "Credit spreads" +
// "Employment" → "Recession Risk". A disclosed, hand-set weighted
// point system (never a naive average) over three real, classic
// leading-recession signals: a real yield-curve inversion is the
// single heaviest real historical predictor (worth 45 of 100 points),
// real credit-spread stress is the second heaviest (35 points), and
// real employment deterioration contributes the remainder (20 points).
const YIELD_CURVE_WEIGHT = 45;
const CREDIT_SPREAD_WEIGHT = 35;
const EMPLOYMENT_WEIGHT = 20;

const YIELD_CURVE_POINTS = { INVERTED: 1, FLAT: 0.5, NORMAL: 0, UNKNOWN: null };
const CREDIT_SPREAD_POINTS = { STRESSED: 1, WIDE: 0.6, NORMAL: 0.2, TIGHT: 0, UNKNOWN: null };
const EMPLOYMENT_POINTS = { WORSENING: 1, STABLE: 0.3, IMPROVING: 0, UNKNOWN: null };

function riskLabel(score) {
  if (score < 30) return "LOW";
  if (score < 55) return "MODERATE";
  return "HIGH";
}

/**
 * @param {{ classification: string }} yieldCurveResult - from yieldCurveAnalyzer.analyzeYieldCurve
 * @param {{ classification: string }} creditSpreadResult - from creditSpreadAnalyzer.analyzeCreditSpread
 * @param {{ trend: string }} employmentResult - from employmentAnalyzer.analyzeEmployment
 * @returns {{ recessionRisk: "LOW"|"MODERATE"|"HIGH"|"UNKNOWN", recessionRiskScore: number|null }}
 */
function analyzeRecessionRisk(yieldCurveResult, creditSpreadResult, employmentResult) {
  const yieldPoints = YIELD_CURVE_POINTS[yieldCurveResult.classification];
  const creditPoints = CREDIT_SPREAD_POINTS[creditSpreadResult.classification];
  const employmentPoints = EMPLOYMENT_POINTS[employmentResult.trend];

  const availableWeights = [];
  let weightedSum = 0;

  if (yieldPoints !== null && yieldPoints !== undefined) {
    weightedSum += yieldPoints * YIELD_CURVE_WEIGHT;
    availableWeights.push(YIELD_CURVE_WEIGHT);
  }
  if (creditPoints !== null && creditPoints !== undefined) {
    weightedSum += creditPoints * CREDIT_SPREAD_WEIGHT;
    availableWeights.push(CREDIT_SPREAD_WEIGHT);
  }
  if (employmentPoints !== null && employmentPoints !== undefined) {
    weightedSum += employmentPoints * EMPLOYMENT_WEIGHT;
    availableWeights.push(EMPLOYMENT_WEIGHT);
  }

  if (!availableWeights.length) {
    return { recessionRisk: "UNKNOWN", recessionRiskScore: null };
  }

  const totalWeight = availableWeights.reduce((sum, weight) => sum + weight, 0);
  const recessionRiskScore = Math.round((weightedSum / totalWeight) * 100);

  return { recessionRisk: riskLabel(recessionRiskScore), recessionRiskScore };
}

module.exports = { analyzeRecessionRisk, YIELD_CURVE_WEIGHT, CREDIT_SPREAD_WEIGHT, EMPLOYMENT_WEIGHT };
