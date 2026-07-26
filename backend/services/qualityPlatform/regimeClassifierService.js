// Phase D1 — Learning Data Remediation. Deterministic Market Regime
// Classifier (LEARNING_ARCHITECTURE.md §3, implemented for real).
//
// SAFETY-CRITICAL: this is metadata capture, never a decision input. No
// file in autonomousRecommendationEngine.js's action/confidence/threshold
// logic reads this module's output — it is only ever written onto
// DecisionTrace.regimeSnapshot for future learning/audit use (Phase D2+).
// Every branch is an explicit, auditable if/else over already-computed,
// already-observable inputs — never a fitted/black-box classifier, per the
// mission's explicit instruction. When the real inputs are insufficient to
// classify confidently, this returns UNKNOWN — it never fabricates a
// regime label.
const priceHistoryProvider = require("../intelligence/priceHistoryProvider");

const REGIME_RULESET_VERSION = "d1-v1";

const HIGH_VOL_THRESHOLD_PCT = 1.8; // daily-return stdev, in percentage points
const LOW_VOL_THRESHOLD_PCT = 0.6;
const BULL_TREND_THRESHOLD_PCT = 5; // trailing 60-trading-day SPY return
const BEAR_TREND_THRESHOLD_PCT = -5;
const MIN_BARS_REQUIRED = 20; // below this, the trend/vol read is too thin to trust

function computeReturnPct(bars) {
  if (bars.length < 2) return null;
  const first = bars[0].close;
  const last = bars[bars.length - 1].close;
  if (!Number.isFinite(first) || first === 0 || !Number.isFinite(last)) return null;
  return ((last - first) / first) * 100;
}

function computeVolatilityPct(bars) {
  const returns = [];
  for (let i = 1; i < bars.length; i += 1) {
    if (bars[i - 1].close > 0) returns.push((bars[i].close - bars[i - 1].close) / bars[i - 1].close);
  }
  if (returns.length < 2) return null;
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance) * 100;
}

/**
 * Every branch is a named, explicit rule — deliberately no scoring/fitting.
 * Returns { regime, rulesetVersion, inputs } — inputs are always the real
 * numbers that drove the decision, so a human can verify the rule fired
 * correctly without re-running anything.
 */
function classifyRegime({ macroRegime, spyBars }) {
  const trend60d = computeReturnPct(spyBars);
  const volatility20d = computeVolatilityPct((spyBars || []).slice(-21));
  const recessionRisk = macroRegime?.recessionRisk || null;
  const inflationPressure = macroRegime?.inflationPressure || null;

  const inputs = { trend60dPct: trend60d, volatility20dPct: volatility20d, recessionRisk, inflationPressure, barsUsed: (spyBars || []).length };

  if (!spyBars || spyBars.length < MIN_BARS_REQUIRED || trend60d === null || volatility20d === null) {
    return { regime: "UNKNOWN", rulesetVersion: REGIME_RULESET_VERSION, inputs, reason: "Insufficient real SPY price history to classify a regime." };
  }

  if (volatility20d >= HIGH_VOL_THRESHOLD_PCT) {
    return { regime: trend60d < 0 ? "HIGH_VOLATILITY_BEAR" : "HIGH_VOLATILITY", rulesetVersion: REGIME_RULESET_VERSION, inputs };
  }
  if (trend60d >= BULL_TREND_THRESHOLD_PCT && volatility20d <= LOW_VOL_THRESHOLD_PCT) {
    return { regime: "BULL_TREND_LOW_VOL", rulesetVersion: REGIME_RULESET_VERSION, inputs };
  }
  if (trend60d <= BEAR_TREND_THRESHOLD_PCT) {
    return { regime: "BEAR_TREND", rulesetVersion: REGIME_RULESET_VERSION, inputs };
  }
  if (recessionRisk === "high" || inflationPressure === "high") {
    return { regime: "RISK_OFF", rulesetVersion: REGIME_RULESET_VERSION, inputs };
  }
  if (recessionRisk === "low" && inflationPressure === "low" && volatility20d <= LOW_VOL_THRESHOLD_PCT) {
    return { regime: "RISK_ON", rulesetVersion: REGIME_RULESET_VERSION, inputs };
  }
  return { regime: "MIXED_UNKNOWN", rulesetVersion: REGIME_RULESET_VERSION, inputs };
}

/**
 * Fetches real SPY history and classifies — the one function production
 * callers use. Never throws: a price-history fetch failure degrades to
 * an honest UNKNOWN snapshot, matching this codebase's existing
 * resilience convention (buildCommitteeDebate, World Memory writes).
 */
async function computeRegimeSnapshot({ macroRegime } = {}) {
  try {
    const spyBars = await priceHistoryProvider.getDailyBars("SPY", { range: "3mo" });
    return { ...classifyRegime({ macroRegime, spyBars }), computedAt: new Date().toISOString() };
  } catch (error) {
    return { regime: "UNKNOWN", rulesetVersion: REGIME_RULESET_VERSION, inputs: {}, reason: "Regime classification failed.", computedAt: new Date().toISOString() };
  }
}

module.exports = { classifyRegime, computeRegimeSnapshot, REGIME_RULESET_VERSION };
