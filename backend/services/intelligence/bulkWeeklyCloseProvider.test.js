const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeSparkResult, isPotentialWeeklyApproach, toYahooSymbol } = require("./bulkWeeklyCloseProvider");

test("normalizes batched weekly closes back to the official ticker", () => {
  const requested = new Map([["BRK-B", "BRK.B"]]);
  const [symbol, series] = normalizeSparkResult({ symbol: "BRK-B", response: [{ timestamp: [1704067200, 1704672000], indicators: { quote: [{ close: [350, 352] }] } }] }, requested);
  assert.equal(toYahooSymbol("BRK.B"), "BRK-B");
  assert.equal(symbol, "BRK.B");
  assert.equal(series.length, 2);
  assert.equal(series[1].close, 352);
});

test("close-only prefilter keeps a falling pullback near the broad 0.886 region", () => {
  const series = Array.from({ length: 30 }, (_, index) => ({ date: `2026-01-${String(index + 1).padStart(2, "0")}`, close: 100 }));
  series[3].close = 100;
  series[15].close = 200;
  for (let index = 16; index < 29; index += 1) series[index].close = 180 - (index - 16) * 5;
  series[29].close = 116;
  assert.equal(isPotentialWeeklyApproach(series), true);
  series[28].close = 110;
  series[29].close = 120;
  assert.equal(isPotentialWeeklyApproach(series), false);
});
