const test = require("node:test");
const assert = require("node:assert/strict");

const { validateAgent } = require("./agentInterface");
const { ALL_AGENTS, registerAllAgents } = require("./registry");
const agentOrchestrator = require("./agentOrchestrator");

// The original 13 named future-agent domains from AGENT-ORCHESTRATOR-001...
const EXPECTED_AGENT_IDS = [
  "technical",
  "options",
  "sentiment",
  "news",
  "short-interest",
  "earnings",
  "valuation",
  "fibonacci",
  "insider",
  "etf-flow",
  "institutional",
  "macro",
  "analyst-consensus",
  // ...plus SENTIMENT-AGENT-001's genuinely new 14th agent,
  // `symbol-sentiment` — real per-symbol news sentiment, deliberately
  // registered alongside (not replacing) the market-wide `sentiment`
  // agent above. This list is intentionally updated here, not silently
  // outgrown, since it's the closed set this test guards.
  "symbol-sentiment",
  // Public, no-auth context: CFTC, Polymarket, SEC and disclosed
  // congressional transactions. Kept separate from proprietary scores.
  "alternative-data",
];

test("every named agent domain has exactly one registration", () => {
  assert.deepEqual(ALL_AGENTS.map((agent) => agent.metadata.id).sort(), [...EXPECTED_AGENT_IDS].sort());
});

test("every registered agent conforms to the generic Agent interface", () => {
  for (const agent of ALL_AGENTS) {
    assert.deepEqual(validateAgent(agent), [], `agent "${agent.metadata.id}" must have zero interface violations`);
  }
});

test("no two agents share the same id", () => {
  const ids = ALL_AGENTS.map((agent) => agent.metadata.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("registerAllAgents is idempotent — calling it twice never throws a duplicate-registration error", () => {
  agentOrchestrator.clearRegistry();
  assert.doesNotThrow(() => registerAllAgents());
  assert.doesNotThrow(() => registerAllAgents());
  assert.equal(agentOrchestrator.getRegisteredAgents().length, EXPECTED_AGENT_IDS.length);
});

// "news" was the last remaining genuine stub and was upgraded to real
// at NEWS-AGENT-001 (following short-interest, macro, and
// analyst-consensus in earlier phases) — every one of the 14 named
// agent domains is now a real Domain Intelligence Agent, and
// `createStubAgent` (stubAgentFactory.js) has zero remaining call
// sites. The old "not-yet-implemented stub agents honestly report
// 'unavailable' health" test is retired rather than retargeted at a
// fake stand-in, since asserting stub behavior against a real agent
// would be dishonest test coverage. `createStubAgent` itself remains
// available (and still exercised by its own module, if any) for any
// future new agent domain this codebase adds.
test("no stub agents remain in the registry — every named agent domain reports real health, never the stub's fixed 'not yet implemented' reason", async () => {
  agentOrchestrator.clearRegistry();
  registerAllAgents();
  for (const agent of agentOrchestrator.getRegisteredAgents()) {
    const health = await agent.health();
    assert.notEqual(health.reason, `${agent.metadata.name} is not yet implemented.`, `agent "${agent.metadata.id}" must not still be a stub`);
  }
});
