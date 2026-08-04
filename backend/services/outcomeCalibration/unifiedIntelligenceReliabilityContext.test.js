const test = require("node:test");
const assert = require("node:assert/strict");
const { attachAgentReliabilityContext } = require("./unifiedIntelligenceReliabilityContext");

function fakeUnifiedReport() {
  return {
    symbol: "AAPL",
    overallIntelligence: "BULLISH",
    overallConfidence: 70,
    agentContributions: [
      { agentId: "macro", direction: "BULLISH", confidence: 80 },
      { agentId: "valuation", direction: "NEUTRAL", confidence: 50 },
    ],
  };
}

test("attachAgentReliabilityContext: returns a new object with every existing field unchanged", async () => {
  const report = fakeUnifiedReport();
  const fakeHistoryFn = async (agentId) => ({ agentId, accuracy: { accuracyRate: 90 } });

  const enriched = await attachAgentReliabilityContext(report, { getAgentReliabilityHistoryFn: fakeHistoryFn });

  assert.equal(enriched.symbol, report.symbol);
  assert.equal(enriched.overallIntelligence, report.overallIntelligence);
  assert.equal(enriched.overallConfidence, report.overallConfidence);
  assert.deepEqual(enriched.agentContributions, report.agentContributions);
});

test("attachAgentReliabilityContext: never mutates the original report object", async () => {
  const report = fakeUnifiedReport();
  const original = JSON.parse(JSON.stringify(report));
  const fakeHistoryFn = async (agentId) => ({ agentId });

  await attachAgentReliabilityContext(report, { getAgentReliabilityHistoryFn: fakeHistoryFn });

  assert.deepEqual(report, original);
});

test("attachAgentReliabilityContext: attaches one real reliability history entry per contributing agent", async () => {
  const report = fakeUnifiedReport();
  const calls = [];
  const fakeHistoryFn = async (agentId) => {
    calls.push(agentId);
    return { agentId, accuracy: { accuracyRate: agentId === "macro" ? 90 : 40 } };
  };

  const enriched = await attachAgentReliabilityContext(report, { getAgentReliabilityHistoryFn: fakeHistoryFn });

  assert.deepEqual(calls.sort(), ["macro", "valuation"]);
  assert.equal(enriched.agentReliabilityContext.macro.accuracy.accuracyRate, 90);
  assert.equal(enriched.agentReliabilityContext.valuation.accuracy.accuracyRate, 40);
});

test("attachAgentReliabilityContext: honestly produces an empty context object for a report with zero contributing agents", async () => {
  const report = { symbol: "AAPL", agentContributions: [] };
  const enriched = await attachAgentReliabilityContext(report, { getAgentReliabilityHistoryFn: async () => ({}) });
  assert.deepEqual(enriched.agentReliabilityContext, {});
});
