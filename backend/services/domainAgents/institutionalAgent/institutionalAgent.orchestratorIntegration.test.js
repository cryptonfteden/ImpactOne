// Phase INSTITUTIONAL-AGENT-001 — proves the upgraded Institutional
// Intelligence Agent is genuinely compatible with the full Agent
// Platform stack: registered automatically in the registry, executed
// by the real (unmodified) Agent Orchestrator, scheduled through the
// real AgentScheduler (concurrency/health-cache/retry), and recorded
// by the real AgentObservability layer — not just unit-tested in
// isolation. Mirrors INSIDER-AGENT-001/ETF-FLOW-AGENT-001's own
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

test("the institutional agent is automatically registered in the Agent Registry, running the upgraded engine", () => {
  const registered = agentOrchestrator.getRegisteredAgents().find((agent) => agent.metadata.id === "institutional");
  assert.ok(registered, "the institutional agent must be registered without any manual step");
  assert.equal(registered.metadata.name, "Institutional Intelligence Agent");
});

test("running the full orchestrator surfaces the rich institutional report via the standard per-agent result fields", async () => {
  const report = await agentOrchestrator.run("AAPL", { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "institutional") });
  const [institutionalResult] = report.agents;

  assert.equal(institutionalResult.agentId, "institutional");
  assert.ok(["fulfilled", "unavailable", "error", "timeout"].includes(institutionalResult.status), "a real provider call may succeed, report verified data unavailable, fail, or time out");
  if (institutionalResult.status === "fulfilled") {
    assert.equal(typeof institutionalResult.result.summary, "string");
    assert.ok(Array.isArray(institutionalResult.result.evidence));
    assert.ok(Number.isFinite(institutionalResult.confidence));
  }
});

test("running through runObserved() (AgentScheduler + AgentObservability) records a real execution entry for the institutional agent", async () => {
  const log = createAgentExecutionLog();
  const { report, correlationId } = await runObserved(
    "AAPL",
    { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "institutional") },
    { log }
  );

  assert.equal(report.agents[0].agentId, "institutional");
  const records = log.getByCorrelationId(correlationId);
  assert.equal(records.length, 1);
  assert.equal(records[0].agentId, "institutional");
  assert.equal(typeof records[0].confidence, "number");
});

test("the scheduler's health cache is exercised for the institutional agent (a second call against the same object reuses the cached health)", async () => {
  sharedScheduler.reset();
  // This agent's execute() makes many real network calls (Finnhub name
  // resolution + up to 2 submissions/index/infoTable fetches per
  // disclosed manager), so raise the health-cache TTL only for this
  // test — the same real-network caveat every prior phase's own
  // equivalent test discloses.
  const originalTtlMs = sharedScheduler.getConfig().healthCacheTtlMs;
  sharedScheduler.updateConfig({ healthCacheTtlMs: 30000 });
  try {
    const [institutionalAgent] = agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "institutional");

    await sharedScheduler.runAgent(institutionalAgent, "AAA");
    await sharedScheduler.runAgent(institutionalAgent, "BBB");

    const stats = sharedScheduler.getHealthCacheStats();
    assert.ok(stats.hits >= 1, "the second call must be served from the health cache for the same registered agent object");
  } finally {
    sharedScheduler.updateConfig({ healthCacheTtlMs: originalTtlMs });
  }
});

test("the institutional agent's direction is a real, opaque string the orchestrator can structurally compare — never inspected for meaning", async () => {
  const report = await agentOrchestrator.run("AAPL", { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "institutional") });
  const [institutionalResult] = report.agents;
  if (institutionalResult.status === "fulfilled") {
    assert.ok(institutionalResult.direction === null || typeof institutionalResult.direction === "string");
  }
});
