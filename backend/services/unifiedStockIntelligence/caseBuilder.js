// Phase UNIFIED-STOCK-INTELLIGENCE-001 — "Bull Case / Bear Case / Risks
// / Opportunities. Every conclusion must be traceable to source
// agents." Pure presentation over the already-normalized per-agent
// views — every entry below is attributed to the real agent it came
// from, never an unsourced synthesized claim.
function buildBullCase(normalizedAgents) {
  return normalizedAgents
    .filter((agent) => agent.available && agent.direction === "BULLISH")
    .map((agent) => ({ agentId: agent.agentId, agentName: agent.agentName, statement: agent.summary, confidence: agent.confidence }));
}

function buildBearCase(normalizedAgents) {
  return normalizedAgents
    .filter((agent) => agent.available && agent.direction === "BEARISH")
    .map((agent) => ({ agentId: agent.agentId, agentName: agent.agentName, statement: agent.summary, confidence: agent.confidence }));
}

function buildRisks(normalizedAgents) {
  const risks = [];
  for (const agent of normalizedAgents) {
    for (const risk of agent.risks) {
      risks.push({ agentId: agent.agentId, agentName: agent.agentName, statement: risk });
    }
    if (!agent.available && agent.unavailableReason) {
      risks.push({ agentId: agent.agentId, agentName: agent.agentName, statement: `${agent.agentName} could not produce data: ${agent.unavailableReason}` });
    }
  }
  return risks;
}

function buildOpportunities(normalizedAgents) {
  const opportunities = [];
  for (const agent of normalizedAgents) {
    for (const opportunity of agent.opportunities) {
      opportunities.push({ agentId: agent.agentId, agentName: agent.agentName, statement: opportunity });
    }
  }
  return opportunities;
}

module.exports = { buildBullCase, buildBearCase, buildRisks, buildOpportunities };
