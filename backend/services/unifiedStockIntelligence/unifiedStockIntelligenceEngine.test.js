const test = require("node:test");
const assert = require("node:assert/strict");
const { generateUnifiedIntelligence } = require("./unifiedStockIntelligenceEngine");

function fakeAgentResult({ agentId, agentName, status = "fulfilled", confidence = 0, priority = 7, raw = null, summary = null, error = null }) {
  return {
    agentId,
    agentName,
    status,
    confidence,
    priority,
    error,
    result: status === "fulfilled" ? { summary: summary ?? "summary", direction: null, evidence: [], raw } : null,
  };
}

function fakeOrchestrator(agentResults) {
  return { getRegisteredAgents: () => agentResults.map((r) => ({ metadata: { id: r.agentId, name: r.agentName, priority: r.priority } })) };
}

function fakeRunObserved(orchestratorReport) {
  return async (symbol, options, extras) => ({ report: orchestratorReport, correlationId: extras?.correlationId || "corr_test" });
}

test("all three agents unavailable => the full honest-empty report, never fabricated", async () => {
  const agents = [
    fakeAgentResult({ agentId: "options", agentName: "Options Flow Agent", status: "error", error: "boom" }),
    fakeAgentResult({ agentId: "earnings", agentName: "Earnings Intelligence Agent", status: "timeout" }),
    fakeAgentResult({ agentId: "valuation", agentName: "Valuation Intelligence Agent", raw: { dataAvailable: false, unavailableReason: "no key" } }),
  ];
  const orchestratorReport = { symbol: "NVDA", generatedAt: new Date().toISOString(), agents };
  const report = await generateUnifiedIntelligence("NVDA", {
    orchestrator: fakeOrchestrator(agents),
    runObservedFn: fakeRunObserved(orchestratorReport),
  });

  assert.equal(report.contributingAgentCount, 0);
  assert.equal(report.overallIntelligence, "NEUTRAL");
  assert.equal(report.overallConfidence, 0);
  assert.equal(report.recommendationConfidence, 0);
  assert.deepEqual(report.bullCase, []);
  assert.deepEqual(report.bearCase, []);
  assert.equal(report.risks.length, 3, "each unavailable agent contributes its own real unavailability reason as a risk");
  assert.match(report.aiExecutiveSummary, /No real data was available/);
});

test("all three agents agree BULLISH => a real, well-corroborated BULLISH report with zero conflicts", async () => {
  const agents = [
    fakeAgentResult({ agentId: "options", agentName: "Options Flow Agent", confidence: 80, raw: { dataAvailable: true, marketBias: "BULLISH", riskSummary: { notes: [] }, signals: { institutionalActivity: { detected: false } } }, summary: "options bullish" }),
    fakeAgentResult({ agentId: "earnings", agentName: "Earnings Intelligence Agent", confidence: 75, raw: { dataAvailable: true, forwardOutlook: "POSITIVE", risks: [], opportunities: ["strong growth"] }, summary: "earnings bullish" }),
    fakeAgentResult({ agentId: "valuation", agentName: "Valuation Intelligence Agent", confidence: 65, raw: { dataAvailable: true, valuationStatus: "UNDERVALUED", excludedMethods: [], attractiveRangeCaveat: null, attractiveRange: true, highMarginOfSafety: false, discountToFairValue: 0.15 }, summary: "valuation bullish" }),
  ];
  const orchestratorReport = { symbol: "NVDA", generatedAt: new Date().toISOString(), agents };
  const report = await generateUnifiedIntelligence("NVDA", { orchestrator: fakeOrchestrator(agents), runObservedFn: fakeRunObserved(orchestratorReport) });

  assert.equal(report.contributingAgentCount, 3);
  assert.equal(report.overallIntelligence, "BULLISH");
  assert.ok(report.overallConfidence > 0);
  assert.deepEqual(report.conflictingSignals, []);
  assert.equal(report.bullCase.length, 3);
  assert.equal(report.bearCase.length, 0);
  assert.equal(report.keyDrivers.length, 3);
  assert.match(report.aiExecutiveSummary, /bullish/);
});

test("a real conflict (valuation bearish vs. the other two bullish) is surfaced explicitly and lowers confidence", async () => {
  const agents = [
    fakeAgentResult({ agentId: "options", agentName: "Options Flow Agent", confidence: 80, raw: { dataAvailable: true, marketBias: "BULLISH", riskSummary: { notes: [] }, signals: { institutionalActivity: { detected: false } } } }),
    fakeAgentResult({ agentId: "earnings", agentName: "Earnings Intelligence Agent", confidence: 75, raw: { dataAvailable: true, forwardOutlook: "POSITIVE", risks: [], opportunities: [] } }),
    fakeAgentResult({ agentId: "valuation", agentName: "Valuation Intelligence Agent", confidence: 70, raw: { dataAvailable: true, valuationStatus: "OVERVALUED", excludedMethods: [], attractiveRangeCaveat: null, attractiveRange: false, highMarginOfSafety: false, discountToFairValue: -0.2 } }),
  ];
  const orchestratorReport = { symbol: "NVDA", generatedAt: new Date().toISOString(), agents };
  const report = await generateUnifiedIntelligence("NVDA", { orchestrator: fakeOrchestrator(agents), runObservedFn: fakeRunObserved(orchestratorReport) });

  assert.ok(report.conflictingSignals.length > 0);
  assert.ok(report.conflictingSignals.some((c) => [c.agentA, c.agentB].includes("valuation")));
  assert.equal(report.bearCase.length, 1);
  assert.equal(report.bearCase[0].agentId, "valuation");
});

test("every conclusion is traceable — agentContributions preserves the full normalized per-agent view, and inputs preserves the raw orchestrator report", async () => {
  const agents = [fakeAgentResult({ agentId: "options", agentName: "Options Flow Agent", confidence: 80, raw: { dataAvailable: true, marketBias: "BULLISH", riskSummary: { notes: [] }, signals: { institutionalActivity: { detected: false } } } })];
  const orchestratorReport = { symbol: "NVDA", generatedAt: new Date().toISOString(), agents };
  const report = await generateUnifiedIntelligence("NVDA", { orchestrator: fakeOrchestrator(agents), runObservedFn: fakeRunObserved(orchestratorReport) });

  assert.equal(report.agentContributions.length, 1);
  assert.equal(report.agentContributions[0].agentId, "options");
  assert.ok(report.inputs);
  assert.equal(report.inputs.symbol, "NVDA");
});

test("correlationId flows through from runObserved into the final report", async () => {
  const agents = [];
  const orchestratorReport = { symbol: "NVDA", generatedAt: new Date().toISOString(), agents };
  const report = await generateUnifiedIntelligence("NVDA", {
    orchestrator: fakeOrchestrator(agents),
    runObservedFn: async () => ({ report: orchestratorReport, correlationId: "corr_specific_test_id" }),
  });
  assert.equal(report.correlationId, "corr_specific_test_id");
});
