const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzePriceReactionHistory } = require("./priceReactionHistory");

test("analyzePriceReactionHistory reports null reactionStrength (never 0) for a level that was never really touched", () => {
  const bars = [
    { high: 10, low: 9, close: 9.5 },
    { high: 11, low: 10, close: 10.5 },
    { high: 12, low: 11, close: 11.5 },
    { high: 13, low: 12, close: 12.5 },
  ];
  const [result] = analyzePriceReactionHistory(bars, [{ price: 1000 }], { lookaheadBars: 1 });
  assert.equal(result.touches, 0);
  assert.equal(result.reactionStrength, null);
});

test("analyzePriceReactionHistory counts a real 'respected' touch: price stays on the same side before and after", () => {
  const level = { price: 100 };
  const bars = [
    { high: 90, low: 89, close: 90 }, // before: side -1
    { high: 101, low: 99, close: 99 }, // real touch
    { high: 96, low: 94, close: 95 }, // after (lookaheadBars=1): side -1 => respected
  ];
  const [result] = analyzePriceReactionHistory(bars, [level], { lookaheadBars: 1, toleranceRatio: 0.005 });
  assert.equal(result.touches, 1);
  assert.equal(result.respectedCount, 1);
  assert.equal(result.brokenCount, 0);
  assert.equal(result.reactionStrength, 1);
});

test("analyzePriceReactionHistory counts a real 'broken' touch: price crosses to the other side", () => {
  const level = { price: 100 };
  const bars = [
    { high: 90, low: 89, close: 90 }, // before: side -1
    { high: 101, low: 99, close: 99 }, // real touch
    { high: 96, low: 94, close: 95 }, // filler (no touch)
    { high: 97, low: 93, close: 96 }, // filler (no touch)
    { high: 106, low: 104, close: 105 }, // after (lookaheadBars=3): side +1 => broken
  ];
  const [result] = analyzePriceReactionHistory(bars, [level], { lookaheadBars: 3, toleranceRatio: 0.005 });
  assert.equal(result.touches, 1);
  assert.equal(result.respectedCount, 0);
  assert.equal(result.brokenCount, 1);
  assert.equal(result.reactionStrength, 0);
});

test("analyzePriceReactionHistory returns an entry for every input level, in order, even for a non-finite price", () => {
  const [result] = analyzePriceReactionHistory([{ high: 1, low: 1, close: 1 }], [{ price: null }]);
  assert.equal(result.touches, 0);
  assert.equal(result.reactionStrength, null);
});
