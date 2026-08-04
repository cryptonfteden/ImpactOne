const test = require("node:test");
const assert = require("node:assert/strict");
const { generateAiSummary } = require("./aiSummary");

function baseReport(overrides = {}) {
  return {
    symbol: "AAPL",
    dataAvailable: true,
    unavailableReason: null,
    newsBias: "NEUTRAL",
    newsScore: 0,
    importanceScore: 67,
    freshnessScore: 100,
    confirmationScore: 80,
    impactHorizon: "MEDIUM",
    affectedSectors: ["Technology"],
    bullishFactors: ["A"],
    bearishFactors: ["B"],
    risks: [],
    confidence: 62,
    ...overrides,
  };
}

test("generateAiSummary: is a plain string mentioning the real bias, score, and horizon", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /NEUTRAL/);
  assert.match(summary, /67/);
  assert.match(summary, /medium/);
});

test("generateAiSummary: names real affected sectors when present", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /Technology/);
});

test("generateAiSummary: honestly discloses no sector coverage when empty", () => {
  const summary = generateAiSummary(baseReport({ affectedSectors: [] }));
  assert.match(summary, /No specific sector coverage/);
});

test("generateAiSummary: mentions unavailability honestly, never fabricating a bias", () => {
  const summary = generateAiSummary(baseReport({ dataAvailable: false, unavailableReason: "no NEWS_API_KEY configured" }));
  assert.match(summary, /unavailable/);
  assert.match(summary, /no NEWS_API_KEY configured/);
});

test("generateAiSummary: never contains a forbidden governance keyword", () => {
  const summary = generateAiSummary(baseReport());
  for (const forbidden of ["action", "decision", "verdict", "finalDecision", "recommendation"]) {
    assert.ok(!summary.toLowerCase().includes(forbidden), `must not mention "${forbidden}"`);
  }
});
