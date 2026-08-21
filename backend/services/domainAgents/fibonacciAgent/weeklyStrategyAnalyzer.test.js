const test = require("node:test");
const assert = require("node:assert/strict");
const { completedWeeklyBars, analyzeWeeklyBars } = require("./weeklyStrategyAnalyzer");
const { isoWeekKey } = require("./weeklyBarAggregator");

function weeklyBars(lastClose = 115) {
  const start = new Date("2025-01-03T00:00:00Z");
  const closes = [112, 104, 100, 116, 130, 145, 160, 178, 192, 200, 190, 178, 166, 152, 140, 130, 122, 118, 116, 115, 114, lastClose];
  return closes.map((close, index) => {
    const date = new Date(start.getTime() + index * 7 * 86400000).toISOString().slice(0, 10);
    return {
      date,
      weekKey: isoWeekKey(date),
      open: index ? closes[index - 1] : close,
      high: index === 9 ? 200 : close + 2,
      low: index === 2 ? 100 : close - 2,
      close,
      volume: 1000 + index,
    };
  });
}

test("weekly strategy opens an alert only from completed weekly candles inside the 0-5% zone", () => {
  const setup = analyzeWeeklyBars("TEST", weeklyBars(113), { now: new Date("2025-06-01T12:00:00Z") });
  assert.equal(setup.dataAvailable, true);
  assert.equal(setup.signalEligible, true);
  assert.equal(setup.candleTimeframe, "1W");
  assert.equal(setup.candleState, "COMPLETED_ONLY");
  assert.equal(setup.targetPrice, 111.4);
  assert.ok(setup.distancePct > 0 && setup.distancePct <= 5);
});

test("a setup moving away from 0.886 is review-only even while inside the numeric zone", () => {
  const setup = analyzeWeeklyBars("TEST", weeklyBars(115), { now: new Date("2025-06-01T12:00:00Z") });
  assert.equal(setup.inApproachZone, true);
  assert.equal(setup.movingTowardTarget, false);
  assert.equal(setup.signalEligible, false);
  assert.ok(setup.strategyWarnings.some((item) => item.includes("not moving down")));
});

test("a prior weekly close below 0.886 cannot be approved after recovering into the zone", () => {
  const bars = weeklyBars(113);
  bars[19] = { ...bars[19], open: 110, high: 112, low: 106, close: 108 };
  const setup = analyzeWeeklyBars("TEST", bars, { now: new Date("2025-06-01T12:00:00Z") });
  assert.equal(setup.inApproachZone, true);
  assert.equal(setup.crossedTargetBeforeLatest, true);
  assert.equal(setup.signalEligible, false);
  assert.ok(setup.strategyWarnings.some((item) => item.includes("crossed below")));
});

test("an active weekly candle is excluded until the week is complete", () => {
  const bars = weeklyBars(115);
  bars.push({ date: "2025-06-05", weekKey: isoWeekKey("2025-06-05"), open: 115, high: 160, low: 80, close: 150, volume: 5000 });
  const closed = completedWeeklyBars(bars, new Date("2025-06-05T12:00:00Z"));
  assert.equal(closed.length, bars.length - 1);
  assert.notEqual(closed.at(-1).date, "2025-06-05");
});

test("a price below the 0.886 point does not create a late entry alert", () => {
  const setup = analyzeWeeklyBars("TEST", weeklyBars(108), { now: new Date("2025-06-01T12:00:00Z") });
  assert.equal(setup.dataAvailable, true);
  assert.equal(setup.signalEligible, false);
  assert.ok(setup.distancePct < 0);
});
