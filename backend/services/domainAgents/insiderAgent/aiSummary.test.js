const test = require("node:test");
const assert = require("node:assert/strict");
const { generateAiSummary } = require("./aiSummary");

function baseReport(overrides = {}) {
  return {
    symbol: "TEST",
    dataAvailable: true,
    unavailableReason: null,
    insiderActivity: "BULLISH",
    netInsiderScore: 60,
    clusterActivity: { clusterBuy: false, clusterSell: false, distinctBuyers: 0, distinctSellers: 0, windowDays: 30 },
    executiveActivity: { hasCeoActivity: false, hasCfoActivity: false },
    transactionSize: { overallSignificance: "MODERATE", largestTransaction: { transactionCode: "P", shares: 500 } },
    ownershipTrend: { trend: "INCREASING" },
    confidence: { confidence: 65 },
    ...overrides,
  };
}

test("generateAiSummary: unavailable data produces an honest one-line explanation, not a fabricated analysis", () => {
  const summary = generateAiSummary({ symbol: "XYZ", dataAvailable: false, unavailableReason: "SEC EDGAR has no real CIK." });
  assert.match(summary, /unavailable for XYZ/);
  assert.match(summary, /no real CIK/);
});

test("generateAiSummary: mentions the real insider activity and net insider score", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /BULLISH/);
  assert.match(summary, /60/);
});

test("generateAiSummary: mentions real cluster buying/selling when detected", () => {
  const summary = generateAiSummary(baseReport({ clusterActivity: { clusterBuy: true, distinctBuyers: 4, windowDays: 30 } }));
  assert.match(summary, /Cluster buying was detected/);
});

test("generateAiSummary: honestly reports no cluster activity when none was detected", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /No real cluster buying or selling/);
});

test("generateAiSummary: mentions real CEO/CFO activity when present", () => {
  const summary = generateAiSummary(baseReport({ executiveActivity: { hasCeoActivity: true, hasCfoActivity: true } }));
  assert.match(summary, /the CEO transacted/);
  assert.match(summary, /the CFO transacted/);
});

test("generateAiSummary: omits the executive clause entirely when neither transacted, never inventing one", () => {
  const summary = generateAiSummary(baseReport());
  assert.doesNotMatch(summary, /Notably/);
});

test("generateAiSummary: mentions the real transaction significance and largest transaction", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /moderate/);
  assert.match(summary, /purchase of 500 shares/);
});

test("generateAiSummary: mentions the real ownership trend and confidence", () => {
  const summary = generateAiSummary(baseReport());
  assert.match(summary, /increasing/);
  assert.match(summary, /65\/100/);
});
