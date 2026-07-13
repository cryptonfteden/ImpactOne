require("../../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const autonomousMarketService = require("../../autonomousMarketService");
const reutersBloombergWireProvider = require("./reutersBloombergWireProvider");

test("fetch() filters the live feed down to Reuters/Bloomberg-sourced items", async () => {
  const originalFn = autonomousMarketService.getAutonomousOverview;
  autonomousMarketService.getAutonomousOverview = async () => ({
    feed: [
      { headline: "A", sourceName: "Reuters" },
      { headline: "B", sourceName: "Bloomberg" },
      { headline: "C", sourceName: "Random Blog" },
    ],
  });

  try {
    const items = await reutersBloombergWireProvider.fetch();
    assert.equal(items.length, 2);
    assert.ok(items.every((item) => ["Reuters", "Bloomberg"].includes(item.sourceName)));
  } finally {
    autonomousMarketService.getAutonomousOverview = originalFn;
  }
});

test("fetch() returns an empty array when the feed is empty", async () => {
  const originalFn = autonomousMarketService.getAutonomousOverview;
  autonomousMarketService.getAutonomousOverview = async () => ({ feed: [] });

  try {
    const items = await reutersBloombergWireProvider.fetch();
    assert.deepEqual(items, []);
  } finally {
    autonomousMarketService.getAutonomousOverview = originalFn;
  }
});

test("provider satisfies the base contract", () => {
  assert.equal(reutersBloombergWireProvider.providerId, "reutersBloombergWire");
  assert.equal(typeof reutersBloombergWireProvider.fetch, "function");
});
