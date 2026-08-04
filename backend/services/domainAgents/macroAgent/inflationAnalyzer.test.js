const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeInflationPressure } = require("./inflationAnalyzer");

function series(changeYoY, dataAvailable = true) {
  return { dataAvailable, changeYoY };
}

test("classifies LOW below 2%", () => {
  assert.equal(analyzeInflationPressure(series(1.2)).classification, "LOW");
});

test("classifies MODERATE between 2% and 4%", () => {
  assert.equal(analyzeInflationPressure(series(3.46)).classification, "MODERATE");
});

test("classifies HIGH between 4% and 6%", () => {
  assert.equal(analyzeInflationPressure(series(5)).classification, "HIGH");
});

test("classifies ELEVATED at or above 6%", () => {
  assert.equal(analyzeInflationPressure(series(7.5)).classification, "ELEVATED");
});

test("honestly reports UNKNOWN when real data is unavailable", () => {
  const result = analyzeInflationPressure(series(null, false));
  assert.equal(result.classification, "UNKNOWN");
  assert.equal(result.cpiChangeYoY, null);
});
