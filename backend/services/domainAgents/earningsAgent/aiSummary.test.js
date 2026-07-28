const test = require("node:test");
const assert = require("node:assert/strict");
const { buildAiSummary } = require("./aiSummary");
const { emptyMetrics } = require("./earningsDataProvider");

function countSentences(text) {
  return text.split(/(?<=[.])\s+/).filter(Boolean).length;
}

test("no data available => a single honest sentence naming the real reason", () => {
  const summary = buildAiSummary({
    metrics: emptyMetrics("NVDA", "No Finnhub API key is configured."),
    growth: { growthScore: null },
    surprise: { surpriseScore: null, consistency: { rating: "UNKNOWN" } },
    outlook: { outlook: "UNKNOWN" },
    health: { earningsHealth: "UNKNOWN" },
  });
  assert.match(summary, /No real earnings data source is currently connected/);
  assert.match(summary, /No Finnhub API key is configured/);
});

test("the summary is always 2-4 sentences across a range of real inputs", () => {
  const scenarios = [
    {
      metrics: { dataAvailable: true, revenue: { growthYoY: 12 }, eps: { growthYoY: 8 } },
      growth: { growthScore: 65 },
      surprise: { surpriseScore: 70, consistency: { rating: "HIGH" } },
      outlook: { outlook: "POSITIVE" },
      health: { earningsHealth: "STRONG" },
    },
    {
      metrics: { dataAvailable: true, revenue: { growthYoY: null }, eps: { growthYoY: null } },
      growth: { growthScore: null },
      surprise: { surpriseScore: null, consistency: { rating: "UNKNOWN" } },
      outlook: { outlook: "UNKNOWN" },
      health: { earningsHealth: "UNKNOWN" },
    },
    {
      metrics: { dataAvailable: true, revenue: { growthYoY: -5 }, eps: { growthYoY: -3 } },
      growth: { growthScore: 30 },
      surprise: { surpriseScore: 25, consistency: { rating: "LOW" } },
      outlook: { outlook: "NEGATIVE" },
      health: { earningsHealth: "WEAK" },
    },
  ];
  for (const scenario of scenarios) {
    const summary = buildAiSummary(scenario);
    const sentenceCount = countSentences(summary);
    assert.ok(sentenceCount >= 2 && sentenceCount <= 4, `expected 2-4 sentences, got ${sentenceCount}: "${summary}"`);
  }
});

test("real revenue and EPS growth percentages are named explicitly", () => {
  const summary = buildAiSummary({
    metrics: { dataAvailable: true, revenue: { growthYoY: 18.4 }, eps: { growthYoY: 22.1 } },
    growth: { growthScore: 80 },
    surprise: { surpriseScore: null, consistency: { rating: "UNKNOWN" } },
    outlook: { outlook: "NEUTRAL" },
    health: { earningsHealth: "STABLE" },
  });
  assert.match(summary, /18\.4% YoY/);
  assert.match(summary, /22\.1% YoY/);
});

test("earnings health is named explicitly when known", () => {
  const summary = buildAiSummary({
    metrics: { dataAvailable: true, revenue: { growthYoY: 5 }, eps: { growthYoY: 5 } },
    growth: { growthScore: 55 },
    surprise: { surpriseScore: 55, consistency: { rating: "MODERATE" } },
    outlook: { outlook: "NEUTRAL" },
    health: { earningsHealth: "STABLE" },
  });
  assert.match(summary, /STABLE/);
});

test("an UNKNOWN forward outlook is disclosed honestly, never a fabricated lean", () => {
  const summary = buildAiSummary({
    metrics: { dataAvailable: true, revenue: { growthYoY: 5 }, eps: { growthYoY: 5 } },
    growth: { growthScore: 55 },
    surprise: { surpriseScore: null, consistency: { rating: "UNKNOWN" } },
    outlook: { outlook: "UNKNOWN" },
    health: { earningsHealth: "UNKNOWN" },
  });
  assert.match(summary, /cannot be assessed/);
});
