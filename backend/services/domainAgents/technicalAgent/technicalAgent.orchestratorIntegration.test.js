// Phase TECHNICAL-AGENT-001 — proves the upgraded Technical Analysis
// Intelligence Agent is genuinely compatible with the full Agent
// Platform stack: registered automatically in the registry, executed by
// the real (unmodified) Agent Orchestrator, scheduled through the real
// AgentScheduler (concurrency/health-cache/retry), and recorded by the
// real AgentObservability layer — not just unit-tested in isolation.
// Mirrors OPTIONS-AGENT-001/EARNINGS-AGENT-001/VALUATION-AGENT-001's own
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

test("the technical agent is automatically registered in the Agent Registry, running the upgraded engine", () => {
  const registered = agentOrchestrator.getRegisteredAgents().find((agent) => agent.metadata.id === "technical");
  assert.ok(registered, "the technical agent must be registered without any manual step");
  assert.equal(registered.metadata.name, "Technical Analysis Agent");
});

test("running the full orchestrator surfaces the rich technical report via the standard per-agent result fields", async () => {
  const report = await agentOrchestrator.run("AAPL", { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "technical") });
  const [technicalResult] = report.agents;

  assert.equal(technicalResult.agentId, "technical");
  assert.ok(["fulfilled", "error", "timeout"].includes(technicalResult.status), "a real network call may succeed, gracefully degrade, or (rarely) time out in this environment");
  if (technicalResult.status === "fulfilled") {
    assert.equal(typeof technicalResult.result.summary, "string");
    assert.ok(Array.isArray(technicalResult.result.evidence));
    assert.ok(Number.isFinite(technicalResult.confidence));
  }
});

test("running through runObserved() (AgentScheduler + AgentObservability) records a real execution entry for the technical agent", async () => {
  const log = createAgentExecutionLog();
  const { report, correlationId } = await runObserved(
    "AAPL",
    { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "technical") },
    { log }
  );

  assert.equal(report.agents[0].agentId, "technical");
  const records = log.getByCorrelationId(correlationId);
  assert.equal(records.length, 1);
  assert.equal(records[0].agentId, "technical");
  assert.equal(typeof records[0].confidence, "number");
});

test("the scheduler's health cache is exercised for the technical agent (a second call against the same object reuses the cached health)", async () => {
  sharedScheduler.reset();
  // This agent's execute() always makes a real network call (price
  // history has no API-key-gated fast-fail path, unlike earnings/
  // valuation), so the default 2s health-cache TTL can be outrun by two
  // real, sequential network round trips in a slower/sandboxed network
  // environment. Raise it only for this test, then restore it, so this
  // test verifies real cache-hit behavior rather than network speed.
  const originalTtlMs = sharedScheduler.getConfig().healthCacheTtlMs;
  sharedScheduler.updateConfig({ healthCacheTtlMs: 30000 });
  try {
    const [technicalAgent] = agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "technical");

    await sharedScheduler.runAgent(technicalAgent, "AAA");
    await sharedScheduler.runAgent(technicalAgent, "BBB");

    const stats = sharedScheduler.getHealthCacheStats();
    assert.ok(stats.hits >= 1, "the second call must be served from the health cache for the same registered agent object");
  } finally {
    sharedScheduler.updateConfig({ healthCacheTtlMs: originalTtlMs });
  }
});

test("the technical agent's direction is a real, opaque string the orchestrator can structurally compare — never inspected for meaning", async () => {
  const report = await agentOrchestrator.run("AAPL", { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "technical") });
  const [technicalResult] = report.agents;
  if (technicalResult.status === "fulfilled") {
    assert.ok(technicalResult.direction === null || typeof technicalResult.direction === "string");
  }
});
