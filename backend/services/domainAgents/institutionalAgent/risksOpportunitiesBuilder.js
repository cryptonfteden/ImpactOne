// Phase INSTITUTIONAL-AGENT-001 — "Risks" / "Opportunities". Every
// string is a deterministic template over a real, already-computed
// field — never an invented observation, never an LLM call.
function buildOpportunities({ institutionalBias, institutionalScore, accumulationDistribution, newClosedPositions, convictionAnalysis }) {
  const opportunities = [];
  if (institutionalBias === "BULLISH") {
    opportunities.push(`Institutional bias is bullish (score ${institutionalScore}).`);
  }
  if (accumulationDistribution.accumulationScore > accumulationDistribution.distributionScore && accumulationDistribution.totalIncreaseShares > 0) {
    opportunities.push(`Reported share accumulation (${accumulationDistribution.accumulationScore}/100) outweighs reported share distribution among the disclosed manager cohort.`);
  }
  if (newClosedPositions.newPositions.length > newClosedPositions.closedPositions.length) {
    opportunities.push(`${newClosedPositions.newPositions.length} real new institutional position(s) opened vs. ${newClosedPositions.closedPositions.length} closed.`);
  }
  if (convictionAnalysis.convictionScore >= 80 && institutionalBias === "BULLISH") {
    opportunities.push(`Real conviction is high (${convictionAnalysis.convictionScore}/100) among managers who changed their position.`);
  }
  return opportunities;
}

function buildRisks({ institutionalBias, accumulationDistribution, newClosedPositions, checkedCount, totalManagers }) {
  const risks = [];
  if (institutionalBias === "BEARISH") {
    risks.push("Institutional bias is bearish.");
  }
  if (accumulationDistribution.distributionScore > accumulationDistribution.accumulationScore && accumulationDistribution.totalDecreaseShares > 0) {
    risks.push(`Reported share distribution (${accumulationDistribution.distributionScore}/100) outweighs reported share accumulation among the disclosed manager cohort.`);
  }
  if (newClosedPositions.closedPositions.length > newClosedPositions.newPositions.length) {
    risks.push(`${newClosedPositions.closedPositions.length} real institutional position(s) closed vs. ${newClosedPositions.newPositions.length} opened.`);
  }
  if (checkedCount < totalManagers) {
    risks.push(`Only ${checkedCount} of ${totalManagers} disclosed managers' real data could be checked this run.`);
  }
  risks.push(`This read covers a disclosed cohort of ${totalManagers} major real institutional managers, not the full universe of real 13F filers.`);
  return risks;
}

module.exports = { buildOpportunities, buildRisks };
