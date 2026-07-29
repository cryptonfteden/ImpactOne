const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateExtensionTargets } = require("./extensionCalculator");

test("calculateExtensionTargets returns null when there is no real swing", () => {
  assert.equal(calculateExtensionTargets(null), null);
});

test("calculateExtensionTargets projects real targets beyond the swing high for an UP swing", () => {
  const targets = calculateExtensionTargets({ direction: "UP", swingLow: 50, swingHigh: 100 });
  assert.ok(targets.every((target) => target.price > 100));
});

test("calculateExtensionTargets projects real targets beyond the swing low for a DOWN swing", () => {
  const targets = calculateExtensionTargets({ direction: "DOWN", swingLow: 50, swingHigh: 100 });
  assert.ok(targets.every((target) => target.price < 50));
});
