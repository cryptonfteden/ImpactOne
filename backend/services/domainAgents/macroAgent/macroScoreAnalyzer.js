// Phase MACRO-AGENT-001 — the top-level "Macro Score" (-100..100) and
// "Macro Bias" (Bullish/Neutral/Bearish). A disclosed, hand-set
// weighted combination of six real upstream signals — never a naive
// average. Each signal contributes an independently-disclosed weight;
// any signal that's UNKNOWN (real data unavailable) simply drops out
// and the remaining weights are renormalized, so a partial real macro
// picture still produces an honest score rather than a fabricated one.
//
// Weights (of 100 total when all six are available):
//   yieldCurve     25  (real T10Y2Y — classic leading signal)
//   marketStress   20  (real VIX + credit-spread composite)
//   policyDirection 15 (real FEDFUNDS trend — easing is bullish for risk assets)
//   inflationPressure 15 (real CPI YoY — high/elevated inflation is bearish)
//   employment     15  (real UNRATE trend)
//   liquidity      10  (real M2SL YoY, already a 0-100 score)
const WEIGHTS = {
  yieldCurve: 25,
  marketStress: 20,
  policyDirection: 15,
  inflationPressure: 15,
  employment: 15,
  liquidity: 10,
};

// Each signal's classification is mapped onto its own -1..+1 real
// directional contribution before applying its weight.
const YIELD_CURVE_SIGNAL = { NORMAL: 1, FLAT: 0, INVERTED: -1 };
const MARKET_STRESS_SIGNAL = { LOW: 1, MODERATE: 0.3, ELEVATED: -0.5, HIGH: -1 };
const POLICY_DIRECTION_SIGNAL = { EASING: 1, HOLDING: 0, TIGHTENING: -1 };
const INFLATION_SIGNAL = { LOW: 0.5, MODERATE: 1, HIGH: -0.5, ELEVATED: -1 };
const EMPLOYMENT_SIGNAL = { IMPROVING: 1, STABLE: 0, WORSENING: -1 };

function biasFromScore(score) {
  if (score > 15) return "BULLISH";
  if (score < -15) return "BEARISH";
  return "NEUTRAL";
}

/**
 * @param {{ classification: string }} yieldCurveResult
 * @param {{ marketStress: string }} marketStressResult
 * @param {{ direction: string }} policyDirectionResult
 * @param {{ classification: string }} inflationResult
 * @param {{ trend: string }} employmentResult
 * @param {{ liquidityScore: number|null }} liquidityResult
 * @returns {{ macroBias: "BULLISH"|"NEUTRAL"|"BEARISH"|"UNKNOWN", macroScore: number|null }}
 */
function analyzeMacroScore(yieldCurveResult, marketStressResult, policyDirectionResult, inflationResult, employmentResult, liquidityResult) {
  const contributions = [];

  const yieldSignal = YIELD_CURVE_SIGNAL[yieldCurveResult.classification];
  if (yieldSignal !== undefined) contributions.push({ weight: WEIGHTS.yieldCurve, signal: yieldSignal });

  const stressSignal = MARKET_STRESS_SIGNAL[marketStressResult.marketStress];
  if (stressSignal !== undefined) contributions.push({ weight: WEIGHTS.marketStress, signal: stressSignal });

  const policySignal = POLICY_DIRECTION_SIGNAL[policyDirectionResult.direction];
  if (policySignal !== undefined) contributions.push({ weight: WEIGHTS.policyDirection, signal: policySignal });

  const inflationSignal = INFLATION_SIGNAL[inflationResult.classification];
  if (inflationSignal !== undefined) contributions.push({ weight: WEIGHTS.inflationPressure, signal: inflationSignal });

  const employmentSignal = EMPLOYMENT_SIGNAL[employmentResult.trend];
  if (employmentSignal !== undefined) contributions.push({ weight: WEIGHTS.employment, signal: employmentSignal });

  if (Number.isFinite(liquidityResult.liquidityScore)) {
    const liquiditySignal = (liquidityResult.liquidityScore - 50) / 50; // 0-100 -> -1..+1
    contributions.push({ weight: WEIGHTS.liquidity, signal: liquiditySignal });
  }

  if (!contributions.length) {
    return { macroBias: "UNKNOWN", macroScore: null };
  }

  const totalWeight = contributions.reduce((sum, contribution) => sum + contribution.weight, 0);
  const weightedSignal = contributions.reduce((sum, contribution) => sum + contribution.weight * contribution.signal, 0) / totalWeight;
  const macroScore = Math.round(weightedSignal * 100);

  return { macroBias: biasFromScore(macroScore), macroScore };
}

module.exports = {
  analyzeMacroScore,
  WEIGHTS,
  YIELD_CURVE_SIGNAL,
  MARKET_STRESS_SIGNAL,
  POLICY_DIRECTION_SIGNAL,
  INFLATION_SIGNAL,
  EMPLOYMENT_SIGNAL,
};
