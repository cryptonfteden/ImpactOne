const test = require("node:test");
const assert = require("node:assert/strict");
const { DEFAULT_DISPLAY_CONFIG } = require("./fibonacciDisplayConfig");

test("the approved default display configuration matches every disclosed setting exactly", () => {
  assert.deepEqual(DEFAULT_DISPLAY_CONFIG, {
    trendLine: "ENABLED",
    extend: "NONE",
    background: "ENABLED",
    reverse: "DISABLED",
    prices: "ENABLED",
    levelsDisplay: "VALUES",
    labelsPosition: "LEFT_TOP",
    textAlignment: "CENTER_MIDDLE",
    fontSize: 12,
    logScale: "DISABLED",
  });
});

test("the default display configuration object is frozen (never mutated at runtime)", () => {
  assert.throws(() => {
    "use strict";
    DEFAULT_DISPLAY_CONFIG.fontSize = 99;
  });
});
