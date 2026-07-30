// Phase ANALYST-CONSENSUS-AGENT-001 — "Risks" / "Opportunities" (this
// mission's own 2-array output shape, matching the etf-flow/
// institutional/short-interest pattern rather than the 3-array
// bullish/bearish/risks pattern). Every entry is derived directly from
// a real, already-computed upstream field — never fabricated commentary.
function buildOpportunities({ analystBias, consensusScore, ratingTrend, convictionScore, coverageQuality }) {
  const opportunities = [];

  if (analystBias === "BULLISH") {
    opportunities.push(`Analyst consensus is bullish (Consensus Score ${consensusScore}), based on the real, latest Finnhub rating distribution.`);
  }
  if (ratingTrend === "IMPROVING") {
    opportunities.push("Analyst rating trend is improving — the real weighted consensus score rose between the two most recent real reporting periods.");
  }
  if (Number.isFinite(convictionScore) && convictionScore >= 40) {
    opportunities.push(`Analyst conviction is high (${convictionScore}/100) — a real large share of ratings are Strong Buy/Strong Sell rather than moderate.`);
  }
  if (coverageQuality === "HIGH") {
    opportunities.push("Analyst coverage is deep (20+ real covering analysts), giving this consensus reading more statistical reliability.");
  }

  return opportunities;
}

function buildRisks({ analystBias, consensusScore, ratingTrend, coverageQuality, priceTargetsAvailable, priceTargetUnavailableReason, confidence }) {
  const risks = [];

  if (analystBias === "BEARISH") {
    risks.push(`Analyst consensus is bearish (Consensus Score ${consensusScore}), based on the real, latest Finnhub rating distribution.`);
  }
  if (ratingTrend === "DETERIORATING") {
    risks.push("Analyst rating trend is deteriorating — the real weighted consensus score fell between the two most recent real reporting periods.");
  }
  if (coverageQuality === "LOW") {
    risks.push("Analyst coverage is thin (fewer than 10 real covering analysts) — this consensus reading is statistically less reliable.");
  }
  if (!priceTargetsAvailable) {
    risks.push(`Price targets, price-target revisions, and target dispersion are unavailable: ${priceTargetUnavailableReason}`);
  }
  if (confidence < 50) {
    risks.push(`Confidence is limited (${confidence}/100) given the real data available for this symbol.`);
  }

  return risks;
}

module.exports = { buildOpportunities, buildRisks };
