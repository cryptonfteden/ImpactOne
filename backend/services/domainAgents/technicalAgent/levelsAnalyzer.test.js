const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeLevels, currentPriceFrom } = require("./levelsAnalyzer");

function metrics({ lastClose = 100, detail = null, fibLevels = [] } = {}) {
  return {
    signals: {
      trend: { calculationInputs: { lastClose } },
      fibonacciRetracement: { levels: fibLevels },
    },
    supportResistanceDetail: detail,
  };
}

test("currentPriceFrom reads the real last close, or null when unavailable", () => {
  assert.equal(currentPriceFrom({ trend: { calculationInputs: { lastClose: 123.4 } } }), 123.4);
  assert.equal(currentPriceFrom({ trend: { calculationInputs: {} } }), null);
  assert.equal(currentPriceFrom({}), null);
});

test("analyzeLevels splits the 60-day range extremes into resistance (above price) and support (below price)", () => {
  const result = analyzeLevels(metrics({ lastClose: 100, detail: { support: 90, resistance: 110, recentPivotHighs: [], recentPivotLows: [] } }));
  assert.deepEqual(result.resistanceLevels, [{ price: 110, source: "60-day range high" }]);
  assert.deepEqual(result.supportLevels, [{ price: 90, source: "60-day range low" }]);
});

test("analyzeLevels includes recent pivot highs/lows, each labeled with its real source", () => {
  const result = analyzeLevels(
    metrics({ lastClose: 100, detail: { support: 90, resistance: 110, recentPivotHighs: [105, 108], recentPivotLows: [92, 95] } })
  );
  assert.ok(result.resistanceLevels.some((l) => l.price === 105 && l.source === "recent pivot high"));
  assert.ok(result.supportLevels.some((l) => l.price === 95 && l.source === "recent pivot low"));
});

test("analyzeLevels splits real Fibonacci levels by whether they sit above or below current price", () => {
  const result = analyzeLevels(
    metrics({ lastClose: 100, fibLevels: [{ ratio: 0.382, price: 120 }, { ratio: 0.618, price: 80 }] })
  );
  assert.ok(result.resistanceLevels.some((l) => l.price === 120 && l.source === "Fibonacci 0.382 retracement"));
  assert.ok(result.supportLevels.some((l) => l.price === 80 && l.source === "Fibonacci 0.618 retracement"));
});

test("analyzeLevels resistance is sorted ascending (nearest first) and support descending (nearest first)", () => {
  const result = analyzeLevels(
    metrics({ lastClose: 100, detail: { support: 70, resistance: 130, recentPivotHighs: [110, 120], recentPivotLows: [80, 90] } })
  );
  assert.deepEqual(result.resistanceLevels.map((l) => l.price), [110, 120, 130]);
  assert.deepEqual(result.supportLevels.map((l) => l.price), [90, 80, 70]);
});

test("analyzeLevels de-duplicates levels that round to the same price", () => {
  const result = analyzeLevels(
    metrics({ lastClose: 100, detail: { support: 90, resistance: 110.001, recentPivotHighs: [110.002], recentPivotLows: [] } })
  );
  assert.equal(result.resistanceLevels.length, 1);
});

test("analyzeLevels never invents a level: without any real detail/fib data, both arrays are empty", () => {
  const result = analyzeLevels(metrics({ lastClose: 100 }));
  assert.deepEqual(result.supportLevels, []);
  assert.deepEqual(result.resistanceLevels, []);
});
