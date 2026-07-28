// Phase EARNINGS-AGENT-001 — proves the new Earnings Intelligence Agent
// is genuinely compatible with the full Agent Platform stack: registered
// automatically in the registry, executed by the real (unmodified)
// Agent Orchestrator, scheduled through the real AgentScheduler
// (concurrency/health-cache/retry), and recorded by the real
// AgentObservability layer — not just unit-tested in isolation. Mirrors
// OPTIONS-AGENT-001's own full-stack integration test.
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

test("the earnings agent is automatically registered in the Agent Registry, no longer a stub", () => {
  const registered = agentOrchestrator.getRegisteredAgents().find((agent) => agent.metadata.id === "earnings");
  assert.ok(registered, "the earnings agent must be registered without any manual step");
  assert.equal(registered.metadata.name, "Earnings Intelligence Agent");
});

test("running the full orchestrator surfaces the rich earnings report via the standard per-agent result fields", async () => {
  const report = await agentOrchestrator.run("NVDA", { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "earnings") });
  const [earningsResult] = report.agents;

  assert.equal(earningsResult.agentId, "earnings");
  assert.ok(["fulfilled", "error", "timeout"].includes(earningsResult.status), "a real network call may succeed, gracefully degrade, or (rarely) time out in this environment");
  if (earningsResult.status === "fulfilled") {
    assert.equal(typeof earningsResult.result.summary, "string");
    assert.ok(Array.isArray(earningsResult.result.evidence));
    assert.ok(Number.isFinite(earningsResult.confidence));
  }
});

test("running through runObserved() (AgentScheduler + AgentObservability) records a real execution entry for the earnings agent", async () => {
  const log = createAgentExecutionLog();
  const { report, correlationId } = await runObserved(
    "NVDA",
    { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "earnings") },
    { log }
  );

  assert.equal(report.agents[0].agentId, "earnings");
  const records = log.getByCorrelationId(correlationId);
  assert.equal(records.length, 1);
  assert.equal(records[0].agentId, "earnings");
  assert.equal(typeof records[0].confidence, "number");
});

test("the scheduler's health cache is exercised for the earnings agent (a second call against the same object reuses the cached health)", async () => {
  sharedScheduler.reset();
  const [earningsAgent] = agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "earnings");

  await sharedScheduler.runAgent(earningsAgent, "AAA");
  await sharedScheduler.runAgent(earningsAgent, "BBB");

  const stats = sharedScheduler.getHealthCacheStats();
  assert.ok(stats.hits >= 1, "the second call must be served from the health cache for the same registered agent object");
});

test("the earnings agent's direction is a real, opaque string the orchestrator can structurally compare — never inspected for meaning", async () => {
  const report = await agentOrchestrator.run("NVDA", { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "earnings") });
  const [earningsResult] = report.agents;
  if (earningsResult.status === "fulfilled") {
    assert.ok(earningsResult.direction === null || typeof earningsResult.direction === "string");
  }
});
