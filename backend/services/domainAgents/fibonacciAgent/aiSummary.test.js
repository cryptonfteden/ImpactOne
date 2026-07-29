const test = require("node:test");
const assert = require("node:assert/strict");
const { generateAiSummary } = require("./aiSummary");

function baseReport(overrides = {}) {
  return {
    symbol: "TEST",
    dataAvailable: true,
    unavailableReason: null,
    trendContext: "BULLISH",
    primarySwing: { direction: "UP", swingLow: 50, swingHigh: 100 },
    highProbabilityZones: [{ centerPrice: 80, confluenceScore: 3, sources: ["Fibonacci 0.5 retracement", "recent pivot high", "60-day range high"] }],
    entryZone: { centerPrice: 80 },
    riskZone: { centerPrice: 70 },
    confidence: { confidence: 72 },
    ...overrides,
  };
}

test("generateAiSummary: unavailable data produces an honest one-line explanation, not a fabricated analysis", () => {
  const summary = generateAiSummary({ symbol: "XYZ", dataAvailable: false, unavailableReason: "Fewer than 20 real daily bars available." });
  assert.match(summary, /unavailable for XYZ/);
  assert.match(summary, /Fewer than 20 real daily bars/);
});

test("generateAiSummary: mentions the real trend context and real primary swing range", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /bullish/i);
  assert.match(summary, /50\.00/);
  assert.match(summary, /100\.00/);
});

test("generateAiSummary: honestly reports when no primary swing was detected", () => {
  const summary = generateAiSummary(baseReport({ primarySwing: null }));
  assert.match(summary, /no clear primary swing/);
});

test("generateAiSummary: mentions the real strongest confluence zone and its real sources", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /80\.00/);
  assert.match(summary, /3 independent sources/);
});

test("generateAiSummary: honestly reports when no real confluence zone was found", () => {
  const summary = generateAiSummary(baseReport({ highProbabilityZones: [] }));
  assert.match(summary, /No real multi-source confluence zone/);
});

test("generateAiSummary: mentions the real entry and risk zone prices", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /Entry zone near 80\.00/);
  assert.match(summary, /risk zone near 70\.00/);
});

test("generateAiSummary: omits the entry/risk clause entirely when neither is available, never inventing one", () => {
  const summary = generateAiSummary(baseReport({ entryZone: null, riskZone: null }));
  assert.doesNotMatch(summary, /Entry zone/);
});

test("generateAiSummary: mentions the real overall confidence score", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /72\/100/);
});
