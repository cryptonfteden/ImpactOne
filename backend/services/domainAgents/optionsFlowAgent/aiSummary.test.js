const test = require("node:test");
const assert = require("node:assert/strict");
const { buildAiSummary } = require("./aiSummary");
const { emptyMetrics } = require("./optionsDataProvider");

function countSentences(text) {
  return text.split(/(?<=[.])\s+/).filter(Boolean).length;
}

test("no data available => a single honest sentence, never a fabricated read", () => {
  const summary = buildAiSummary({ metrics: emptyMetrics("NVDA", "not connected"), bias: { bias: "NEUTRAL", confidence: 0 }, signals: {}, risk: { dataConfidence: "NONE" } });
  assert.match(summary, /No options-flow data source is currently connected/);
});

test("the summary is always 2-4 sentences, per the mission's spec, across a range of inputs", () => {
  const scenarios = [
    {
      metrics: { dataAvailable: true, optionVolume: { call: 500, put: 500, total: 1000 } },
      bias: { bias: "NEUTRAL", confidence: 10 },
      signals: { institutionalActivity: { detected: false } },
      risk: { dataConfidence: "MODERATE" },
    },
    {
      metrics: { dataAvailable: true, optionVolume: { call: 900, put: 100, total: 1000 } },
      bias: { bias: "BULLISH", confidence: 82 },
      signals: { institutionalActivity: { detected: true, contractCount: 3 } },
      risk: { dataConfidence: "LOW" },
    },
    {
      metrics: { dataAvailable: true, optionVolume: { call: 0, put: 0, total: 0 } },
      bias: { bias: "NEUTRAL", confidence: 0 },
      signals: { institutionalActivity: { detected: false } },
      risk: { dataConfidence: "MODERATE" },
    },
  ];
  for (const scenario of scenarios) {
    const summary = buildAiSummary(scenario);
    const sentenceCount = countSentences(summary);
    assert.ok(sentenceCount >= 2 && sentenceCount <= 4, `expected 2-4 sentences, got ${sentenceCount}: "${summary}"`);
  }
});

test("a bullish bias is named explicitly with its real confidence number", () => {
  const summary = buildAiSummary({
    metrics: { dataAvailable: true, optionVolume: { call: 700, put: 300, total: 1000 } },
    bias: { bias: "BULLISH", confidence: 77 },
    signals: { institutionalActivity: { detected: false } },
    risk: { dataConfidence: "MODERATE" },
  });
  assert.match(summary, /bullish/i);
  assert.match(summary, /77%/);
});

test("a bearish bias is named explicitly, never mislabeled as bullish or neutral", () => {
  const summary = buildAiSummary({
    metrics: { dataAvailable: true, optionVolume: { call: 300, put: 700, total: 1000 } },
    bias: { bias: "BEARISH", confidence: 60 },
    signals: { institutionalActivity: { detected: false } },
    risk: { dataConfidence: "MODERATE" },
  });
  assert.match(summary, /bearish/i);
  assert.ok(!/bullish/i.test(summary));
});

test("institutional activity, when detected, is mentioned by real contract count", () => {
  const summary = buildAiSummary({
    metrics: { dataAvailable: true, optionVolume: { call: 500, put: 500, total: 1000 } },
    bias: { bias: "NEUTRAL", confidence: 20 },
    signals: { institutionalActivity: { detected: true, contractCount: 4 } },
    risk: { dataConfidence: "MODERATE" },
  });
  assert.match(summary, /4 block\/sweep-sized trades/);
});

test("low data confidence is disclosed as a real caveat, never silently omitted", () => {
  const summary = buildAiSummary({
    metrics: { dataAvailable: true, optionVolume: { call: 10, put: 5, total: 15 } },
    bias: { bias: "NEUTRAL", confidence: 5 },
    signals: { institutionalActivity: { detected: false } },
    risk: { dataConfidence: "LOW" },
  });
  assert.match(summary, /directional context, not a firm signal/);
});
