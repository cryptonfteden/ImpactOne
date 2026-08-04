const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateRetracementLevels } = require("./retracementCalculator");
const { SUPPORTED_RETRACEMENT_RATIOS, DEFAULT_ACTIVE_RETRACEMENT_RATIOS } = require("./fibonacciLevelConfig");

test("calculateRetracementLevels returns null when there is no real swing", () => {
  assert.equal(calculateRetracementLevels(null), null);
});

test("calculateRetracementLevels labels UP-swing levels as real support (pullback in a continuation-up bias)", () => {
  const levels = calculateRetracementLevels({ direction: "UP", swingLow: 50, swingHigh: 100 });
  assert.ok(levels.every((level) => level.role === "support"));
});

test("calculateRetracementLevels labels DOWN-swing levels as real resistance (pullback in a continuation-down bias)", () => {
  const levels = calculateRetracementLevels({ direction: "DOWN", swingLow: 50, swingHigh: 100 });
  assert.ok(levels.every((level) => level.role === "resistance"));
});

test("calculateRetracementLevels (Phase FIBONACCI-DEFAULTS-001): by default, only surfaces the approved active ratios (0, 0.886, 1)", () => {
  const levels = calculateRetracementLevels({ direction: "UP", swingLow: 50, swingHigh: 100 });
  const ratios = levels.map((level) => level.ratio).sort((a, b) => a - b);
  assert.deepEqual(ratios, [...DEFAULT_ACTIVE_RETRACEMENT_RATIOS].sort((a, b) => a - b));
  assert.ok(levels.every((level) => level.enabled === true));
});

test("calculateRetracementLevels: every other supported ratio remains implemented, available on request via activeRatios", () => {
  const levels = calculateRetracementLevels({ direction: "UP", swingLow: 50, swingHigh: 100 }, { activeRatios: SUPPORTED_RETRACEMENT_RATIOS });
  const ratios = levels.map((level) => level.ratio).sort((a, b) => a - b);
  assert.deepEqual(ratios, [...SUPPORTED_RETRACEMENT_RATIOS].sort((a, b) => a - b));
});

test("calculateRetracementLevels: the real 0.886 level's price is exactly what the pure Fibonacci math computes", () => {
  const levels = calculateRetracementLevels({ direction: "UP", swingLow: 50, swingHigh: 100 });
  const byRatio = Object.fromEntries(levels.map((level) => [level.ratio, level.price]));
  assert.equal(byRatio[0.886], 100 - 50 * 0.886);
  assert.equal(byRatio[0], 100);
  assert.equal(byRatio[1], 50);
});
