const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeSectorRotation } = require("./sectorRotationAnalyzer");

function bars(closes) {
  return closes.map((close) => ({ close, volume: 1000 }));
}

test("analyzeSectorRotation honestly reports UNKNOWN with no real ETF monthly flow or no real market bars", () => {
  assert.deepEqual(analyzeSectorRotation(null, bars([100, 101])), { classification: "UNKNOWN", relativeStrengthPercent: null });
  assert.deepEqual(analyzeSectorRotation({ priceChangePercent: 5 }, []), { classification: "UNKNOWN", relativeStrengthPercent: null });
});

test("analyzeSectorRotation: real ETF outperformance beyond the disclosed threshold reports ROTATING_IN", () => {
  const marketBars = Array.from({ length: 22 }, () => ({ close: 100, volume: 1000 })); // prior close + 21 flat sessions
  const result = analyzeSectorRotation({ priceChangePercent: 10 }, marketBars);
  assert.equal(result.classification, "ROTATING_IN");
  assert.equal(result.relativeStrengthPercent, 10);
});

test("analyzeSectorRotation: real ETF underperformance beyond the disclosed threshold reports ROTATING_OUT", () => {
  const marketBars = Array.from({ length: 22 }, () => ({ close: 100, volume: 1000 }));
  const result = analyzeSectorRotation({ priceChangePercent: -10 }, marketBars);
  assert.equal(result.classification, "ROTATING_OUT");
});

test("analyzeSectorRotation: real relative performance within the disclosed threshold reports NEUTRAL", () => {
  const marketBars = Array.from({ length: 22 }, () => ({ close: 100, volume: 1000 }));
  const result = analyzeSectorRotation({ priceChangePercent: 1 }, marketBars);
  assert.equal(result.classification, "NEUTRAL");
});
