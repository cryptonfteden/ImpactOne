const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeMarketStress, classifyVix } = require("./marketStressAnalyzer");

function vixProxy(latestClose, dataAvailable = true) {
  return { dataAvailable, latestClose };
}

function creditResult(classification) {
  return { classification };
}

test("classifyVix: real regime boundaries", () => {
  assert.equal(classifyVix(10), "LOW");
  assert.equal(classifyVix(17), "MODERATE");
  assert.equal(classifyVix(25), "ELEVATED");
  assert.equal(classifyVix(35), "HIGH");
});

test("takes the worse of real VIX and real credit-spread signals", () => {
  assert.equal(analyzeMarketStress(vixProxy(12), creditResult("STRESSED")).marketStress, "HIGH");
  assert.equal(analyzeMarketStress(vixProxy(35), creditResult("TIGHT")).marketStress, "HIGH");
  assert.equal(analyzeMarketStress(vixProxy(12), creditResult("TIGHT")).marketStress, "LOW");
});

test("honestly reports UNKNOWN only when both real signals are unavailable", () => {
  const result = analyzeMarketStress(vixProxy(null, false), creditResult("UNKNOWN"));
  assert.equal(result.marketStress, "UNKNOWN");
});

test("falls back to the one real available signal when the other is missing", () => {
  const result = analyzeMarketStress(vixProxy(null, false), creditResult("STRESSED"));
  assert.equal(result.marketStress, "HIGH");
});
