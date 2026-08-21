// Phase OPTIONS-AGENT-001 — proves the upgraded Options Flow Domain
// Agent is genuinely compatible with the full Agent Platform stack:
// registered automatically in the registry, executed by the real
// (unmodified) Agent Orchestrator, scheduled through the real
// AgentScheduler (concurrency/health-cache/retry), and recorded by the
// real AgentObservability layer (execution log + metrics) — not just
// unit-tested in isolation.
require("../../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../../../test/dbHelpers");
const agentOrchestrator = require("../../agentOrchestrator/agentOrchestrator");
const { registerAllAgents } = require("../../agentOrchestrator/registry");
const { runObserved } = require("../../agentObservability/observableOrchestrator");
const { createAgentExecutionLog } = require("../../agentObservability/agentExecutionLog");
const { sharedScheduler } = require("../../agentScheduler/agentScheduler");

test.beforeEach(async () => {
  await truncateAll();
  agentOrchestrator.clearRegistry();
  registerAllAgents();
});

test("the options agent is automatically registered in the Agent Registry", () => {
  const registered = agentOrchestrator.getRegisteredAgents().find((agent) => agent.metadata.id === "options");
  assert.ok(registered, "the options agent must be registered without any manual step");
  assert.equal(registered.metadata.name, "Options Flow Agent");
});

test("running the full orchestrator (which now schedules through the real AgentScheduler) surfaces the rich report via the standard per-agent result fields", async () => {
  const report = await agentOrchestrator.run("NVDA", { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "options") });
  const [optionsResult] = report.agents;

  assert.equal(optionsResult.agentId, "options");
  assert.ok(["fulfilled", "unavailable"].includes(optionsResult.status), "the options agent must either return verified options data or explicitly report that the paid-grade feed is unavailable");
  assert.equal(typeof optionsResult.result.summary, "string");
  assert.ok(optionsResult.result.summary.length > 0);
  assert.deepEqual(optionsResult.result.evidence, []);
  assert.ok(Number.isFinite(optionsResult.confidence));
  assert.ok(["healthy", "degraded", "unavailable"].includes(optionsResult.health.status));
});

test("running through runObserved() (AgentScheduler + AgentObservability) records a real execution entry for the options agent", async () => {
  const log = createAgentExecutionLog();
  const { report, correlationId } = await runObserved(
    "NVDA",
    { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "options") },
    { log }
  );

  assert.equal(report.agents[0].agentId, "options");
  const records = log.getByCorrelationId(correlationId);
  assert.equal(records.length, 1);
  assert.equal(records[0].agentId, "options");
  assert.equal(typeof records[0].confidence, "number");
  assert.ok(["healthy", "degraded", "unavailable"].includes(records[0].healthStatus));
});

test("the scheduler's health cache is exercised for the options agent (a second call against the same object reuses the cached health)", async () => {
  sharedScheduler.reset();
  const [optionsAgent] = agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "options");

  await sharedScheduler.runAgent(optionsAgent, "AAA");
  await sharedScheduler.runAgent(optionsAgent, "BBB");

  const stats = sharedScheduler.getHealthCacheStats();
  assert.ok(stats.hits >= 1, "the second call must be served from the health cache for the same registered agent object");
});

test("the options agent's direction is a real, opaque string the orchestrator can structurally compare — never inspected for meaning", async () => {
  const report = await agentOrchestrator.run("NVDA", { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "options") });
  const [optionsResult] = report.agents;
  assert.ok(optionsResult.direction === null || typeof optionsResult.direction === "string");
});
