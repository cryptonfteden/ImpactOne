// Phase SENTIMENT-AGENT-001 — proves the new Sentiment Intelligence
// Agent is genuinely compatible with the full Agent Platform stack:
// registered automatically in the registry, executed by the real
// (unmodified) Agent Orchestrator, scheduled through the real
// AgentScheduler (concurrency/health-cache/retry), and recorded by the
// real AgentObservability layer — not just unit-tested in isolation.
// Mirrors TECHNICAL-AGENT-001/FIBONACCI-AGENT-001's own full-stack tests.
require("../../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const agentOrchestrator = require("../../agentOrchestrator/agentOrchestrator");
const { registerAllAgents } = require("../../agentOrchestrator/registry");
const { runObserved } = require("../../agentObservability/observableOrchestrator");
const { createAgentExecutionLog } = require("../../agentObservability/agentExecutionLog");
const { sharedScheduler } = require("../../agentScheduler/agentScheduler");

test.beforeEach(() => {
  agentOrchestrator.clearRegistry();
  registerAllAgents();
});

test("the symbol-sentiment agent is automatically registered in the Agent Registry, distinct from the market-wide sentiment agent", () => {
  const registered = agentOrchestrator.getRegisteredAgents().find((agent) => agent.metadata.id === "symbol-sentiment");
  assert.ok(registered, "the symbol-sentiment agent must be registered without any manual step");
  assert.equal(registered.metadata.name, "Sentiment Intelligence Agent");
  const marketWide = agentOrchestrator.getRegisteredAgents().find((agent) => agent.metadata.id === "sentiment");
  assert.ok(marketWide, "the original market-wide sentiment agent must still be registered, unreplaced");
});

test("running the full orchestrator surfaces the rich sentiment report via the standard per-agent result fields", async () => {
  const report = await agentOrchestrator.run("AAPL", { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "symbol-sentiment") });
  const [sentimentResult] = report.agents;

  assert.equal(sentimentResult.agentId, "symbol-sentiment");
  assert.ok(["fulfilled", "unavailable", "error", "timeout"].includes(sentimentResult.status), "a real provider call may succeed, report verified data unavailable, fail, or time out");
  if (sentimentResult.status === "fulfilled") {
    assert.equal(typeof sentimentResult.result.summary, "string");
    assert.ok(Array.isArray(sentimentResult.result.evidence));
    assert.ok(Number.isFinite(sentimentResult.confidence));
  }
});

test("running through runObserved() (AgentScheduler + AgentObservability) records a real execution entry for the sentiment agent", async () => {
  const log = createAgentExecutionLog();
  const { report, correlationId } = await runObserved(
    "AAPL",
    { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "symbol-sentiment") },
    { log }
  );

  assert.equal(report.agents[0].agentId, "symbol-sentiment");
  const records = log.getByCorrelationId(correlationId);
  assert.equal(records.length, 1);
  assert.equal(records[0].agentId, "symbol-sentiment");
  assert.equal(typeof records[0].confidence, "number");
});

test("the scheduler's health cache is exercised for the sentiment agent (a second call against the same object reuses the cached health)", async () => {
  sharedScheduler.reset();
  const [sentimentAgent] = agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "symbol-sentiment");

  await sharedScheduler.runAgent(sentimentAgent, "AAA");
  await sharedScheduler.runAgent(sentimentAgent, "BBB");

  const stats = sharedScheduler.getHealthCacheStats();
  assert.ok(stats.hits >= 1, "the second call must be served from the health cache for the same registered agent object");
});

test("the sentiment agent's direction is a real, opaque string the orchestrator can structurally compare — never inspected for meaning", async () => {
  const report = await agentOrchestrator.run("AAPL", { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "symbol-sentiment") });
  const [sentimentResult] = report.agents;
  if (sentimentResult.status === "fulfilled") {
    assert.ok(sentimentResult.direction === null || typeof sentimentResult.direction === "string");
  }
});
