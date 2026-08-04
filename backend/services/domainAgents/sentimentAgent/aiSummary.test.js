const test = require("node:test");
const assert = require("node:assert/strict");
const { generateAiSummary } = require("./aiSummary");

function baseReport(overrides = {}) {
  return {
    symbol: "TEST",
    dataAvailable: true,
    unavailableReason: null,
    sentimentState: "POSITIVE",
    sentimentScore: 75,
    sentimentTrend: "IMPROVING",
    sentimentVelocity: { value: 5, unit: "score points per day", insufficientData: false },
    abnormalActivity: { hasAbnormalActivity: false, volumeSpikes: [], sentimentShifts: [] },
    sourceQuality: { totalArticleCount: 10, distinctSourceCount: 4, credibilityScore: 80 },
    bullishFactors: ["Sentiment trend is improving."],
    bearishFactors: [],
    confidence: { confidence: 70 },
    ...overrides,
  };
}

test("generateAiSummary: unavailable data produces an honest one-line explanation, not a fabricated analysis", () => {
  const summary = generateAiSummary({ symbol: "XYZ", dataAvailable: false, unavailableReason: "No NEWS_API_KEY configured." });
  assert.match(summary, /unavailable for XYZ/);
  assert.match(summary, /No NEWS_API_KEY configured\./);
});

test("generateAiSummary: mentions the real sentiment state, score, and trend", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /POSITIVE/);
  assert.match(summary, /75\/100/);
  assert.match(summary, /improving/);
});

test("generateAiSummary: mentions the real sentiment velocity when available", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /5 score points per day/);
});

test("generateAiSummary: omits the velocity clause when data was insufficient, never inventing one", () => {
  const summary = generateAiSummary(baseReport({ sentimentVelocity: { value: null, unit: "score points per day", insufficientData: true } }));
  assert.doesNotMatch(summary, /score points per day\./);
});

test("generateAiSummary: mentions real abnormal activity when detected", () => {
  const summary = generateAiSummary(baseReport({ abnormalActivity: { hasAbnormalActivity: true, volumeSpikes: [], sentimentShifts: [] } }));
  assert.match(summary, /Abnormal sentiment\/volume activity/);
});

test("generateAiSummary: mentions the real source quality counts", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /10 real article/);
  assert.match(summary, /4 distinct source/);
  assert.match(summary, /80\/100/);
});

test("generateAiSummary: includes real bullish/bearish factor clauses when present", () => {
  const summary = generateAiSummary(baseReport({ bearishFactors: ["Overall sentiment is negative."] }));
  assert.match(summary, /Bullish factors:/);
  assert.match(summary, /Bearish factors:/);
});

test("generateAiSummary: mentions the real overall confidence score", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /70\/100/);
});
