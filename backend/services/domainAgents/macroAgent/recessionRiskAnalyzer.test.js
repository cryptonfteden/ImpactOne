const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeRecessionRisk } = require("./recessionRiskAnalyzer");

test("classifies LOW when every real signal is favorable", () => {
  const result = analyzeRecessionRisk({ classification: "NORMAL" }, { classification: "TIGHT" }, { trend: "IMPROVING" });
  assert.equal(result.recessionRisk, "LOW");
});

test("classifies HIGH when every real signal is unfavorable", () => {
  const result = analyzeRecessionRisk({ classification: "INVERTED" }, { classification: "STRESSED" }, { trend: "WORSENING" });
  assert.equal(result.recessionRisk, "HIGH");
  assert.equal(result.recessionRiskScore, 100);
});

test("renormalizes weights when one real signal is unavailable", () => {
  const result = analyzeRecessionRisk({ classification: "UNKNOWN" }, { classification: "STRESSED" }, { trend: "WORSENING" });
  assert.equal(result.recessionRisk, "HIGH");
  assert.notEqual(result.recessionRiskScore, null);
});

test("honestly reports UNKNOWN when every real upstream signal is unavailable", () => {
  const result = analyzeRecessionRisk({ classification: "UNKNOWN" }, { classification: "UNKNOWN" }, { trend: "UNKNOWN" });
  assert.equal(result.recessionRisk, "UNKNOWN");
  assert.equal(result.recessionRiskScore, null);
});
