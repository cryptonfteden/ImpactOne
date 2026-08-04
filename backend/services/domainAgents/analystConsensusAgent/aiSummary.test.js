const test = require("node:test");
const assert = require("node:assert/strict");
const { generateAiSummary } = require("./aiSummary");

function baseReport(overrides = {}) {
  return {
    symbol: "AAPL",
    dataAvailable: true,
    unavailableReason: null,
    analystBias: "BULLISH",
    consensusScore: 44,
    revisionScore: -1,
    targetScore: null,
    targetDispersion: null,
    coverageQuality: "HIGH",
    totalAnalysts: 54,
    convictionScore: 24,
    ratingTrend: "STABLE",
    risks: ["A"],
    opportunities: ["B"],
    confidence: 60,
    ...overrides,
  };
}

test("generateAiSummary: is a plain string mentioning the real bias, score, and coverage", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /BULLISH/);
  assert.match(summary, /44/);
  assert.match(summary, /54/);
});

test("generateAiSummary: discloses when real price targets are unavailable", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /Price targets are unavailable/);
});

test("generateAiSummary: mentions unavailability honestly, never fabricating a bias", () => {
  const summary = generateAiSummary(baseReport({ dataAvailable: false, unavailableReason: "no real key configured" }));
  assert.match(summary, /unavailable/);
  assert.match(summary, /no real key configured/);
});

test("generateAiSummary: never contains a forbidden governance keyword", () => {
  const summary = generateAiSummary(baseReport());
  for (const forbidden of ["action", "decision", "verdict", "finalDecision", "recommendation"]) {
    assert.ok(!summary.toLowerCase().includes(forbidden), `must not mention "${forbidden}"`);
  }
});
