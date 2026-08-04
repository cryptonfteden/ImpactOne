const test = require("node:test");
const assert = require("node:assert/strict");
const { generateAiSummary } = require("./aiSummary");

function baseReport(overrides = {}) {
  return {
    symbol: "TEST",
    dataAvailable: true,
    unavailableReason: null,
    trend: "BULLISH",
    trendStrength: 45,
    momentum: { state: "STRONG_BULLISH" },
    levels: {
      supportLevels: [{ price: 90, source: "60-day range low" }],
      resistanceLevels: [{ price: 110, source: "60-day range high" }],
    },
    breakout: { probability: 60, reason: "test reason" },
    risk: { riskLevel: "MODERATE", reason: "test risk reason" },
    confidence: { confidence: 75 },
    ...overrides,
  };
}

test("generateAiSummary: unavailable data produces an honest one-line explanation, not a fabricated analysis", () => {
  const summary = generateAiSummary({ symbol: "XYZ", dataAvailable: false, unavailableReason: "No price history available." });
  assert.match(summary, /unavailable for XYZ/);
  assert.match(summary, /No price history available\./);
});

test("generateAiSummary: mentions the real trend direction and trend strength value", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /uptrend/i);
  assert.match(summary, /45\/100/);
});

test("generateAiSummary: mentions real momentum state", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /strongly bullish/i);
});

test("generateAiSummary: mentions the real nearest support/resistance prices when present", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /90\.00/);
  assert.match(summary, /110\.00/);
});

test("generateAiSummary: omits the levels clause entirely when no real levels exist, never inventing one", () => {
  const summary = generateAiSummary(baseReport({ levels: { supportLevels: [], resistanceLevels: [] } }));
  assert.doesNotMatch(summary, /Key levels/);
});

test("generateAiSummary: mentions the real breakout probability and risk level", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /60\/100/);
  assert.match(summary, /MODERATE/);
});

test("generateAiSummary: honestly reports when breakout probability could not be estimated", () => {
  const summary = generateAiSummary(baseReport({ breakout: { probability: null, reason: "n/a" } }));
  assert.match(summary, /could not be estimated/);
});

test("generateAiSummary: mentions the real overall confidence score", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /75\/100/);
});

test("generateAiSummary always returns a non-empty string for an available report", () => {
  const summary = generateAiSummary(baseReport());
  assert.ok(typeof summary === "string" && summary.length > 0);
});
