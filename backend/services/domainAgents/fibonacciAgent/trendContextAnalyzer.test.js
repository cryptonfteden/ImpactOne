const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeTrendContext } = require("./trendContextAnalyzer");

test("analyzeTrendContext: UPTREND / ABOVE_50D_AVERAGE map to BULLISH", () => {
  assert.equal(analyzeTrendContext({ signal: "UPTREND", enoughDataStatus: "SUFFICIENT" }), "BULLISH");
  assert.equal(analyzeTrendContext({ signal: "ABOVE_50D_AVERAGE", enoughDataStatus: "SUFFICIENT" }), "BULLISH");
});

test("analyzeTrendContext: DOWNTREND / BELOW_50D_AVERAGE map to BEARISH", () => {
  assert.equal(analyzeTrendContext({ signal: "DOWNTREND", enoughDataStatus: "SUFFICIENT" }), "BEARISH");
  assert.equal(analyzeTrendContext({ signal: "BELOW_50D_AVERAGE", enoughDataStatus: "SUFFICIENT" }), "BEARISH");
});

test("analyzeTrendContext: MIXED maps to NEUTRAL, honestly (no undivided lean)", () => {
  assert.equal(analyzeTrendContext({ signal: "MIXED", enoughDataStatus: "SUFFICIENT" }), "NEUTRAL");
});

test("analyzeTrendContext: insufficient data or missing signal maps to NEUTRAL", () => {
  assert.equal(analyzeTrendContext({ signal: "UPTREND", enoughDataStatus: "INSUFFICIENT" }), "NEUTRAL");
  assert.equal(analyzeTrendContext(null), "NEUTRAL");
});
