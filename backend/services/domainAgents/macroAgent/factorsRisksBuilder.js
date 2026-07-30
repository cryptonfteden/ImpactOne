// Phase MACRO-AGENT-001 — "Bullish Factors", "Bearish Factors", "Risks"
// (this mission's own 3-array output shape, matching the pattern
// already used by insider/sentiment — distinct from the 2-array
// Risks/Opportunities pattern used by etf-flow/institutional/short-interest).
// Every factor/risk string is derived directly from a real, already-
// computed upstream field — never fabricated commentary.
function buildBullishFactors({ yieldCurveResult, marketStressResult, policyDirectionResult, inflationResult, employmentResult, liquidityResult }) {
  const factors = [];

  if (yieldCurveResult.classification === "NORMAL") {
    factors.push(`Yield curve is normal (10Y-2Y spread ${yieldCurveResult.spread.toFixed(2)}pp), not signaling recession.`);
  }
  if (marketStressResult.marketStress === "LOW") {
    factors.push(`Market stress is low (VIX ${marketStressResult.vixLevel != null ? marketStressResult.vixLevel.toFixed(1) : "n/a"}).`);
  }
  if (policyDirectionResult.direction === "EASING") {
    factors.push(`Monetary policy is easing (Fed funds rate YoY change ${policyDirectionResult.fedFundsChangeYoY}pp), typically supportive for risk assets.`);
  }
  if (inflationResult.classification === "LOW" || inflationResult.classification === "MODERATE") {
    factors.push(`Inflation pressure is ${inflationResult.classification.toLowerCase()} (CPI YoY ${inflationResult.cpiChangeYoY}%).`);
  }
  if (employmentResult.trend === "IMPROVING") {
    factors.push(`Employment conditions are improving (unemployment rate YoY change ${employmentResult.unemploymentChangeYoY}pp).`);
  }
  if (Number.isFinite(liquidityResult.liquidityScore) && liquidityResult.liquidityScore >= 60) {
    factors.push(`Liquidity conditions are supportive (liquidity score ${liquidityResult.liquidityScore}/100, M2 YoY growth ${liquidityResult.m2ChangeYoY}%).`);
  }

  return factors;
}

function buildBearishFactors({ yieldCurveResult, marketStressResult, policyDirectionResult, inflationResult, employmentResult, liquidityResult }) {
  const factors = [];

  if (yieldCurveResult.classification === "INVERTED") {
    factors.push(`Yield curve is inverted (10Y-2Y spread ${yieldCurveResult.spread.toFixed(2)}pp), a classic recession warning signal.`);
  }
  if (marketStressResult.marketStress === "ELEVATED" || marketStressResult.marketStress === "HIGH") {
    factors.push(`Market stress is ${marketStressResult.marketStress.toLowerCase()} (VIX ${marketStressResult.vixLevel != null ? marketStressResult.vixLevel.toFixed(1) : "n/a"}).`);
  }
  if (policyDirectionResult.direction === "TIGHTENING") {
    factors.push(`Monetary policy is tightening (Fed funds rate YoY change +${policyDirectionResult.fedFundsChangeYoY}pp), typically a headwind for risk assets.`);
  }
  if (inflationResult.classification === "HIGH" || inflationResult.classification === "ELEVATED") {
    factors.push(`Inflation pressure is ${inflationResult.classification.toLowerCase()} (CPI YoY ${inflationResult.cpiChangeYoY}%).`);
  }
  if (employmentResult.trend === "WORSENING") {
    factors.push(`Employment conditions are worsening (unemployment rate YoY change +${employmentResult.unemploymentChangeYoY}pp).`);
  }
  if (Number.isFinite(liquidityResult.liquidityScore) && liquidityResult.liquidityScore <= 40) {
    factors.push(`Liquidity conditions are tight (liquidity score ${liquidityResult.liquidityScore}/100, M2 YoY growth ${liquidityResult.m2ChangeYoY}%).`);
  }

  return factors;
}

function buildRisks({ creditSpreadResult, recessionRiskResult, economicCycleResult, confidence }) {
  const risks = [];

  if (creditSpreadResult.classification === "WIDE" || creditSpreadResult.classification === "STRESSED") {
    risks.push(`Credit spreads are ${creditSpreadResult.classification.toLowerCase()} (high-yield OAS ${creditSpreadResult.spread.toFixed(2)}pp), indicating real credit-market stress.`);
  }
  if (recessionRiskResult.recessionRisk === "MODERATE" || recessionRiskResult.recessionRisk === "HIGH") {
    risks.push(`Recession risk is assessed as ${recessionRiskResult.recessionRisk.toLowerCase()} (score ${recessionRiskResult.recessionRiskScore}/100).`);
  }
  if (economicCycleResult.cycle === "SLOWDOWN" || economicCycleResult.cycle === "CONTRACTION") {
    risks.push(`Economic cycle reading is ${economicCycleResult.cycle.toLowerCase()} (real GDP YoY growth ${economicCycleResult.gdpChangeYoY}%).`);
  }
  if (confidence.confidence < 60) {
    risks.push(`Confidence is limited (${confidence.confidence}/100) — only ${confidence.availableSourceCount} of ${confidence.totalSourceCount} real macro data sources were available.`);
  }

  return risks;
}

module.exports = { buildBullishFactors, buildBearishFactors, buildRisks };
