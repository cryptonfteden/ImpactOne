const test = require("node:test");
const assert = require("node:assert/strict");
const { buildAiExecutiveSummary } = require("./aiExecutiveSummary");

function baseReport(overrides = {}) {
  return {
    symbol: "NVDA",
    overallIntelligence: "BULLISH",
    overallConfidence: 70,
    contributingAgentCount: 3,
    totalAgentCount: 3,
    agentContributions: [
      { agentId: "options", agentName: "Options Flow Agent" },
      { agentId: "earnings", agentName: "Earnings Intelligence Agent" },
      { agentId: "valuation", agentName: "Valuation Intelligence Agent" },
    ],
    keyDrivers: [{ agentId: "options", explanation: "options contributed a bullish signal at 80% confidence, weighted by its priority (7)." }],
    conflictingSignals: [],
    ...overrides,
  };
}

test("zero contributing agents => a single honest sentence, never a fabricated read", () => {
  const summary = buildAiExecutiveSummary(baseReport({ contributingAgentCount: 0, keyDrivers: [] }));
  assert.match(summary, /No real data was available/);
});

test("the summary names the real symbol, direction, and confidence", () => {
  const summary = buildAiExecutiveSummary(baseReport());
  assert.match(summary, /NVDA/);
  assert.match(summary, /bullish/);
  assert.match(summary, /70\/100/);
});

test("the summary names the real top key driver and its explanation", () => {
  const summary = buildAiExecutiveSummary(baseReport());
  assert.match(summary, /options agent contributed most/);
});

test("with no conflicts, the summary explicitly states none were found — never silent on this required explanation", () => {
  const summary = buildAiExecutiveSummary(baseReport({ conflictingSignals: [] }));
  assert.match(summary, /No conflicting signals were found/);
});

test("with real conflicts, the summary names the exact disagreeing agents and directions", () => {
  const summary = buildAiExecutiveSummary(
    baseReport({ conflictingSignals: [{ agentA: "options", directionA: "BULLISH", agentB: "valuation", directionB: "BEARISH" }] })
  );
  assert.match(summary, /options \(BULLISH\) vs\. valuation \(BEARISH\)/);
  assert.match(summary, /confidence was capped/);
});

test("the summary always explains how confidence was calculated, distinct from a naive average", () => {
  const summary = buildAiExecutiveSummary(baseReport());
  assert.match(summary, /priority-weighted average of only the agreeing agents/);
  assert.match(summary, /never a simple average/);
});

test("when agents are missing, the confidence explanation names the real count of unavailable agents", () => {
  const summary = buildAiExecutiveSummary(baseReport({ contributingAgentCount: 2 }));
  assert.match(summary, /1 of 3 agents could not produce usable data/);
});
