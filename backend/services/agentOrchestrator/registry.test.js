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
];

test("every one of the 14 named agent domains has exactly one registration", () => {
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

test("the not-yet-implemented stub agents honestly report 'unavailable' health and are never executed by a real run", async () => {
  agentOrchestrator.clearRegistry();
  registerAllAgents();
  // "short-interest" was upgraded to real at SHORT-INTEREST-AGENT-001,
  // "macro" was upgraded to real at MACRO-AGENT-001, and
  // "analyst-consensus" was upgraded to real at
  // ANALYST-CONSENSUS-AGENT-001 — "news" remains a genuine,
  // not-yet-implemented stub, so this test now targets that id instead.
  const report = await agentOrchestrator.run("NVDA", { agents: agentOrchestrator.getRegisteredAgents().filter((a) => a.metadata.id === "news") });
  assert.equal(report.agents[0].status, "unavailable");
  assert.match(report.agents[0].health.reason, /not yet implemented/);
});
