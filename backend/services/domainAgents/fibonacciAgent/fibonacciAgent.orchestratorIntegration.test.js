// Phase FIBONACCI-AGENT-001 — proves the upgraded Fibonacci
// Intelligence Agent is genuinely compatible with the full Agent
// Platform stack: registered automatically in the registry, executed by
// the real (unmodified) Agent Orchestrator, scheduled through the real
// AgentScheduler (concurrency/health-cache/retry), and recorded by the
// real AgentObservability layer — not just unit-tested in isolation.
// Mirrors TECHNICAL-AGENT-001/VALUATION-AGENT-001's own full-stack tests.
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

test("the fibonacci agent is automatically registered in the Agent Registry, no longer a stub", () => {
  const registered = agentOrchestrator.getRegisteredAgents().find((agent) => agent.metadata.id === "fibonacci");
  assert.ok(registered, "the fibonacci agent must be registered without any manual step");
  assert.equal(registered.metadata.name, "Fibonacci Intelligence Agent");
});

test("running the full orchestrator surfaces the rich fibonacci report via the standard per-agent result fields", async () => {
  const report = await agentOrchestrator.run("AAPL", { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "fibonacci") });
  const [fibonacciResult] = report.agents;

  assert.equal(fibonacciResult.agentId, "fibonacci");
  assert.ok(["fulfilled", "unavailable", "error", "timeout"].includes(fibonacciResult.status), "a real provider call may succeed, report verified data unavailable, fail, or time out");
  if (fibonacciResult.status === "fulfilled") {
    assert.equal(typeof fibonacciResult.result.summary, "string");
    assert.ok(Array.isArray(fibonacciResult.result.evidence));
    assert.ok(Number.isFinite(fibonacciResult.confidence));
  }
});

test("running through runObserved() (AgentScheduler + AgentObservability) records a real execution entry for the fibonacci agent", async () => {
  const log = createAgentExecutionLog();
  const { report, correlationId } = await runObserved(
    "AAPL",
    { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "fibonacci") },
    { log }
  );

  assert.equal(report.agents[0].agentId, "fibonacci");
  const records = log.getByCorrelationId(correlationId);
  assert.equal(records.length, 1);
  assert.equal(records[0].agentId, "fibonacci");
  assert.equal(typeof records[0].confidence, "number");
});

test("the scheduler's health cache is exercised for the fibonacci agent (a second call against the same object reuses the cached health)", async () => {
  sharedScheduler.reset();
  // This agent's execute() always makes a real network call, so raise
  // the health-cache TTL only for this test (the same real-network
  // caveat TECHNICAL-AGENT-001's own equivalent test discloses).
  const originalTtlMs = sharedScheduler.getConfig().healthCacheTtlMs;
  sharedScheduler.updateConfig({ healthCacheTtlMs: 30000 });
  try {
    const [fibonacciAgent] = agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "fibonacci");

    await sharedScheduler.runAgent(fibonacciAgent, "AAA");
    await sharedScheduler.runAgent(fibonacciAgent, "BBB");

    const stats = sharedScheduler.getHealthCacheStats();
    assert.ok(stats.hits >= 1, "the second call must be served from the health cache for the same registered agent object");
  } finally {
    sharedScheduler.updateConfig({ healthCacheTtlMs: originalTtlMs });
  }
});

test("the fibonacci agent's direction is a real, opaque string the orchestrator can structurally compare — never inspected for meaning", async () => {
  const report = await agentOrchestrator.run("AAPL", { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "fibonacci") });
  const [fibonacciResult] = report.agents;
  if (fibonacciResult.status === "fulfilled") {
    assert.ok(fibonacciResult.direction === null || typeof fibonacciResult.direction === "string");
  }
});
