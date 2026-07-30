const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeCoverageQuality } = require("./coverageQualityAnalyzer");

test("classifies LOW below 10 real analysts", () => {
  assert.equal(analyzeCoverageQuality(5).coverageQuality, "LOW");
});

test("classifies MODERATE between 10 and 20 real analysts", () => {
  assert.equal(analyzeCoverageQuality(15).coverageQuality, "MODERATE");
});

test("classifies HIGH at or above 20 real analysts", () => {
  assert.equal(analyzeCoverageQuality(25).coverageQuality, "HIGH");
});

test("honestly reports UNKNOWN with zero real analysts", () => {
  assert.equal(analyzeCoverageQuality(0).coverageQuality, "UNKNOWN");
});
