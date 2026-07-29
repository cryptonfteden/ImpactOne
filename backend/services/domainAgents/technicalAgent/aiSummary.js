// Phase TECHNICAL-AGENT-001 — "AI Summary" is a deterministic,
// template-based composition of clauses derived from the report's own
// real, already-computed fields. This is NOT an LLM or external API
// call — it is plain string concatenation, consistent with every other
// domain agent built this session.
function describeTrend(trend, trendStrength) {
  if (trend === "NEUTRAL") return "Price action shows no clear directional trend";
  const direction = trend === "BULLISH" ? "an uptrend" : "a downtrend";
  const strengthWord = trendStrength >= 40 ? "strong" : trendStrength >= 20 ? "moderate" : "weak";
  return `Price is in ${direction} with ${strengthWord} trend strength (ADX-based, ${trendStrength}/100)`;
}

function describeMomentum(momentumState) {
  const phrases = {
    STRONG_BULLISH: "momentum is strongly bullish, with MACD and RSI both aligned to the upside",
    BULLISH: "momentum is bullish",
    STRONG_BEARISH: "momentum is strongly bearish, with MACD and RSI both aligned to the downside",
    BEARISH: "momentum is bearish",
    OVERBOUGHT_CAUTION: "RSI is overbought, warranting caution on further upside chasing",
    OVERSOLD_OPPORTUNITY: "RSI is oversold, which can present a mean-reversion opportunity",
    NEUTRAL: "momentum is neutral",
  };
  return phrases[momentumState] || "momentum could not be determined";
}

function describeLevels(levels) {
  const nearestSupport = levels.supportLevels[0];
  const nearestResistance = levels.resistanceLevels[0];
  const parts = [];
  if (nearestSupport) parts.push(`nearest support near ${nearestSupport.price.toFixed(2)} (${nearestSupport.source})`);
  if (nearestResistance) parts.push(`nearest resistance near ${nearestResistance.price.toFixed(2)} (${nearestResistance.source})`);
  return parts.length ? `Key levels: ${parts.join(", ")}.` : "";
}

function describeBreakoutAndRisk(breakout, risk) {
  const breakoutPart = Number.isFinite(breakout.probability)
    ? `Breakout probability is estimated at ${breakout.probability}/100 (${breakout.reason})`
    : "Breakout probability could not be estimated (insufficient data)";
  return `${breakoutPart}. Risk level is ${risk.riskLevel} (${risk.reason})`;
}

/**
 * @param {object} report - the composed technical report (trend, trendStrength, momentum, levels, breakout, risk, confidence)
 * @returns {string}
 */
function generateAiSummary(report) {
  if (!report.dataAvailable) {
    return `Technical analysis is unavailable for ${report.symbol}: ${report.unavailableReason}`;
  }

  const sentences = [
    `${describeTrend(report.trend, report.trendStrength)}, while ${describeMomentum(report.momentum.state)}.`,
    describeLevels(report.levels),
    describeBreakoutAndRisk(report.breakout, report.risk),
    `Overall confidence in this read is ${report.confidence.confidence}/100.`,
  ].filter(Boolean);

  return sentences.join(" ");
}

module.exports = { generateAiSummary };
