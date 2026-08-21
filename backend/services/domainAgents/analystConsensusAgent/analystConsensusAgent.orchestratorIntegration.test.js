// Phase ANALYST-CONSENSUS-AGENT-001 — proves the new Analyst Consensus
// Intelligence Agent is genuinely compatible with the full Agent
// Platform stack: registered automatically in the registry, executed
// by the real (unmodified) Agent Orchestrator, scheduled through the
// real AgentScheduler (concurrency/health-cache/retry), and recorded
// by the real AgentObservability layer — not just unit-tested in
// isolation. Mirrors SHORT-INTEREST-AGENT-001/MACRO-AGENT-001's own
// full-stack tests.
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

test("the analyst-consensus agent is automatically registered in the Agent Registry", () => {
  const registered = agentOrchestrator.getRegisteredAgents().find((agent) => agent.metadata.id === "analyst-consensus");
  assert.ok(registered, "the analyst-consensus agent must be registered without any manual step");
  assert.equal(registered.metadata.name, "Analyst Consensus Intelligence Agent");
});

test("running the full orchestrator surfaces the real analyst consensus report via the standard per-agent result fields", async () => {
  const report = await agentOrchestrator.run("AAPL", { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "analyst-consensus") });
  const [analystResult] = report.agents;

  assert.equal(analystResult.agentId, "analyst-consensus");
  assert.ok(["fulfilled", "unavailable", "error", "timeout"].includes(analystResult.status), "a real provider call may succeed, report verified data unavailable, fail, or time out");
  if (analystResult.status === "fulfilled") {
    assert.equal(typeof analystResult.result.summary, "string");
    assert.ok(Array.isArray(analystResult.result.evidence));
    assert.ok(Number.isFinite(analystResult.confidence));
  }
}, { timeout: 30000 });

test("running through runObserved() (AgentScheduler + AgentObservability) records a real execution entry for the analyst-consensus agent", async () => {
  const log = createAgentExecutionLog();
  const { report, correlationId } = await runObserved(
    "AAPL",
    { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "analyst-consensus") },
    { log }
  );

  assert.equal(report.agents[0].agentId, "analyst-consensus");
  const records = log.getByCorrelationId(correlationId);
  assert.equal(records.length, 1);
  assert.equal(records[0].agentId, "analyst-consensus");
  assert.equal(typeof records[0].confidence, "number");
}, { timeout: 30000 });

test("the scheduler's health cache is exercised for the analyst-consensus agent (a second call against the same object reuses the cached health)", async () => {
  sharedScheduler.reset();
  const [analystConsensusAgent] = agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "analyst-consensus");

  await sharedScheduler.runAgent(analystConsensusAgent, "AAA");
  await sharedScheduler.runAgent(analystConsensusAgent, "BBB");

  const stats = sharedScheduler.getHealthCacheStats();
  assert.ok(stats.hits >= 1, "the second call must be served from the health cache for the same registered agent object");
}, { timeout: 30000 });

test("the analyst-consensus agent's direction is a real, opaque string the orchestrator can structurally compare — never inspected for meaning", async () => {
  const report = await agentOrchestrator.run("AAPL", { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "analyst-consensus") });
  const [analystResult] = report.agents;
  if (analystResult.status === "fulfilled") {
    assert.ok(analystResult.direction === null || typeof analystResult.direction === "string");
  }
}, { timeout: 30000 });
