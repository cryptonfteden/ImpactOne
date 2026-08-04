const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeCreditSpread } = require("./creditSpreadAnalyzer");

function series(value, dataAvailable = true) {
  return { dataAvailable, latest: dataAvailable ? { value } : null };
}

test("classifies TIGHT below 3pp", () => {
  assert.equal(analyzeCreditSpread(series(2.84)).classification, "TIGHT");
});

test("classifies NORMAL between 3pp and 5pp", () => {
  assert.equal(analyzeCreditSpread(series(4)).classification, "NORMAL");
});

test("classifies WIDE between 5pp and 7pp", () => {
  assert.equal(analyzeCreditSpread(series(6)).classification, "WIDE");
});

test("classifies STRESSED at or above 7pp", () => {
  assert.equal(analyzeCreditSpread(series(9)).classification, "STRESSED");
});

test("honestly reports UNKNOWN when real data is unavailable", () => {
  const result = analyzeCreditSpread(series(null, false));
  assert.equal(result.classification, "UNKNOWN");
});
