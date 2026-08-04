const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeAnalystBias } = require("./analystBiasAnalyzer");

test("classifies BULLISH above the neutral band", () => {
  assert.equal(analyzeAnalystBias(40), "BULLISH");
});

test("classifies BEARISH below the neutral band", () => {
  assert.equal(analyzeAnalystBias(-40), "BEARISH");
});

test("classifies NEUTRAL within the band", () => {
  assert.equal(analyzeAnalystBias(5), "NEUTRAL");
  assert.equal(analyzeAnalystBias(-5), "NEUTRAL");
});

test("honestly reports UNKNOWN when consensusScore is null", () => {
  assert.equal(analyzeAnalystBias(null), "UNKNOWN");
});
