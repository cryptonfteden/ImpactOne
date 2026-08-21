const test = require("node:test");
const assert = require("node:assert/strict");
const altDataService = require("../../altDataService");
const agent = require("./alternativeDataAgent");

test("context-only alternative feeds cannot acquire committee confidence or masquerade as direct symbol evidence", async () => {
  const original = altDataService.getAltDataSummary;
  altDataService.getAltDataSummary = async () => ({
    cot: { source: "cftc", market: "S&P 500", signal: "Mild long", netPositioning: 10, asOf: "2026-08-18" },
    polymarket: [],
    macro: { source: "fred" },
    sec: { source: "unavailable", filings: [] },
    congress: { source: "house-stock-watcher", directMatch: false, trades: [{ ticker: "OTHER" }] },
    signals: { confidenceScore: 80 },
  });
  try {
    const result = await agent.execute("NVDA");
    assert.equal(result.direction, null);
    assert.equal(result.raw.confidence.confidence, 0);
    assert.equal(result.raw.confidence.coverageScore, 80);
    assert.equal(result.raw.dataQuality.directCongressMatches, 0);
    assert.ok(result.evidence.some((item) => /asset-class context, not a position in NVDA/i.test(item.observedFact)));
    assert.ok(!result.evidence.some((item) => /congressional disclosures/i.test(item.observedFact)));
  } finally {
    altDataService.getAltDataSummary = original;
  }
});
