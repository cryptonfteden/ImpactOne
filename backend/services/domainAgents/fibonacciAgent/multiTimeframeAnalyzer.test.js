const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeTimeframeAgreement, directionOf } = require("./multiTimeframeAnalyzer");

function trendSignal(signal, status = "SUFFICIENT") {
  return { signal, enoughDataStatus: status };
}

test("directionOf maps real trend signals to UP/DOWN/null the same way trendContextAnalyzer does", () => {
  assert.equal(directionOf(trendSignal("UPTREND")), "UP");
  assert.equal(directionOf(trendSignal("DOWNTREND")), "DOWN");
  assert.equal(directionOf(trendSignal("MIXED")), null);
  assert.equal(directionOf(null), null);
});

test("analyzeTimeframeAgreement: matching real daily and weekly swing directions => AGREE", () => {
  const result = analyzeTimeframeAgreement({ direction: "UP" }, { direction: "UP" }, null, null);
  assert.equal(result.agreement, "AGREE");
  assert.equal(result.dailyDirection, "UP");
  assert.equal(result.weeklyDirection, "UP");
});

test("analyzeTimeframeAgreement: opposing real daily and weekly swing directions => CONFLICT", () => {
  const result = analyzeTimeframeAgreement({ direction: "UP" }, { direction: "DOWN" }, null, null);
  assert.equal(result.agreement, "CONFLICT");
});

test("analyzeTimeframeAgreement: falls back to real trend signals when no swing was detected on one side", () => {
  const result = analyzeTimeframeAgreement(null, null, trendSignal("UPTREND"), trendSignal("DOWNTREND"));
  assert.equal(result.agreement, "CONFLICT");
  assert.equal(result.dailyDirection, "UP");
  assert.equal(result.weeklyDirection, "DOWN");
});

test("analyzeTimeframeAgreement: honestly reports SINGLE_TIMEFRAME_ONLY when the weekly side has no real, usable direction", () => {
  const result = analyzeTimeframeAgreement({ direction: "UP" }, null, null, null);
  assert.equal(result.agreement, "SINGLE_TIMEFRAME_ONLY");
  assert.equal(result.weeklyDirection, null);
});

test("analyzeTimeframeAgreement: honestly reports UNKNOWN when neither side has a real, usable direction", () => {
  const result = analyzeTimeframeAgreement(null, null, null, null);
  assert.equal(result.agreement, "UNKNOWN");
});
