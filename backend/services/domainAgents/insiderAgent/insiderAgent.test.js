const test = require("node:test");
const assert = require("node:assert/strict");
const { generateReport } = require("./insiderAgent");
const canonicalVerdict = require("../../canonicalVerdict");

function txn({ ownerCik = "A", ownerName = "Alice", isOfficer = false, isDirector = false, isTenPercentOwner = false, officerTitle = null, transactionDate, transactionCode, shares, pricePerShare = null, acquiredDisposedCode = "A", sharesOwnedAfter = 1000, filingDate }) {
  return { ownerCik, ownerName, isOfficer, isDirector, isTenPercentOwner, officerTitle, transactionDate, transactionCode, shares, pricePerShare, acquiredDisposedCode, sharesOwnedAfter, filingDate: filingDate || transactionDate, filingUrl: "https://sec.gov/x" };
}

function fakeProvider(metrics) {
  return { getSymbolInsiderData: async () => metrics };
}

test("generateReport: unavailable data produces an honest, fully-populated unavailable report (never partial/fabricated)", async () => {
  const metrics = { symbol: "NOPE", asOf: "2026-07-27T00:00:00.000Z", dataAvailable: false, unavailableReason: "SEC EDGAR has no real CIK on record.", cik: null, companyTitle: null, transactions: [], filingsFetched: 0 };
  const report = await generateReport("NOPE", { provider: fakeProvider(metrics) });
  assert.equal(report.dataAvailable, false);
  assert.equal(report.insiderActivity, "NEUTRAL");
  assert.equal(report.confidence.confidence, 0);
  assert.deepEqual(report.bullishFactors, []);
  assert.ok(typeof report.aiSummary === "string" && report.aiSummary.length > 0);
});

test("generateReport: composes every mission-required output field from real, available data", async () => {
  const metrics = {
    symbol: "FAKE",
    asOf: "2026-04-01T00:00:00.000Z",
    dataAvailable: true,
    unavailableReason: null,
    cik: "0000320193",
    companyTitle: "Fake Inc.",
    filingsFetched: 3,
    transactions: [
      txn({ ownerCik: "A", ownerName: "Alice", isOfficer: true, officerTitle: "Chief Executive Officer", transactionCode: "P", transactionDate: "2026-03-20", shares: 1000, pricePerShare: 50, sharesOwnedAfter: 5000 }),
      txn({ ownerCik: "B", ownerName: "Bob", isDirector: true, transactionCode: "P", transactionDate: "2026-03-25", shares: 500, pricePerShare: 50, sharesOwnedAfter: 2000 }),
      txn({ ownerCik: "C", ownerName: "Carol", isDirector: true, transactionCode: "P", transactionDate: "2026-03-28", shares: 300, pricePerShare: 50, sharesOwnedAfter: 1500 }),
    ],
  };

  const report = await generateReport("FAKE", { provider: fakeProvider(metrics) });

  assert.equal(report.symbol, "FAKE");
  assert.equal(report.dataAvailable, true);
  assert.ok(["BULLISH", "NEUTRAL", "BEARISH"].includes(report.insiderActivity));
  assert.ok(Number.isFinite(report.netInsiderScore));
  assert.ok("clusterBuy" in report.clusterActivity);
  assert.ok("officer" in report.officerDirectorActivity);
  assert.ok("hasCeoActivity" in report.executiveActivity);
  assert.ok(["INCREASING", "DECREASING", "STABLE"].includes(report.ownershipTrend.trend));
  assert.ok(["NONE", "LOW", "MODERATE", "HIGH"].includes(report.transactionSize.overallSignificance));
  assert.ok(Number.isFinite(report.confidence.confidence));
  assert.ok(Array.isArray(report.bullishFactors));
  assert.ok(Array.isArray(report.bearishFactors));
  assert.ok(Array.isArray(report.risks));
  assert.ok(typeof report.aiSummary === "string" && report.aiSummary.length > 0);
  assert.ok(report.inputs);
  assert.equal(report.verifiedOpenMarketPurchases.count, 3);
  assert.equal(report.signalEligible, true);
  assert.equal(report.dataQuality.source, "SEC EDGAR Form 4");

  // Real, deliberate scenario check: 3 distinct insiders bought => cluster buy, bullish activity.
  assert.equal(report.insiderActivity, "BULLISH");
  assert.equal(report.clusterActivity.clusterBuy, true);
  assert.equal(report.executiveActivity.hasCeoActivity, true);
});

test("generateReport: grants, disposals and unpriced rows never become an actionable purchase signal", async () => {
  const metrics = {
    symbol: "FAKE",
    asOf: "2026-04-01T00:00:00.000Z",
    dataAvailable: true,
    unavailableReason: null,
    cik: "0000320193",
    companyTitle: "Fake Inc.",
    filingsFetched: 1,
    transactions: [
      txn({ transactionCode: "A", transactionDate: "2026-03-31", shares: 1000, pricePerShare: 0 }),
      txn({ transactionCode: "P", acquiredDisposedCode: "D", transactionDate: "2026-03-31", shares: 100, pricePerShare: 20 }),
      txn({ transactionCode: "P", acquiredDisposedCode: "A", transactionDate: "2026-03-31", shares: 100, pricePerShare: null }),
    ],
  };
  const report = await generateReport("FAKE", { provider: fakeProvider(metrics) });
  assert.equal(report.verifiedOpenMarketPurchases.count, 0);
  assert.equal(report.signalEligible, false);
});

test("generateReport: retains the real underlying metrics as `inputs` for auditability", async () => {
  const metrics = { symbol: "FAKE", asOf: "2026-04-01T00:00:00.000Z", dataAvailable: true, unavailableReason: null, cik: "0000320193", companyTitle: "Fake Inc.", filingsFetched: 0, transactions: [] };
  const report = await generateReport("FAKE", { provider: fakeProvider(metrics) });
  assert.equal(report.inputs, metrics);
});

test("generateReport: never surfaces a forbidden committee verdict key anywhere in the serialized report", async () => {
  const metrics = {
    symbol: "FAKE",
    asOf: "2026-04-01T00:00:00.000Z",
    dataAvailable: true,
    unavailableReason: null,
    cik: "0000320193",
    companyTitle: "Fake Inc.",
    filingsFetched: 1,
    transactions: [txn({ transactionCode: "S", transactionDate: "2026-03-20", shares: 100, pricePerShare: 10 })],
  };
  const report = await generateReport("FAKE", { provider: fakeProvider(metrics) });
  const serialized = JSON.stringify(report);
  for (const forbiddenKey of canonicalVerdict.FORBIDDEN_COMMITTEE_KEYS) {
    assert.doesNotMatch(serialized, new RegExp(`"${forbiddenKey}"\\s*:`), `report must never contain the forbidden key "${forbiddenKey}"`);
  }
});

test("generateReport: gracefully handles zero real transactions from an otherwise-available EDGAR source, never crashing", async () => {
  const metrics = { symbol: "EMPTY", asOf: "2026-04-01T00:00:00.000Z", dataAvailable: true, unavailableReason: null, cik: "0000000001", companyTitle: "Empty Inc.", filingsFetched: 0, transactions: [] };
  const report = await generateReport("EMPTY", { provider: fakeProvider(metrics) });
  assert.equal(report.dataAvailable, true);
  assert.equal(report.insiderActivity, "NEUTRAL");
  assert.equal(report.transactionSize.overallSignificance, "NONE");
});
