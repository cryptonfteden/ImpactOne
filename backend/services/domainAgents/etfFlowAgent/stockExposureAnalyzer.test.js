const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeStockExposure } = require("./stockExposureAnalyzer");

test("analyzeStockExposure honestly reports not-applicable for a directly-analyzed ETF, never a fabricated exposure figure", () => {
  const result = analyzeStockExposure({ isDirectEtf: true });
  assert.equal(result.dataAvailable, false);
  assert.match(result.unavailableReason, /[Nn]ot applicable/);
  assert.equal(result.exposureEstimate, null);
});

test("analyzeStockExposure honestly reports unavailable for a stock symbol (indirect sector proxy), never a fabricated exposure figure", () => {
  const result = analyzeStockExposure({ isDirectEtf: false });
  assert.equal(result.dataAvailable, false);
  assert.match(result.unavailableReason, /No real ETF-holdings-by-constituent/);
  assert.equal(result.exposureEstimate, null);
});
