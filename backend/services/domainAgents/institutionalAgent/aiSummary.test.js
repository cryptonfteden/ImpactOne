const test = require("node:test");
const assert = require("node:assert/strict");
const { generateAiSummary } = require("./aiSummary");

function baseReport(overrides = {}) {
  return {
    symbol: "TEST",
    dataAvailable: true,
    unavailableReason: null,
    institutionalBias: "BULLISH",
    institutionalScore: 55,
    ownershipTrend: { trend: "INCREASING" },
    accumulationScore: 70,
    distributionScore: 30,
    newPositions: [{ managerName: "A" }],
    closedPositions: [],
    topHolders: [{ managerName: "A" }, { managerName: "B" }],
    smartMoneyParticipation: 60,
    convictionScore: 80,
    confidence: { confidence: 65 },
    ...overrides,
  };
}

test("generateAiSummary: unavailable data produces an honest one-line explanation, not a fabricated analysis", () => {
  const summary = generateAiSummary({ symbol: "XYZ", dataAvailable: false, unavailableReason: "Finnhub returned no real company name." });
  assert.match(summary, /unavailable for XYZ/);
  assert.match(summary, /no real company name\./);
});

test("generateAiSummary: mentions the real institutional bias, score, and ownership trend", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /BULLISH/);
  assert.match(summary, /55/);
  assert.match(summary, /increasing/);
});

test("generateAiSummary: mentions the real accumulation and distribution scores", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /70\/100/);
  assert.match(summary, /30\/100/);
});

test("generateAiSummary: mentions the real new/closed position counts and top-holder count", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /1 new real position/);
  assert.match(summary, /0 closed/);
  assert.match(summary, /2 of the disclosed cohort/);
});

test("generateAiSummary: mentions the real smart money participation and conviction score", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /60%/);
  assert.match(summary, /80\/100/);
});

test("generateAiSummary: mentions the real overall confidence score", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /65\/100/);
});
