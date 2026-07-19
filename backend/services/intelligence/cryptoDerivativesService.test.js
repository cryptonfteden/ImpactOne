const test = require("node:test");
const assert = require("node:assert/strict");

const cryptoDerivativesService = require("./cryptoDerivativesService");

test("normalizeDerivativesSnapshot computes a real long/short ratio and marks isRecommendation false", () => {
  const result = cryptoDerivativesService.normalizeDerivativesSnapshot({ symbol: "BTC", longPct: 75, shortPct: 25 });
  assert.equal(result.longShort.ratio, 3);
  assert.equal(result.isRecommendation, false);
});

test("an extreme long skew is flagged HIGH crowding risk as a counter-signal, never presented as bullish confirmation", () => {
  const result = cryptoDerivativesService.normalizeDerivativesSnapshot({ longPct: 82, shortPct: 18 });
  assert.equal(result.crowdingRisk, "HIGH");
  assert.equal(result.sentimentDirection, "CROWD_LONG");
});

test("a balanced long/short split is LOW crowding risk", () => {
  const result = cryptoDerivativesService.normalizeDerivativesSnapshot({ longPct: 50, shortPct: 50 });
  assert.equal(result.crowdingRisk, "LOW");
  assert.equal(result.sentimentDirection, "BALANCED");
});

test("liquidation imbalance is computed only from real liquidation numbers, never fabricated", () => {
  const result = cryptoDerivativesService.normalizeDerivativesSnapshot({ longLiquidationsUsd: 10, shortLiquidationsUsd: 30 });
  assert.equal(result.liquidations.imbalance, (10 - 30) / 40);
  const missingData = cryptoDerivativesService.normalizeDerivativesSnapshot({});
  assert.equal(missingData.liquidations.imbalance, null);
});

test("getFixtureSnapshot is clearly labeled FIXTURE", () => {
  const result = cryptoDerivativesService.getFixtureSnapshot("BTC");
  assert.equal(result.status, "FIXTURE");
  assert.equal(result.isRecommendation, false);
});
