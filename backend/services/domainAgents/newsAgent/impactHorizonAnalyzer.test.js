const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeImpactHorizon } = require("./impactHorizonAnalyzer");

test("classifies LONG for sustained, important real coverage", () => {
  assert.equal(analyzeImpactHorizon(60, true, "SUSTAINED"), "LONG");
});

test("classifies MEDIUM for multi-day, moderately important real coverage", () => {
  assert.equal(analyzeImpactHorizon(45, false, "MULTI_DAY"), "MEDIUM");
});

test("classifies MEDIUM for a real breaking, high-importance single-day story", () => {
  assert.equal(analyzeImpactHorizon(70, true, "SINGLE_DAY"), "MEDIUM");
});

test("classifies SHORT for low-importance, single-day real coverage", () => {
  assert.equal(analyzeImpactHorizon(20, false, "SINGLE_DAY"), "SHORT");
});

test("honestly reports UNKNOWN when real persistence is unknown", () => {
  assert.equal(analyzeImpactHorizon(50, true, "UNKNOWN"), "UNKNOWN");
});
