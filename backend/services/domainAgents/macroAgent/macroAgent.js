// Phase MACRO-AGENT-001 — "Build the Macro Intelligence Agent." This
// module is the reusable analysis engine, composing every piece this
// mission requires (Macro Bias, Macro Score, Economic Cycle, Liquidity
// Score, Inflation Pressure, Recession Risk, Policy Direction, Market
// Stress, Confidence, Bullish/Bearish Factors, Risks, AI Summary) from
// real macroeconomic data (FRED + real market proxies) — never
// fabricating macro values, honestly reporting unavailable fields
// where no real source exists. Market-wide (not per-symbol), matching
// this mission's own scope.
const { createMacroDataProvider } = require("./macroDataProvider");
const { analyzeInflationPressure } = require("./inflationAnalyzer");
const { analyzeEmployment } = require("./employmentAnalyzer");
const { analyzeYieldCurve } = require("./yieldCurveAnalyzer");
const { analyzeCreditSpread } = require("./creditSpreadAnalyzer");
const { analyzePolicyDirection } = require("./policyDirectionAnalyzer");
const { analyzeLiquidity } = require("./liquidityAnalyzer");
const { analyzeMarketStress } = require("./marketStressAnalyzer");
const { analyzeEconomicCycle } = require("./economicCycleAnalyzer");
const { analyzeRecessionRisk } = require("./recessionRiskAnalyzer");
const { analyzeMacroScore } = require("./macroScoreAnalyzer");
const { computeConfidence } = require("./confidenceModel");
const { buildBullishFactors, buildBearishFactors, buildRisks } = require("./factorsRisksBuilder");
const { generateAiSummary } = require("./aiSummary");

const defaultProvider = createMacroDataProvider();

function buildUnavailableReport(asOf, reason, inputs) {
  const report = {
    generatedAt: asOf,
    dataAvailable: false,
    unavailableReason: reason,
    macroBias: "UNKNOWN",
    macroScore: null,
    economicCycle: "UNKNOWN",
    liquidityScore: null,
    inflationPressure: "UNKNOWN",
    recessionRisk: "UNKNOWN",
    policyDirection: "UNKNOWN",
    marketStress: "UNKNOWN",
    employmentTrend: "UNKNOWN",
    confidence: 0,
    bullishFactors: [],
    bearishFactors: [],
    risks: [],
    inputs,
  };
  report.aiSummary = generateAiSummary(report);
  return report;
}

/**
 * Generates the full normalized Macro Intelligence report. `provider`
 * defaults to the real, already-tested FRED/Yahoo-backed
 * implementation, but accepts any object implementing the documented
 * `getMacroData()` interface.
 */
async function generateReport({ provider = defaultProvider } = {}) {
  const metrics = await provider.getMacroData();

  if (!metrics.dataAvailable) {
    return buildUnavailableReport(metrics.asOf, metrics.unavailableReason, metrics);
  }

  const inflationResult = analyzeInflationPressure(metrics.inflation);
  const employmentResult = analyzeEmployment(metrics.employment);
  const yieldCurveResult = analyzeYieldCurve(metrics.yieldCurve);
  const creditSpreadResult = analyzeCreditSpread(metrics.creditSpread);
  const policyDirectionResult = analyzePolicyDirection(metrics.interestRates);
  const liquidityResult = analyzeLiquidity(metrics.liquidity);
  const marketStressResult = analyzeMarketStress(metrics.vix, creditSpreadResult);
  const economicCycleResult = analyzeEconomicCycle(metrics.gdp, employmentResult, yieldCurveResult);
  const recessionRiskResult = analyzeRecessionRisk(yieldCurveResult, creditSpreadResult, employmentResult);
  const { macroBias, macroScore } = analyzeMacroScore(
    yieldCurveResult,
    marketStressResult,
    policyDirectionResult,
    inflationResult,
    employmentResult,
    liquidityResult
  );

  const fredSeriesMap = {
    interestRates: metrics.interestRates,
    inflation: metrics.inflation,
    employment: metrics.employment,
    gdp: metrics.gdp,
    yieldCurve: metrics.yieldCurve,
    creditSpread: metrics.creditSpread,
    liquidity: metrics.liquidity,
  };
  const marketProxyMap = {
    vix: metrics.vix,
    oil: metrics.oil,
    gold: metrics.gold,
    usdStrength: metrics.usdStrength,
  };
  const confidenceResult = computeConfidence(fredSeriesMap, marketProxyMap);

  const bullishFactors = buildBullishFactors({ yieldCurveResult, marketStressResult, policyDirectionResult, inflationResult, employmentResult, liquidityResult });
  const bearishFactors = buildBearishFactors({ yieldCurveResult, marketStressResult, policyDirectionResult, inflationResult, employmentResult, liquidityResult });
  const risks = buildRisks({ creditSpreadResult, recessionRiskResult, economicCycleResult, confidence: confidenceResult });

  const report = {
    generatedAt: metrics.asOf,
    dataAvailable: true,
    unavailableReason: null,
    macroBias,
    macroScore,
    economicCycle: economicCycleResult.cycle,
    liquidityScore: liquidityResult.liquidityScore,
    inflationPressure: inflationResult.classification,
    recessionRisk: recessionRiskResult.recessionRisk,
    policyDirection: policyDirectionResult.direction,
    marketStress: marketStressResult.marketStress,
    employmentTrend: employmentResult.trend,
    confidence: confidenceResult.confidence,
    bullishFactors,
    bearishFactors,
    risks,
    // Retained for auditability/debugging — every field above traces
    // back to these real, already-fetched inputs and intermediate
    // per-signal analyzer results.
    inputs: metrics,
    details: {
      inflation: inflationResult,
      employment: employmentResult,
      yieldCurve: yieldCurveResult,
      creditSpread: creditSpreadResult,
      policyDirection: policyDirectionResult,
      liquidity: liquidityResult,
      marketStress: marketStressResult,
      economicCycle: economicCycleResult,
      recessionRisk: recessionRiskResult,
      confidence: confidenceResult,
    },
  };
  report.aiSummary = generateAiSummary(report);
  return report;
}

module.exports = { generateReport, createMacroDataProvider };
