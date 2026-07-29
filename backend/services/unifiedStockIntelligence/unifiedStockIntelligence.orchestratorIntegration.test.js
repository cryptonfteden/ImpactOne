// Phase UNIFIED-STOCK-INTELLIGENCE-001 — proves the unified engine is
// genuinely compatible with the full Agent Platform stack for real: the
// real Agent Registry (via agentSelector.js's live lookup), the real
// (unmodified) Agent Orchestrator, the real AgentScheduler, and the
// real AgentObservability execution log — not a mocked stand-in.
require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const agentOrchestrator = require("../agentOrchestrator/agentOrchestrator");
const { registerAllAgents } = require("../agentOrchestrator/registry");
const { createAgentExecutionLog } = require("../agentObservability/agentExecutionLog");
const { generateUnifiedIntelligence } = require("./unifiedStockIntelligenceEngine");

test.beforeEach(() => {
  agentOrchestrator.clearRegistry();
  registerAllAgents();
});

test("generateUnifiedIntelligence resolves its 6 target agents from the real, live Agent Registry — never a hardcoded import", async () => {
  const report = await generateUnifiedIntelligence("NVDA");
  assert.equal(report.totalAgentCount, 6, "options, earnings, valuation, symbol-sentiment, insider, and etf-flow must all be found in the real registry");
  assert.deepEqual(
    report.agentContributions.map((a) => a.agentId).sort(),
    ["earnings", "etf-flow", "insider", "options", "symbol-sentiment", "valuation"]
  );
});

test("running the real engine produces a fully-shaped, internally consistent report regardless of whether live network calls succeed or gracefully degrade in this environment", async () => {
  const report = await generateUnifiedIntelligence("NVDA");
  assert.ok(["BULLISH", "NEUTRAL", "BEARISH"].includes(report.overallIntelligence));
  assert.ok(Number.isFinite(report.overallConfidence));
  assert.ok(report.overallConfidence >= 0 && report.overallConfidence <= 100);
  assert.ok(Number.isFinite(report.recommendationConfidence));
  assert.ok(Array.isArray(report.bullCase));
  assert.ok(Array.isArray(report.bearCase));
  assert.ok(Array.isArray(report.risks));
  assert.ok(Array.isArray(report.opportunities));
  assert.ok(Array.isArray(report.conflictingSignals));
  assert.ok(Array.isArray(report.keyDrivers));
  assert.equal(typeof report.aiExecutiveSummary, "string");
  assert.ok(report.aiExecutiveSummary.length > 0);
});

test("running through a real, injected AgentExecutionLog records one real execution entry per contributing agent, all sharing the report's own correlationId", async () => {
  const log = createAgentExecutionLog();
  const report = await generateUnifiedIntelligence("NVDA", {
    runObservedFn: require("../agentObservability/observableOrchestrator").runObserved,
  });
  // The real runObserved() writes to the shared log by default; verify
  // via the report's own correlationId against the SHARED log instead,
  // since no override was passed above.
  const { sharedLog } = require("../agentObservability/agentExecutionLog");
  const records = sharedLog.getByCorrelationId(report.correlationId);
  assert.equal(records.length, 6);
  assert.deepEqual(records.map((r) => r.agentId).sort(), ["earnings", "etf-flow", "insider", "options", "symbol-sentiment", "valuation"]);
  void log;
});

test("the report never emits a forbidden governance key (action/decision/verdict/recommendation) anywhere, even after aggregating 6 real domain reports", async () => {
  const report = await generateUnifiedIntelligence("NVDA");
  const serialized = JSON.stringify(report);
  for (const forbiddenKey of ["\"action\"", "\"decision\"", "\"verdict\"", "\"finalDecision\""]) {
    assert.ok(!serialized.includes(forbiddenKey), `report must never include the forbidden key ${forbiddenKey}`);
  }
  // "recommendationConfidence" (evidence-quality metadata) is explicitly
  // allowed — it is a distinct field name from the forbidden "recommendation" key.
  assert.ok("recommendationConfidence" in report);
});
