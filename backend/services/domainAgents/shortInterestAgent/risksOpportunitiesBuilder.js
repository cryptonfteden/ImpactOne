// Phase SHORT-INTEREST-AGENT-001 — "Risks" / "Opportunities". Every
// string is a deterministic template over a real, already-computed
// field — never an invented observation, never an LLM call.
function buildOpportunities({ shortInterestBias, shortInterestScore, squeezeProbability, coveringActivity, crowdednessScore }) {
  const opportunities = [];
  if (shortInterestBias === "BULLISH") {
    opportunities.push(`Short interest bias is bullish (score ${shortInterestScore}) — real short-selling volume has been declining.`);
  }
  if (squeezeProbability >= 70) {
    opportunities.push(`Squeeze probability is elevated (${squeezeProbability}/100) — real crowded short positioning combined with real price strength.`);
  }
  if (coveringActivity.classification === "HIGH") {
    opportunities.push(`Real covering activity is high (${Math.round(coveringActivity.decliningDayRatio * 100)}% of recent real days showed a declining short-volume ratio).`);
  }
  if (crowdednessScore >= 70 && shortInterestBias !== "BEARISH") {
    opportunities.push(`Crowdedness score is high (${crowdednessScore}/100), a real precondition for a potential future squeeze.`);
  }
  return opportunities;
}

function buildRisks({ shortInterestBias, borrowStress, daysCount, lookbackTradingDays }) {
  const risks = [];
  if (shortInterestBias === "BEARISH") {
    risks.push("Short interest bias is bearish — real short-selling volume has been increasing.");
  }
  if (daysCount < lookbackTradingDays) {
    risks.push(`Only ${daysCount} of the intended ${lookbackTradingDays} real recent trading days had usable FINRA short-volume data.`);
  }
  risks.push(`${borrowStress.unavailableReason}`);
  risks.push("Every metric here is derived from FINRA's real DAILY short-VOLUME data, a disclosed proxy — not the official bi-monthly short-interest (open short shares) figure, which requires a registered vendor this environment does not have.");
  return risks;
}

module.exports = { buildOpportunities, buildRisks };
