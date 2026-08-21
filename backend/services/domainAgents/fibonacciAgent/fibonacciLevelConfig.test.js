const test = require("node:test");
const assert = require("node:assert/strict");
const { SUPPORTED_RETRACEMENT_RATIOS, DEFAULT_ACTIVE_RETRACEMENT_RATIOS, isRatioActiveByDefault } = require("./fibonacciLevelConfig");
const { IMPACTONE_FIBONACCI_PROFILE } = require("./impactOneFibonacciProfile");

test("the strategy approach zone is exactly 0% through 5% above 0.886", () => {
  assert.deepEqual(IMPACTONE_FIBONACCI_PROFILE.entryZone, {
    targetRatio: 0.886,
    minDistancePct: 0,
    maxDistancePct: 5,
    approachDirection: "FROM_ABOVE",
  });
});

test("the approved default active ratios are exactly 0, 0.886, 1", () => {
  assert.deepEqual([...DEFAULT_ACTIVE_RETRACEMENT_RATIOS].sort((a, b) => a - b), [0, 0.886, 1]);
});

test("every default active ratio is a real supported ratio (never an invented one)", () => {
  for (const ratio of DEFAULT_ACTIVE_RETRACEMENT_RATIOS) {
    assert.ok(SUPPORTED_RETRACEMENT_RATIOS.includes(ratio), `${ratio} must be one of the supported ratios`);
  }
});

test("isRatioActiveByDefault: true only for the approved default-active ratios", () => {
  assert.equal(isRatioActiveByDefault(0), true);
  assert.equal(isRatioActiveByDefault(0.886), true);
  assert.equal(isRatioActiveByDefault(1), true);
});

test("isRatioActiveByDefault: false for every other supported ratio (implemented, but disabled by default)", () => {
  const disabledByDefault = SUPPORTED_RETRACEMENT_RATIOS.filter((ratio) => !DEFAULT_ACTIVE_RETRACEMENT_RATIOS.includes(ratio));
  assert.ok(disabledByDefault.length > 0);
  for (const ratio of disabledByDefault) {
    assert.equal(isRatioActiveByDefault(ratio), false);
  }
});
