const test = require("node:test");
const assert = require("node:assert/strict");
const { combineImpliedPrices, computeDiscountToFairValue } = require("./fairValueComposer");

test("combineImpliedPrices with zero contributing (weight-0) methods returns null, never a fabricated estimate", () => {
  const result = combineImpliedPrices([{ method: "PE", impliedPrice: 100 }], { PE: 0 });
  assert.equal(result.fairValueEstimate, null);
  assert.equal(result.fairValueRange, null);
  assert.deepEqual(result.contributingMethods, []);
});

test("a single contributing method's fair value equals its own implied price", () => {
  const result = combineImpliedPrices([{ method: "PE", impliedPrice: 100 }], { PE: 1 });
  assert.equal(result.fairValueEstimate, 100);
  assert.deepEqual(result.fairValueRange, { low: 100, high: 100 });
});

test("equal-weight methods produce a real, simple average", () => {
  const result = combineImpliedPrices(
    [
      { method: "PE", impliedPrice: 100 },
      { method: "PS", impliedPrice: 120 },
    ],
    { PE: 1, PS: 1 }
  );
  assert.equal(result.fairValueEstimate, 110);
});

test("unequal weights produce a real weighted average, not a simple mean", () => {
  const result = combineImpliedPrices(
    [
      { method: "PE", impliedPrice: 100 },
      { method: "PS", impliedPrice: 200 },
    ],
    { PE: 3, PS: 1 }
  );
  assert.equal(result.fairValueEstimate, (100 * 3 + 200 * 1) / 4);
});

test("fairValueRange spans the real min/max of the contributing implied prices", () => {
  const result = combineImpliedPrices(
    [
      { method: "PE", impliedPrice: 80 },
      { method: "PS", impliedPrice: 150 },
      { method: "PB", impliedPrice: 110 },
    ],
    { PE: 1, PS: 1, PB: 1 }
  );
  assert.deepEqual(result.fairValueRange, { low: 80, high: 150 });
});

test("a method present in impliedPrices but absent from the weight table is excluded from the composite entirely", () => {
  const result = combineImpliedPrices(
    [
      { method: "PE", impliedPrice: 100 },
      { method: "UNKNOWN_METHOD", impliedPrice: 999 },
    ],
    { PE: 1 }
  );
  assert.equal(result.fairValueEstimate, 100);
  assert.equal(result.contributingMethods.length, 1);
});

test("computeDiscountToFairValue: a price below fair value is a positive (undervalued) discount", () => {
  assert.equal(computeDiscountToFairValue(100, 80), 0.2);
});

test("computeDiscountToFairValue: a price above fair value is a negative (overvalued) discount", () => {
  assert.equal(computeDiscountToFairValue(100, 120), -0.2);
});

test("computeDiscountToFairValue returns null for a null/non-positive fair value or a missing price, never a division-by-zero artifact", () => {
  assert.equal(computeDiscountToFairValue(null, 100), null);
  assert.equal(computeDiscountToFairValue(0, 100), null);
  assert.equal(computeDiscountToFairValue(100, null), null);
});
