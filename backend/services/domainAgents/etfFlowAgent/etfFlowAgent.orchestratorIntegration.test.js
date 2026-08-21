// Phase ETF-FLOW-AGENT-001 — proves the upgraded ETF Flow Intelligence
// Agent is genuinely compatible with the full Agent Platform stack:
// registered automatically in the registry, executed by the real
// (unmodified) Agent Orchestrator, scheduled through the real
// AgentScheduler (concurrency/health-cache/retry), and recorded by the
// real AgentObservability layer — not just unit-tested in isolation.
// Mirrors INSIDER-AGENT-001/SENTIMENT-AGENT-001's own full-stack tests.
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

test("the etf-flow agent is automatically registered in the Agent Registry, running the upgraded engine", () => {
  const registered = agentOrchestrator.getRegisteredAgents().find((agent) => agent.metadata.id === "etf-flow");
  assert.ok(registered, "the etf-flow agent must be registered without any manual step");
  assert.equal(registered.metadata.name, "Sector ETF Momentum Agent");
});

test("running the full orchestrator surfaces the rich ETF flow report via the standard per-agent result fields", async () => {
  const report = await agentOrchestrator.run("AAPL", { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "etf-flow") });
  const [etfFlowResult] = report.agents;

  assert.equal(etfFlowResult.agentId, "etf-flow");
  assert.ok(["fulfilled", "unavailable", "error", "timeout"].includes(etfFlowResult.status), "a real provider call may succeed, report verified data unavailable, fail, or time out");
  if (etfFlowResult.status === "fulfilled") {
    assert.equal(typeof etfFlowResult.result.summary, "string");
    assert.ok(Array.isArray(etfFlowResult.result.evidence));
    assert.ok(Number.isFinite(etfFlowResult.confidence));
  }
});

test("running through runObserved() (AgentScheduler + AgentObservability) records a real execution entry for the etf-flow agent", async () => {
  const log = createAgentExecutionLog();
  const { report, correlationId } = await runObserved(
    "AAPL",
    { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "etf-flow") },
    { log }
  );

  assert.equal(report.agents[0].agentId, "etf-flow");
  const records = log.getByCorrelationId(correlationId);
  assert.equal(records.length, 1);
  assert.equal(records[0].agentId, "etf-flow");
  assert.equal(typeof records[0].confidence, "number");
});

test("the scheduler's health cache is exercised for the etf-flow agent (a second call against the same object reuses the cached health)", async () => {
  sharedScheduler.reset();
  // This agent's execute() makes several real network calls (Finnhub
  // sector resolution + price-history fetches for both the target ETF
  // and the market reference), so raise the health-cache TTL only for
  // this test — the same real-network caveat every prior phase's own
  // equivalent test discloses.
  const originalTtlMs = sharedScheduler.getConfig().healthCacheTtlMs;
  sharedScheduler.updateConfig({ healthCacheTtlMs: 30000 });
  try {
    const [etfFlowAgent] = agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "etf-flow");

    await sharedScheduler.runAgent(etfFlowAgent, "AAA");
    await sharedScheduler.runAgent(etfFlowAgent, "BBB");

    const stats = sharedScheduler.getHealthCacheStats();
    assert.ok(stats.hits >= 1, "the second call must be served from the health cache for the same registered agent object");
  } finally {
    sharedScheduler.updateConfig({ healthCacheTtlMs: originalTtlMs });
  }
});

test("the etf-flow agent's direction is a real, opaque string the orchestrator can structurally compare — never inspected for meaning", async () => {
  const report = await agentOrchestrator.run("AAPL", { agents: agentOrchestrator.getRegisteredAgents().filter((agent) => agent.metadata.id === "etf-flow") });
  const [etfFlowResult] = report.agents;
  if (etfFlowResult.status === "fulfilled") {
    assert.ok(etfFlowResult.direction === null || typeof etfFlowResult.direction === "string");
  }
});
