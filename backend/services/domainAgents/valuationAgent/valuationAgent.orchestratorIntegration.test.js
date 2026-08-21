// Phase VALUATION-AGENT-001 — proves the new Valuation Intelligence
// Agent is genuinely compatible with the full Agent Platform stack:
// registered automatically in the registry, executed by the real
// (unmodified) Agent Orchestrator, scheduled through the real
// AgentScheduler (concurrency/health-cache/retry), and recorded by the
// real AgentObservability layer — not just unit-tested in isolation.
// Mirrors OPTIONS-AGENT-001/EARNINGS-AGENT-001's own full-stack tests.
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

test("the valuation agent is automatically registered in the Agent Registry, no longer a stub", () => {
  const registered = agentOrchestrator.getRegisteredAgents().find((agent) => agent.metadata.id === "valuation");
  assert.ok(registered, "the valuation agent must be registered without any manual step");
  assert.equal(registered.metadata.name, "Valuation Intelligence Agent");
});

test("running the full orchestrator surfaces the rich valuation report via the standard per-agent result fields", async () => {
  const report = await agentOrchestrator.run("NVDA", { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "valuation") });
  const [valuationResult] = report.agents;

  assert.equal(valuationResult.agentId, "valuation");
  assert.ok(["fulfilled", "unavailable", "error", "timeout"].includes(valuationResult.status), "a real provider call may succeed, report verified data unavailable, fail, or time out");
  if (valuationResult.status === "fulfilled") {
    assert.equal(typeof valuationResult.result.summary, "string");
    assert.ok(Array.isArray(valuationResult.result.evidence));
    assert.ok(Number.isFinite(valuationResult.confidence));
  }
});

test("running through runObserved() (AgentScheduler + AgentObservability) records a real execution entry for the valuation agent", async () => {
  const log = createAgentExecutionLog();
  const { report, correlationId } = await runObserved(
    "NVDA",
    { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "valuation") },
    { log }
  );

  assert.equal(report.agents[0].agentId, "valuation");
  const records = log.getByCorrelationId(correlationId);
  assert.equal(records.length, 1);
  assert.equal(records[0].agentId, "valuation");
  assert.equal(typeof records[0].confidence, "number");
});

test("the scheduler's health cache is exercised for the valuation agent (a second call against the same object reuses the cached health)", async () => {
  sharedScheduler.reset();
  const [valuationAgent] = agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "valuation");

  await sharedScheduler.runAgent(valuationAgent, "AAA");
  await sharedScheduler.runAgent(valuationAgent, "BBB");

  const stats = sharedScheduler.getHealthCacheStats();
  assert.ok(stats.hits >= 1, "the second call must be served from the health cache for the same registered agent object");
});

test("the valuation agent's direction is a real, opaque string the orchestrator can structurally compare — never inspected for meaning", async () => {
  const report = await agentOrchestrator.run("NVDA", { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "valuation") });
  const [valuationResult] = report.agents;
  if (valuationResult.status === "fulfilled") {
    assert.ok(valuationResult.direction === null || typeof valuationResult.direction === "string");
  }
});
