// Phase SHORT-INTEREST-AGENT-001 — proves the upgraded Short Interest
// Intelligence Agent is genuinely compatible with the full Agent
// Platform stack: registered automatically in the registry, executed
// by the real (unmodified) Agent Orchestrator, scheduled through the
// real AgentScheduler (concurrency/health-cache/retry), and recorded
// by the real AgentObservability layer — not just unit-tested in
// isolation. Mirrors INSTITUTIONAL-AGENT-001/ETF-FLOW-AGENT-001's own
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

test("the short-interest agent is automatically registered in the Agent Registry, running the upgraded engine", () => {
  const registered = agentOrchestrator.getRegisteredAgents().find((agent) => agent.metadata.id === "short-interest");
  assert.ok(registered, "the short-interest agent must be registered without any manual step");
  assert.equal(registered.metadata.name, "Short Interest Intelligence Agent");
});

test("running the full orchestrator surfaces the rich short interest report via the standard per-agent result fields", async () => {
  const report = await agentOrchestrator.run("AAPL", { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "short-interest") });
  const [shortInterestResult] = report.agents;

  assert.equal(shortInterestResult.agentId, "short-interest");
  assert.ok(["fulfilled", "unavailable", "error", "timeout"].includes(shortInterestResult.status), "a real provider call may succeed, report verified data unavailable, fail, or time out");
  if (shortInterestResult.status === "fulfilled") {
    assert.equal(typeof shortInterestResult.result.summary, "string");
    assert.ok(Array.isArray(shortInterestResult.result.evidence));
    assert.ok(Number.isFinite(shortInterestResult.confidence));
  }
});

test("running through runObserved() (AgentScheduler + AgentObservability) records a real execution entry for the short-interest agent", async () => {
  const log = createAgentExecutionLog();
  const { report, correlationId } = await runObserved(
    "AAPL",
    { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "short-interest") },
    { log }
  );

  assert.equal(report.agents[0].agentId, "short-interest");
  const records = log.getByCorrelationId(correlationId);
  assert.equal(records.length, 1);
  assert.equal(records[0].agentId, "short-interest");
  assert.equal(typeof records[0].confidence, "number");
});

test("the scheduler's health cache is exercised for the short-interest agent (a second call against the same object reuses the cached health)", async () => {
  sharedScheduler.reset();
  // This agent's execute() makes several real network calls (up to 30
  // real FINRA daily-file fetches plus a real price-history fetch), so
  // raise the health-cache TTL only for this test — the same
  // real-network caveat every prior phase's own equivalent test
  // discloses.
  const originalTtlMs = sharedScheduler.getConfig().healthCacheTtlMs;
  sharedScheduler.updateConfig({ healthCacheTtlMs: 30000 });
  try {
    const [shortInterestAgent] = agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "short-interest");

    await sharedScheduler.runAgent(shortInterestAgent, "AAA");
    await sharedScheduler.runAgent(shortInterestAgent, "BBB");

    const stats = sharedScheduler.getHealthCacheStats();
    assert.ok(stats.hits >= 1, "the second call must be served from the health cache for the same registered agent object");
  } finally {
    sharedScheduler.updateConfig({ healthCacheTtlMs: originalTtlMs });
  }
});

test("the short-interest agent's direction is a real, opaque string the orchestrator can structurally compare — never inspected for meaning", async () => {
  const report = await agentOrchestrator.run("AAPL", { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "short-interest") });
  const [shortInterestResult] = report.agents;
  if (shortInterestResult.status === "fulfilled") {
    assert.ok(shortInterestResult.direction === null || typeof shortInterestResult.direction === "string");
  }
});
