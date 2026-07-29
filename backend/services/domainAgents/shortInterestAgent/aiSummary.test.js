const test = require("node:test");
const assert = require("node:assert/strict");
const { generateAiSummary } = require("./aiSummary");

function baseReport(overrides = {}) {
  return {
    symbol: "TEST",
    dataAvailable: true,
    unavailableReason: null,
    shortInterestBias: "BULLISH",
    shortInterestScore: 40,
    shortInterestTrend: { trend: "DECREASING" },
    squeezeProbability: 70,
    crowdednessScore: 65,
    coveringActivity: { classification: "MODERATE" },
    confidence: { confidence: 60 },
    ...overrides,
  };
}

test("generateAiSummary: unavailable data produces an honest one-line explanation, not a fabricated analysis", () => {
  const summary = generateAiSummary({ symbol: "XYZ", dataAvailable: false, unavailableReason: "No real FINRA daily short-volume data could be found." });
  assert.match(summary, /unavailable for XYZ/);
  assert.match(summary, /No real FINRA daily short-volume data/);
});

test("generateAiSummary: mentions the real bias, score, and trend direction", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /BULLISH/);
  assert.match(summary, /40/);
  assert.match(summary, /decreasing/);
});

test("generateAiSummary: mentions the real squeeze probability and crowdedness score", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /70\/100/);
  assert.match(summary, /65\/100/);
});

test("generateAiSummary: mentions the real covering activity classification", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /moderate/);
});

test("generateAiSummary: always discloses the real borrow-stress unavailability", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /Borrow stress .* could not be assessed/);
});

test("generateAiSummary: mentions the real overall confidence score", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /60\/100/);
});
