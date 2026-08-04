// Phase UNIFIED-STOCK-INTELLIGENCE-001 — real semantic conflict
// detection over the NORMALIZED (BULLISH/NEUTRAL/BEARISH) directions
// from agentDirectionMapper.js — distinct from, and necessary because
// of, the Agent Orchestrator's own generic conflict detector
// (agentOrchestrator.js's detectConflicts), which only compares raw
// per-agent direction strings for equality and would be meaningless
// here (options' "BULLISH" vs. earnings' "POSITIVE" never match as
// strings despite meaning the same thing). A NEUTRAL agent never
// "conflicts" with anything — it has no real lean to disagree with.
function detectConflicts(normalizedAgents) {
  const withRealDirection = normalizedAgents.filter((agent) => agent.available && agent.direction && agent.direction !== "NEUTRAL");
  const conflicts = [];

  for (let i = 0; i < withRealDirection.length; i += 1) {
    for (let j = i + 1; j < withRealDirection.length; j += 1) {
      const a = withRealDirection[i];
      const b = withRealDirection[j];
      if (a.direction !== b.direction) {
        conflicts.push({
          agentA: a.agentId,
          directionA: a.direction,
          agentB: b.agentId,
          directionB: b.direction,
        });
      }
    }
  }

  return conflicts;
}

module.exports = { detectConflicts };
