// Phase TECHNICAL-AGENT-001 — "Risk Level" (LOW/MODERATE/HIGH), a
// deterministic rule table over real, already-computed inputs: the
// existing volatilityRegime signal (ATR-percentile-based), real ATR as
// a percent of price (a scale-independent volatility measure), and
// whether a breakout has recently failed (a real, elevated-risk event).
const LOW = "LOW";
const MODERATE = "MODERATE";
const HIGH = "HIGH";

function atrPercentOfPrice(atrSignal) {
  if (!atrSignal || atrSignal.enoughDataStatus !== "SUFFICIENT") return null;
  const { value, lastClose } = atrSignal.calculationInputs;
  if (!Number.isFinite(value) || !Number.isFinite(lastClose) || lastClose <= 0) return null;
  return (value / lastClose) * 100;
}

/**
 * @param {object} signals - TechnicalMetrics.signals (atr, volatilityRegime, breakout)
 * @returns {{ riskLevel: "LOW"|"MODERATE"|"HIGH", atrPercentOfPrice: number|null, volatilityRegime: string|null, reason: string }}
 */
function analyzeRiskLevel(signals) {
  const volatilityRegime = signals.volatilityRegime;
  const regimeSignal = volatilityRegime?.enoughDataStatus === "SUFFICIENT" ? volatilityRegime.signal : null;
  const atrPercent = atrPercentOfPrice(signals.atr);
  const failedBreakout = signals.breakout?.signal === "FAILED_BREAKOUT";

  if (regimeSignal === null && atrPercent === null) {
    return { riskLevel: MODERATE, atrPercentOfPrice: null, volatilityRegime: null, reason: "Insufficient volatility data — defaulting to a moderate, uncertain risk level." };
  }

  let score = 0; // higher = riskier
  if (regimeSignal === "HIGH_VOLATILITY") score += 2;
  else if (regimeSignal === "LOW_VOLATILITY") score -= 1;

  if (Number.isFinite(atrPercent)) {
    if (atrPercent >= 4) score += 2;
    else if (atrPercent >= 2) score += 1;
  }

  if (failedBreakout) score += 1;

  let riskLevel;
  if (score >= 3) riskLevel = HIGH;
  else if (score <= -1) riskLevel = LOW;
  else riskLevel = MODERATE;

  const reasonParts = [];
  if (regimeSignal) reasonParts.push(`volatility regime is ${regimeSignal.replace("_", " ").toLowerCase()}`);
  if (Number.isFinite(atrPercent)) reasonParts.push(`ATR is ${atrPercent.toFixed(1)}% of price`);
  if (failedBreakout) reasonParts.push("a breakout attempt recently failed");

  return {
    riskLevel,
    atrPercentOfPrice: Number.isFinite(atrPercent) ? Math.round(atrPercent * 100) / 100 : null,
    volatilityRegime: regimeSignal,
    reason: reasonParts.length ? `Based on real signals: ${reasonParts.join("; ")}.` : "Based on available real signals.",
  };
}

module.exports = { analyzeRiskLevel, atrPercentOfPrice };
