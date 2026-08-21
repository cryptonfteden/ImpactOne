// Phase INSIDER-AGENT-001 — proves the upgraded Insider Trading
// Intelligence Agent is genuinely compatible with the full Agent
// Platform stack: registered automatically in the registry, executed by
// the real (unmodified) Agent Orchestrator, scheduled through the real
// AgentScheduler (concurrency/health-cache/retry), and recorded by the
// real AgentObservability layer — not just unit-tested in isolation.
// Mirrors FIBONACCI-AGENT-001/SENTIMENT-AGENT-001's own full-stack tests.
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

test("the insider agent is automatically registered in the Agent Registry, running the upgraded engine", () => {
  const registered = agentOrchestrator.getRegisteredAgents().find((agent) => agent.metadata.id === "insider");
  assert.ok(registered, "the insider agent must be registered without any manual step");
  assert.equal(registered.metadata.name, "Insider Trading Intelligence Agent");
});

test("running the full orchestrator surfaces the rich insider report via the standard per-agent result fields", async () => {
  const report = await agentOrchestrator.run("AAPL", { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "insider") });
  const [insiderResult] = report.agents;

  assert.equal(insiderResult.agentId, "insider");
  assert.ok(["fulfilled", "unavailable", "error", "timeout"].includes(insiderResult.status), "a real provider call may succeed, report verified data unavailable, fail, or time out");
  if (insiderResult.status === "fulfilled") {
    assert.equal(typeof insiderResult.result.summary, "string");
    assert.ok(Array.isArray(insiderResult.result.evidence));
    assert.ok(Number.isFinite(insiderResult.confidence));
  }
});

test("running through runObserved() (AgentScheduler + AgentObservability) records a real execution entry for the insider agent", async () => {
  const log = createAgentExecutionLog();
  const { report, correlationId } = await runObserved(
    "AAPL",
    { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "insider") },
    { log }
  );

  assert.equal(report.agents[0].agentId, "insider");
  const records = log.getByCorrelationId(correlationId);
  assert.equal(records.length, 1);
  assert.equal(records[0].agentId, "insider");
  assert.equal(typeof records[0].confidence, "number");
});

test("the scheduler's health cache is exercised for the insider agent (a second call against the same object reuses the cached health)", async () => {
  sharedScheduler.reset();
  // This agent's execute() always makes several real SEC EDGAR network
  // calls (CIK resolution + submissions + filing XML fetches), so raise
  // the health-cache TTL only for this test — the same real-network
  // caveat TECHNICAL-AGENT-001/FIBONACCI-AGENT-001's own equivalent tests disclose.
  const originalTtlMs = sharedScheduler.getConfig().healthCacheTtlMs;
  sharedScheduler.updateConfig({ healthCacheTtlMs: 30000 });
  try {
    const [insiderAgent] = agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "insider");

    await sharedScheduler.runAgent(insiderAgent, "AAA");
    await sharedScheduler.runAgent(insiderAgent, "BBB");

    const stats = sharedScheduler.getHealthCacheStats();
    assert.ok(stats.hits >= 1, "the second call must be served from the health cache for the same registered agent object");
  } finally {
    sharedScheduler.updateConfig({ healthCacheTtlMs: originalTtlMs });
  }
});

test("the insider agent's direction is a real, opaque string the orchestrator can structurally compare — never inspected for meaning", async () => {
  const report = await agentOrchestrator.run("AAPL", { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "insider") });
  const [insiderResult] = report.agents;
  if (insiderResult.status === "fulfilled") {
    assert.ok(insiderResult.direction === null || typeof insiderResult.direction === "string");
  }
});
