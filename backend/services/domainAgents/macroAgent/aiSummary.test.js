const test = require("node:test");
const assert = require("node:assert/strict");
const { generateAiSummary } = require("./aiSummary");

function baseReport(overrides = {}) {
  return {
    dataAvailable: true,
    unavailableReason: null,
    macroBias: "BULLISH",
    macroScore: 35,
    economicCycle: "EXPANSION",
    liquidityScore: 77,
    inflationPressure: "MODERATE",
    recessionRisk: "LOW",
    policyDirection: "EASING",
    marketStress: "ELEVATED",
    employmentTrend: "WORSENING",
    confidence: 100,
    bullishFactors: ["A"],
    bearishFactors: ["B"],
    risks: [],
    ...overrides,
  };
}

test("generateAiSummary: is a plain string mentioning the real bias, score, and cycle", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /BULLISH/);
  assert.match(summary, /35/);
  assert.match(summary, /expansion/);
});

test("generateAiSummary: mentions unavailability honestly, never fabricating a bias", () => {
  const summary = generateAiSummary(baseReport({ dataAvailable: false, unavailableReason: "no real sources reachable" }));
  assert.match(summary, /unavailable/);
  assert.match(summary, /no real sources reachable/);
});

test("generateAiSummary: never contains a forbidden governance keyword", () => {
  const summary = generateAiSummary(baseReport());
  for (const forbidden of ["action", "decision", "verdict", "finalDecision", "recommendation"]) {
    assert.ok(!summary.toLowerCase().includes(forbidden), `must not mention "${forbidden}"`);
  }
});
