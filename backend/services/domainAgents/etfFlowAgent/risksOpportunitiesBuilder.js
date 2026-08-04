// Phase ETF-FLOW-AGENT-001 — "Risks" / "Opportunities". Every string is
// a deterministic template over a real, already-computed field — never
// an invented observation, never an LLM call.
function buildOpportunities({ etfFlowBias, netFlowScore, sectorRotation, flowAcceleration, flowPersistence }) {
  const opportunities = [];
  if (etfFlowBias === "BULLISH") {
    opportunities.push(`Net ETF flow proxy is bullish (score ${netFlowScore}).`);
  }
  if (sectorRotation.classification === "ROTATING_IN") {
    opportunities.push(`Real relative strength suggests capital may be rotating into this sector/theme (+${sectorRotation.relativeStrengthPercent}% vs. the market reference).`);
  }
  if (flowAcceleration.classification === "ACCELERATING" && etfFlowBias === "BULLISH") {
    opportunities.push(`Flow proxy is accelerating in the bullish direction (rate ${flowAcceleration.accelerationRate}).`);
  }
  if (flowPersistence.classification === "HIGH" && flowPersistence.dominantDirection === "INFLOW") {
    opportunities.push(`Flow persistence is high (${Math.round(flowPersistence.persistenceRatio * 100)}% of recent days trended the same real direction).`);
  }
  return opportunities;
}

function buildRisks({ etfFlowBias, sectorRotation, flowAcceleration, flowPersistence, isDirectEtf, barsCount }) {
  const risks = [];
  if (etfFlowBias === "BEARISH") {
    risks.push("Net ETF flow proxy is bearish.");
  }
  if (sectorRotation.classification === "ROTATING_OUT") {
    risks.push(`Real relative weakness suggests capital may be rotating out of this sector/theme (${sectorRotation.relativeStrengthPercent}% vs. the market reference).`);
  }
  if (flowAcceleration.classification === "DECELERATING") {
    risks.push("Flow proxy momentum is decelerating.");
  }
  if (flowPersistence.classification === "HIGH" && flowPersistence.dominantDirection === "OUTFLOW") {
    risks.push(`Flow persistence is high in the outflow direction (${Math.round(flowPersistence.persistenceRatio * 100)}% of recent days).`);
  }
  if (!isDirectEtf) {
    risks.push("This read is an indirect sector-ETF proxy for a stock symbol, one step removed from the symbol itself.");
  }
  if (barsCount < 30) {
    risks.push(`Limited real price history (${barsCount} bar(s)) — this read has reduced statistical power.`);
  }
  risks.push("Fund concentration and stock-level ETF exposure could not be assessed — no real, licensed holdings data source is connected.");
  return risks;
}

module.exports = { buildOpportunities, buildRisks };
