const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateRetracementLevels } = require("./retracementCalculator");

test("calculateRetracementLevels returns null when there is no real swing", () => {
  assert.equal(calculateRetracementLevels(null), null);
});

test("calculateRetracementLevels labels UP-swing levels as real support (pullback in a continuation-up bias)", () => {
  const levels = calculateRetracementLevels({ direction: "UP", swingLow: 50, swingHigh: 100 });
  assert.ok(levels.every((level) => level.role === "support"));
  const byRatio = Object.fromEntries(levels.map((level) => [level.ratio, level.price]));
  assert.equal(byRatio[0.5], 75);
});

test("calculateRetracementLevels labels DOWN-swing levels as real resistance (pullback in a continuation-down bias)", () => {
  const levels = calculateRetracementLevels({ direction: "DOWN", swingLow: 50, swingHigh: 100 });
  assert.ok(levels.every((level) => level.role === "resistance"));
});
