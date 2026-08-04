const test = require("node:test");
const assert = require("node:assert/strict");
const { generateAiSummary } = require("./aiSummary");

function baseReport(overrides = {}) {
  return {
    symbol: "AAPL",
    dataAvailable: true,
    unavailableReason: null,
    targetEtf: "XLK",
    isDirectEtf: false,
    sector: "Technology",
    etfFlowBias: "BULLISH",
    netFlowScore: 60,
    flowStrength: { classification: "HIGH", strengthRatio: 1.8 },
    flowPersistence: { classification: "HIGH", persistenceRatio: 0.8, dominantDirection: "INFLOW" },
    sectorRotation: { classification: "ROTATING_IN", relativeStrengthPercent: 5 },
    passiveFlowImpact: { classification: "PASSIVE", direction: "INFLOW", magnitudeTier: "HIGH" },
    confidence: { confidence: 70 },
    ...overrides,
  };
}

test("generateAiSummary: unavailable data produces an honest one-line explanation, not a fabricated analysis", () => {
  const summary = generateAiSummary({ symbol: "XYZ", dataAvailable: false, unavailableReason: "No recognized sector ETF mapping." });
  assert.match(summary, /unavailable for XYZ/);
  assert.match(summary, /No recognized sector ETF mapping\./);
});

test("generateAiSummary: discloses the indirect sector-proxy path for a stock symbol", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /sector proxy XLK \(Technology\)/);
});

test("generateAiSummary: discloses a direct ETF analysis for a recognized ETF symbol", () => {
  const summary = generateAiSummary(baseReport({ symbol: "XLK", isDirectEtf: true }));
  assert.match(summary, /directly analyzing XLK/);
});

test("generateAiSummary: mentions the real ETF flow bias, net flow score, strength, and persistence", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /BULLISH/);
  assert.match(summary, /60/);
  assert.match(summary, /high/i);
});

test("generateAiSummary: honestly reports when sector rotation could not be assessed", () => {
  const summary = generateAiSummary(baseReport({ sectorRotation: { classification: "UNKNOWN", relativeStrengthPercent: null } }));
  assert.match(summary, /could not be assessed/);
});

test("generateAiSummary: mentions the real passive/active classification and magnitude", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /passive/i);
  assert.match(summary, /high/i);
});

test("generateAiSummary: mentions the real overall confidence score", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /70\/100/);
});
