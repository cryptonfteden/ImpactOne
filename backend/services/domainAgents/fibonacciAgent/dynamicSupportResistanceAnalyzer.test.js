const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeDynamicLevels } = require("./dynamicSupportResistanceAnalyzer");

test("analyzeDynamicLevels returns an empty array with too few real bars, never invents a level", () => {
  assert.deepEqual(analyzeDynamicLevels([{ high: 1, low: 1 }], 60), []);
});

test("analyzeDynamicLevels surfaces the real range high/low labeled with their real source", () => {
  const bars = Array.from({ length: 10 }, (_, i) => ({ high: 100 + i, low: 90 + i }));
  const levels = analyzeDynamicLevels(bars, 10);
  assert.ok(levels.some((level) => level.price === 109 && level.source === "10-day range high"));
  assert.ok(levels.some((level) => level.price === 90 && level.source === "10-day range low"));
});
