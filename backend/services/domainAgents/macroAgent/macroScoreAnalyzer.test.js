const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeMacroScore } = require("./macroScoreAnalyzer");

function allBullishInputs() {
  return [
    { classification: "NORMAL" },
    { marketStress: "LOW" },
    { direction: "EASING" },
    { classification: "LOW" },
    { trend: "IMPROVING" },
    { liquidityScore: 100 },
  ];
}

function allBearishInputs() {
  return [
    { classification: "INVERTED" },
    { marketStress: "HIGH" },
    { direction: "TIGHTENING" },
    { classification: "ELEVATED" },
    { trend: "WORSENING" },
    { liquidityScore: 0 },
  ];
}

test("produces a real BULLISH bias with a strongly positive score when every real signal is favorable", () => {
  // Inflation's LOW classification only contributes a partial +0.5
  // signal (very low inflation isn't purely bullish — real deflation
  // risk exists), so the all-favorable case tops out below +100.
  const result = analyzeMacroScore(...allBullishInputs());
  assert.equal(result.macroBias, "BULLISH");
  assert.equal(result.macroScore, 93);
});

test("produces a real BEARISH bias with a negative score when every real signal is unfavorable", () => {
  const result = analyzeMacroScore(...allBearishInputs());
  assert.equal(result.macroBias, "BEARISH");
  assert.equal(result.macroScore, -100);
});

test("never a naive average — mixed favorable/unfavorable signals still reflect disclosed per-signal weights", () => {
  const result = analyzeMacroScore(
    { classification: "NORMAL" }, // +25 weight, bullish
    { marketStress: "HIGH" }, // -20 weight, bearish
    { direction: "HOLDING" },
    { classification: "MODERATE" },
    { trend: "STABLE" },
    { liquidityScore: 50 }
  );
  assert.notEqual(result.macroScore, 0);
});

test("renormalizes weights and stays computable when some real signals are unavailable", () => {
  const result = analyzeMacroScore(
    { classification: "UNKNOWN" },
    { marketStress: "UNKNOWN" },
    { direction: "EASING" },
    { classification: "LOW" },
    { trend: "IMPROVING" },
    { liquidityScore: 80 }
  );
  assert.notEqual(result.macroScore, null);
});

test("honestly reports UNKNOWN when every real upstream signal is unavailable", () => {
  const result = analyzeMacroScore(
    { classification: "UNKNOWN" },
    { marketStress: "UNKNOWN" },
    { direction: "UNKNOWN" },
    { classification: "UNKNOWN" },
    { trend: "UNKNOWN" },
    { liquidityScore: null }
  );
  assert.equal(result.macroBias, "UNKNOWN");
  assert.equal(result.macroScore, null);
});
