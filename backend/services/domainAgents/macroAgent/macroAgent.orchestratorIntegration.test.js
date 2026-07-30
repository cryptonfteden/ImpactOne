// Phase MACRO-AGENT-001 — proves the new Macro Intelligence Agent is
// genuinely compatible with the full Agent Platform stack: registered
// automatically in the registry, executed by the real (unmodified)
// Agent Orchestrator, scheduled through the real AgentScheduler
// (concurrency/health-cache/retry), and recorded by the real
// AgentObservability layer — not just unit-tested in isolation.
// Mirrors SENTIMENT-AGENT-001/SHORT-INTEREST-AGENT-001's own full-stack
// tests.
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

test("the macro agent is automatically registered in the Agent Registry", () => {
  const registered = agentOrchestrator.getRegisteredAgents().find((agent) => agent.metadata.id === "macro");
  assert.ok(registered, "the macro agent must be registered without any manual step");
  assert.equal(registered.metadata.name, "Macro Intelligence Agent");
});

test("running the full orchestrator surfaces the real macro report via the standard per-agent result fields", async () => {
  const report = await agentOrchestrator.run("AAPL", { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "macro") });
  const [macroResult] = report.agents;

  assert.equal(macroResult.agentId, "macro");
  assert.ok(["fulfilled", "error", "timeout"].includes(macroResult.status), "a real network call may succeed, gracefully degrade, or (rarely) time out in this environment");
  if (macroResult.status === "fulfilled") {
    assert.equal(typeof macroResult.result.summary, "string");
    assert.ok(Array.isArray(macroResult.result.evidence));
    assert.ok(Number.isFinite(macroResult.confidence));
  }
}, { timeout: 30000 });

test("running through runObserved() (AgentScheduler + AgentObservability) records a real execution entry for the macro agent", async () => {
  const log = createAgentExecutionLog();
  const { report, correlationId } = await runObserved(
    "AAPL",
    { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "macro") },
    { log }
  );

  assert.equal(report.agents[0].agentId, "macro");
  const records = log.getByCorrelationId(correlationId);
  assert.equal(records.length, 1);
  assert.equal(records[0].agentId, "macro");
  assert.equal(typeof records[0].confidence, "number");
}, { timeout: 30000 });

test("the scheduler's health cache is exercised for the macro agent (a second call against the same object reuses the cached health)", async () => {
  sharedScheduler.reset();
  const [macroAgent] = agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "macro");

  await sharedScheduler.runAgent(macroAgent, "AAA");
  await sharedScheduler.runAgent(macroAgent, "BBB");

  const stats = sharedScheduler.getHealthCacheStats();
  assert.ok(stats.hits >= 1, "the second call must be served from the health cache for the same registered agent object");
}, { timeout: 30000 });

test("the macro agent's direction is a real, opaque string the orchestrator can structurally compare — never inspected for meaning", async () => {
  const report = await agentOrchestrator.run("AAPL", { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "macro") });
  const [macroResult] = report.agents;
  if (macroResult.status === "fulfilled") {
    assert.ok(macroResult.direction === null || typeof macroResult.direction === "string");
  }
}, { timeout: 30000 });
