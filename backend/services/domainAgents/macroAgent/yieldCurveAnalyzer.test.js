const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeYieldCurve } = require("./yieldCurveAnalyzer");

function series(value, dataAvailable = true) {
  return { dataAvailable, latest: dataAvailable ? { value } : null };
}

test("classifies NORMAL for a real positive spread", () => {
  assert.equal(analyzeYieldCurve(series(0.35)).classification, "NORMAL");
});

test("classifies INVERTED for a real negative spread", () => {
  assert.equal(analyzeYieldCurve(series(-0.4)).classification, "INVERTED");
});

test("classifies FLAT near zero", () => {
  assert.equal(analyzeYieldCurve(series(0.05)).classification, "FLAT");
});

test("honestly reports UNKNOWN when real data is unavailable", () => {
  const result = analyzeYieldCurve(series(null, false));
  assert.equal(result.classification, "UNKNOWN");
  assert.equal(result.spread, null);
});
