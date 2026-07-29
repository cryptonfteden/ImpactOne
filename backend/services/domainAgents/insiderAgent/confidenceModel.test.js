const test = require("node:test");
const assert = require("node:assert/strict");
const { computeConfidence } = require("./confidenceModel");

const NOW = new Date("2026-04-01T00:00:00Z");

test("computeConfidence: no real EDGAR data reports 0 confidence, honestly", () => {
  const { confidence } = computeConfidence({ dataAvailable: false, filingsFetched: 0, transactionCount: 0, hasCluster: false, mostRecentFilingDate: null, now: NOW });
  assert.equal(confidence, 0);
});

test("computeConfidence: real maximum sample size, filings, cluster, and recency reaches the full ceiling", () => {
  const { confidence, components } = computeConfidence({
    dataAvailable: true,
    filingsFetched: 10,
    transactionCount: 10,
    hasCluster: true,
    mostRecentFilingDate: "2026-03-25",
    now: NOW,
  });
  assert.equal(confidence, 100); // 30 base + 25 sample + 15 filings + 15 cluster + 15 recency
  assert.equal(components.clusterBonus, 15);
});

test("computeConfidence: real cluster corroboration adds the disclosed bonus", () => {
  const withCluster = computeConfidence({ dataAvailable: true, filingsFetched: 1, transactionCount: 1, hasCluster: true, mostRecentFilingDate: null, now: NOW });
  const withoutCluster = computeConfidence({ dataAvailable: true, filingsFetched: 1, transactionCount: 1, hasCluster: false, mostRecentFilingDate: null, now: NOW });
  assert.equal(withCluster.confidence - withoutCluster.confidence, 15);
});

test("computeConfidence: a real, fresh filing (<=30 days) earns a higher recency bonus than a stale one", () => {
  const fresh = computeConfidence({ dataAvailable: true, filingsFetched: 1, transactionCount: 1, hasCluster: false, mostRecentFilingDate: "2026-03-25", now: NOW });
  const stale = computeConfidence({ dataAvailable: true, filingsFetched: 1, transactionCount: 1, hasCluster: false, mostRecentFilingDate: "2025-01-01", now: NOW });
  assert.ok(fresh.confidence > stale.confidence);
  assert.equal(stale.components.recencyBonus, 0);
});

test("computeConfidence: a real filing between 30-90 days old earns the intermediate recency bonus", () => {
  const { components } = computeConfidence({ dataAvailable: true, filingsFetched: 1, transactionCount: 1, hasCluster: false, mostRecentFilingDate: "2026-02-01", now: NOW });
  assert.equal(components.recencyBonus, 8);
});

test("computeConfidence is always clamped to [0, 100]", () => {
  const { confidence } = computeConfidence({ dataAvailable: true, filingsFetched: 100, transactionCount: 100, hasCluster: true, mostRecentFilingDate: "2026-03-31", now: NOW });
  assert.ok(confidence <= 100);
});
