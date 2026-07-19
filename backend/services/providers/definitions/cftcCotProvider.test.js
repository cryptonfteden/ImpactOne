require("../../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const cotIntelligenceService = require("../../intelligence/cotIntelligenceService");
const cftcCotProvider = require("./cftcCotProvider");

test("fetch() maps real COT adapter results into feed-item-shaped raw events with an official-source credibility score", async () => {
  const originalFn = cotIntelligenceService.getCotIntelligence;
  cotIntelligenceService.getCotIntelligence = async (market) => ({
    status: "LIVE",
    normalizedSignal: {
      market: `${market} - EXCHANGE`,
      publicationDate: "2026-07-17",
      nonCommercial: { long: 300, short: 200, net: 100 },
      weekOverWeek: { netPositioningChange: 70, direction: "MORE_NET_LONG" },
    },
  });

  try {
    const items = await cftcCotProvider.fetch();
    assert.ok(items.length > 0);
    assert.ok(items.every((item) => item.sourceType === "futures-cot"));
    assert.ok(items.every((item) => item.credibilityScore === 95));
    assert.ok(items[0].summary.includes("net long"));
  } finally {
    cotIntelligenceService.getCotIntelligence = originalFn;
  }
});

test("fetch() excludes a market whose lookup failed rather than fabricating a placeholder event for it", async () => {
  const originalFn = cotIntelligenceService.getCotIntelligence;
  cotIntelligenceService.getCotIntelligence = async () => ({ status: "ERROR", errorState: "boom" });

  try {
    const items = await cftcCotProvider.fetch();
    assert.deepEqual(items, []);
  } finally {
    cotIntelligenceService.getCotIntelligence = originalFn;
  }
});

test("provider satisfies the base contract", () => {
  assert.equal(cftcCotProvider.providerId, "cftcCot");
  assert.equal(typeof cftcCotProvider.fetch, "function");
});
