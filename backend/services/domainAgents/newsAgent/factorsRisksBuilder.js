// Phase NEWS-AGENT-001 — "Bullish Factors", "Bearish Factors", "Risks"
// (this mission's own 3-array output shape, matching the insider/
// sentiment/macro pattern). Every factor/risk string is derived
// directly from a real, already-computed upstream field — never
// fabricated commentary.
function buildBullishFactors({ newsBias, newsScore, positiveCount, importanceScore, confirmationScore }) {
  const factors = [];

  if (newsBias === "BULLISH") {
    factors.push(`News Bias is bullish (News Score ${newsScore}) — ${positiveCount} real positively-scored article(s) in the current window.`);
  }
  if (importanceScore >= 60) {
    factors.push(`News Importance is elevated (${importanceScore}/100), meaning this window's real coverage is unusually significant.`);
  }
  if (confirmationScore >= 60) {
    factors.push(`Multi-source confirmation is strong (${confirmationScore}/100) — this real news is corroborated across multiple real, credible sources.`);
  }

  return factors;
}

function buildBearishFactors({ newsBias, newsScore, negativeCount, importanceScore, confirmationScore }) {
  const factors = [];

  if (newsBias === "BEARISH") {
    factors.push(`News Bias is bearish (News Score ${newsScore}) — ${negativeCount} real negatively-scored article(s) in the current window.`);
  }
  if (importanceScore >= 60 && newsBias !== "BULLISH") {
    factors.push(`News Importance is elevated (${importanceScore}/100) alongside a non-bullish read, warranting attention.`);
  }
  if (confirmationScore < 30) {
    factors.push(`Multi-source confirmation is weak (${confirmationScore}/100) — this real news is not yet well-corroborated.`);
  }

  return factors;
}

function buildRisks({ freshnessScore, dataAvailable, unavailableReason, confidence, persistenceClassification }) {
  const risks = [];

  if (!dataAvailable) {
    risks.push(`No verified real news is available: ${unavailableReason}`);
    return risks;
  }

  if (freshnessScore < 30) {
    risks.push("The most recent real article is stale — this read may not reflect the current real news cycle.");
  }
  if (persistenceClassification === "SINGLE_DAY") {
    risks.push("Real coverage is limited to a single real day — this story's staying power is not yet established.");
  }
  if (confidence < 50) {
    risks.push(`Confidence is limited (${confidence}/100) given the real data available for this symbol.`);
  }

  return risks;
}

module.exports = { buildBullishFactors, buildBearishFactors, buildRisks };
