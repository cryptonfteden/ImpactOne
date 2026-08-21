const test = require("node:test");
const assert = require("node:assert/strict");
const { computeFlowProxy, computeDailyWeeklyMonthlyFlows } = require("./flowProxyCalculator");

function bar(close, volume) {
  return { close, volume };
}

test("computeFlowProxy honestly returns null with fewer real bars than the window needs", () => {
  assert.equal(computeFlowProxy([bar(100, 10)], 5), null);
});

test("computeFlowProxy computes real dollar volume and INFLOW direction for a genuine price rise", () => {
  const bars = [bar(99, 1000), bar(100, 1000), bar(101, 1000), bar(105, 1000)];
  const result = computeFlowProxy(bars, 3);
  assert.equal(result.direction, "INFLOW");
  assert.equal(result.dollarVolume, 100 * 1000 + 101 * 1000 + 105 * 1000);
  assert.ok(result.signedProxyValue > 0);
});

test("computeFlowProxy computes real OUTFLOW direction for a genuine price fall", () => {
  const bars = [bar(106, 1000), bar(105, 1000), bar(101, 1000), bar(100, 1000)];
  const result = computeFlowProxy(bars, 3);
  assert.equal(result.direction, "OUTFLOW");
  assert.ok(result.signedProxyValue < 0);
});

test("computeFlowProxy reports FLAT within the disclosed threshold, with a real zero signed value", () => {
  const bars = [bar(100, 1000), bar(100, 1000), bar(100, 1000), bar(100.01, 1000)];
  const result = computeFlowProxy(bars, 3);
  assert.equal(result.direction, "FLAT");
  assert.equal(result.signedProxyValue, 0);
});

test("computeFlowProxy only uses the most recent real window, ignoring older bars", () => {
  const bars = [bar(999, 999999), bar(98, 999999), bar(100, 1000), bar(105, 1000)];
  const result = computeFlowProxy(bars, 2);
  assert.equal(result.dollarVolume, 100 * 1000 + 105 * 1000);
});

test("computeDailyWeeklyMonthlyFlows requires a prior close for the daily return", () => {
  const bars = [bar(100, 1000)];
  const flows = computeDailyWeeklyMonthlyFlows(bars);
  assert.equal(flows.daily, null);
  assert.equal(flows.weekly, null);
  assert.equal(flows.monthly, null);
});

test("computeDailyWeeklyMonthlyFlows computes all three real windows when enough real bars exist", () => {
  const bars = Array.from({ length: 25 }, (_, i) => bar(100 + i, 1000));
  const flows = computeDailyWeeklyMonthlyFlows(bars);
  assert.ok(flows.daily);
  assert.ok(flows.weekly);
  assert.ok(flows.monthly);
});

test("daily direction compares today's close with the previous close instead of comparing the bar with itself", () => {
  const flows = computeDailyWeeklyMonthlyFlows([bar(100, 1000), bar(102, 2000)]);
  assert.equal(flows.daily.direction, "INFLOW");
  assert.equal(flows.daily.priceChangePercent, 2);
  assert.equal(flows.daily.dollarVolume, 102 * 2000);
});
