const test = require("node:test");
const assert = require("node:assert/strict");
const { selectUnifiedIntelligenceAgents, TARGET_AGENT_IDS } = require("./agentSelector");

function fakeOrchestrator(agentIds) {
  return { getRegisteredAgents: () => agentIds.map((id) => ({ metadata: { id } })) };
}

test("TARGET_AGENT_IDS is exactly options/earnings/valuation/symbol-sentiment/insider/etf-flow, per this mission's own scope (ETF-FLOW-AGENT-001 added the 6th)", () => {
  assert.deepEqual(TARGET_AGENT_IDS, ["options", "earnings", "valuation", "symbol-sentiment", "insider", "etf-flow"]);
});

test("selects only the 6 target agents from a real registry that has many more registered", () => {
  const orchestrator = fakeOrchestrator(["technical", "options", "sentiment", "earnings", "news", "valuation", "macro", "symbol-sentiment", "insider", "etf-flow"]);
  const selected = selectUnifiedIntelligenceAgents(orchestrator);
  assert.deepEqual(
    selected.map((a) => a.metadata.id).sort(),
    ["earnings", "etf-flow", "insider", "options", "symbol-sentiment", "valuation"]
  );
});

test("honestly returns fewer than 6 if some target agents are missing from the registry — never fabricates a placeholder", () => {
  const orchestrator = fakeOrchestrator(["options", "valuation"]);
  const selected = selectUnifiedIntelligenceAgents(orchestrator);
  assert.equal(selected.length, 2);
});

test("returns an empty list, never throwing, if the registry has none of the target agents", () => {
  const orchestrator = fakeOrchestrator(["technical", "sentiment"]);
  assert.deepEqual(selectUnifiedIntelligenceAgents(orchestrator), []);
});
