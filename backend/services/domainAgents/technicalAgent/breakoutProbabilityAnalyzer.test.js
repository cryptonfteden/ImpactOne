const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeBreakoutProbability } = require("./breakoutProbabilityAnalyzer");

function metricsWithBreakout(signal, calculationInputs = {}, { status = "SUFFICIENT", volumeTrend = null } = {}) {
  return {
    signals: { breakout: { signal, enoughDataStatus: status, calculationInputs } },
    volumeTrend,
  };
}

test("analyzeBreakoutProbability: insufficient data or UNKNOWN signal reports null, honestly", () => {
  assert.equal(analyzeBreakoutProbability(metricsWithBreakout("UNKNOWN")).probability, null);
  assert.equal(analyzeBreakoutProbability(metricsWithBreakout("BREAKOUT_UP_CONFIRMED", {}, { status: "INSUFFICIENT" })).probability, null);
});

test("analyzeBreakoutProbability: a volume-confirmed breakout scores high (85)", () => {
  const result = analyzeBreakoutProbability(metricsWithBreakout("BREAKOUT_UP_CONFIRMED"));
  assert.equal(result.probability, 85);
});

test("analyzeBreakoutProbability: an unconfirmed breakout scores moderate (55)", () => {
  const result = analyzeBreakoutProbability(metricsWithBreakout("BREAKOUT_UP_UNCONFIRMED"));
  assert.equal(result.probability, 55);
});

test("analyzeBreakoutProbability: a failed breakout scores low (20)", () => {
  const result = analyzeBreakoutProbability(metricsWithBreakout("FAILED_BREAKOUT"));
  assert.equal(result.probability, 20);
});

test("analyzeBreakoutProbability: NO_BREAKOUT right at the resistance extreme scores near the top of the proximity range", () => {
  const metrics = metricsWithBreakout("NO_BREAKOUT", { priorHigh: 110, priorLow: 90, lastClose: 110 });
  const result = analyzeBreakoutProbability(metrics, null);
  assert.equal(result.probability, 60); // 20 + 1.0 * 40
});

test("analyzeBreakoutProbability: NO_BREAKOUT dead center of the range scores the proximity floor", () => {
  const metrics = metricsWithBreakout("NO_BREAKOUT", { priorHigh: 110, priorLow: 90, lastClose: 100 });
  const result = analyzeBreakoutProbability(metrics, null);
  assert.equal(result.probability, 20);
});

test("analyzeBreakoutProbability: real rising volume and real strong ADX each add a disclosed bonus", () => {
  const metrics = metricsWithBreakout("NO_BREAKOUT", { priorHigh: 110, priorLow: 90, lastClose: 100 }, { volumeTrend: { percentChange: 30 } });
  const result = analyzeBreakoutProbability(metrics, 30);
  assert.equal(result.probability, 40); // 20 base + 10 (volume) + 10 (adx)
});

test("analyzeBreakoutProbability: never exceeds 100 even when every bonus applies at an extreme", () => {
  const metrics = metricsWithBreakout("NO_BREAKOUT", { priorHigh: 110, priorLow: 90, lastClose: 110 }, { volumeTrend: { percentChange: 50 } });
  const result = analyzeBreakoutProbability(metrics, 60);
  assert.ok(result.probability <= 100);
});

test("analyzeBreakoutProbability: an invalid/zero range honestly reports null rather than dividing by zero", () => {
  const metrics = metricsWithBreakout("NO_BREAKOUT", { priorHigh: 100, priorLow: 100, lastClose: 100 });
  const result = analyzeBreakoutProbability(metrics, null);
  assert.equal(result.probability, null);
});
