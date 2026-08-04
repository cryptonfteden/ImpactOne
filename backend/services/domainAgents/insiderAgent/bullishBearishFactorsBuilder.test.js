const test = require("node:test");
const assert = require("node:assert/strict");
const { buildBullishFactors, buildBearishFactors, buildRisks } = require("./bullishBearishFactorsBuilder");

function baseInputs(overrides = {}) {
  return {
    netInsiderActivity: { insiderActivity: "NEUTRAL", netInsiderScore: 0, buyValue: 0, sellValue: 0 },
    clusterActivity: { clusterBuy: false, clusterSell: false, distinctBuyers: 0, distinctSellers: 0, windowDays: 30 },
    executiveActivity: { ceoTransactions: [], cfoTransactions: [], hasCeoActivity: false, hasCfoActivity: false },
    transactionSize: { overallSignificance: "NONE", largestTransaction: null },
    ...overrides,
  };
}

test("buildBullishFactors includes a real bullish net-activity clause", () => {
  const factors = buildBullishFactors(baseInputs({ netInsiderActivity: { insiderActivity: "BULLISH", netInsiderScore: 80, buyValue: 100000, sellValue: 10000 } }));
  assert.ok(factors.some((f) => f.includes("bullish")));
});

test("buildBullishFactors includes a real cluster-buy clause", () => {
  const factors = buildBullishFactors(baseInputs({ clusterActivity: { clusterBuy: true, clusterSell: false, distinctBuyers: 4, windowDays: 30 } }));
  assert.ok(factors.some((f) => f.includes("Cluster buying")));
});

test("buildBullishFactors includes a real CEO-purchase clause only when the CEO actually bought", () => {
  const factors = buildBullishFactors(baseInputs({ executiveActivity: { ceoTransactions: [{ transactionCode: "P" }], cfoTransactions: [], hasCeoActivity: true, hasCfoActivity: false } }));
  assert.ok(factors.some((f) => f.includes("CEO made a real open-market purchase")));
});

test("buildBullishFactors does not credit a CEO sale as bullish", () => {
  const factors = buildBullishFactors(baseInputs({ executiveActivity: { ceoTransactions: [{ transactionCode: "S" }], cfoTransactions: [], hasCeoActivity: true, hasCfoActivity: false } }));
  assert.ok(!factors.some((f) => f.includes("CEO made a real open-market purchase")));
});

test("buildBullishFactors includes a high-significance purchase clause", () => {
  const factors = buildBullishFactors(baseInputs({ transactionSize: { overallSignificance: "HIGH", largestTransaction: { transactionCode: "P", dollarValue: 2_000_000 } } }));
  assert.ok(factors.some((f) => f.includes("high-significance real purchase")));
});

test("buildBullishFactors returns empty when nothing real is bullish", () => {
  assert.deepEqual(buildBullishFactors(baseInputs()), []);
});

test("buildBearishFactors mirrors the bullish logic for the negative side", () => {
  const factors = buildBearishFactors(
    baseInputs({
      netInsiderActivity: { insiderActivity: "BEARISH", netInsiderScore: -80, buyValue: 0, sellValue: 500000 },
      clusterActivity: { clusterBuy: false, clusterSell: true, distinctSellers: 4, windowDays: 30 },
      executiveActivity: { ceoTransactions: [{ transactionCode: "S" }], cfoTransactions: [], hasCeoActivity: true, hasCfoActivity: false },
      transactionSize: { overallSignificance: "HIGH", largestTransaction: { transactionCode: "S", dollarValue: 5_000_000 } },
    })
  );
  assert.ok(factors.some((f) => f.includes("bearish")));
  assert.ok(factors.some((f) => f.includes("Cluster selling")));
  assert.ok(factors.some((f) => f.includes("CEO made a real open-market sale")));
  assert.ok(factors.some((f) => f.includes("high-significance real sale")));
});

test("buildRisks flags a real small sample size and few real filings", () => {
  const risks = buildRisks({ transactionCount: 1, filingsFetched: 1, ownershipTrend: { trend: "STABLE", netOwnershipChange: 0 } });
  assert.ok(risks.some((r) => r.includes("Small real sample size")));
  assert.ok(risks.some((r) => r.includes("Few real Form 4 filings")));
});

test("buildRisks flags a real decreasing aggregate ownership trend", () => {
  const risks = buildRisks({ transactionCount: 20, filingsFetched: 10, ownershipTrend: { trend: "DECREASING", netOwnershipChange: -5000 } });
  assert.ok(risks.some((r) => r.includes("decreased by 5000 shares")));
});

test("buildRisks reports no risks when every real input is healthy", () => {
  const risks = buildRisks({ transactionCount: 20, filingsFetched: 10, ownershipTrend: { trend: "STABLE", netOwnershipChange: 0 } });
  assert.deepEqual(risks, []);
});
