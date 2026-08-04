const test = require("node:test");
const assert = require("node:assert/strict");
const { createSocialSentimentDataProvider } = require("./socialSentimentDataProvider");

test("getSymbolSocialSentiment always honestly reports dataAvailable: false, never a fabricated social reading", async () => {
  const provider = createSocialSentimentDataProvider();
  const metrics = await provider.getSymbolSocialSentiment("AAPL");
  assert.equal(metrics.symbol, "AAPL");
  assert.equal(metrics.dataAvailable, false);
  assert.ok(metrics.unavailableReason.length > 0);
  assert.deepEqual(metrics.posts, []);
});
