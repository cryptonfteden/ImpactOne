const test = require("node:test");
const assert = require("node:assert/strict");
const { detectPrimarySwing } = require("./swingDetector");

function bar(date, high, low) {
  return { date, high, low, open: (high + low) / 2, close: (high + low) / 2, volume: 1000 };
}

test("detectPrimarySwing returns null with too few bars", () => {
  assert.equal(detectPrimarySwing([bar("2026-01-01", 10, 9)]), null);
});

test("detectPrimarySwing detects a real UP swing when the low occurs before the high", () => {
  const bars = [
    bar("2026-01-01", 100, 95),
    bar("2026-01-02", 98, 90), // real lowest low
    bar("2026-01-03", 105, 100),
    bar("2026-01-04", 130, 120), // real highest high
    bar("2026-01-05", 125, 118),
    bar("2026-01-06", 122, 115),
    bar("2026-01-07", 128, 119),
    bar("2026-01-08", 126, 117),
    bar("2026-01-09", 124, 116),
    bar("2026-01-10", 123, 114),
  ];
  const swing = detectPrimarySwing(bars, 90);
  assert.equal(swing.direction, "UP");
  assert.equal(swing.swingLow, 90);
  assert.equal(swing.swingHigh, 130);
  assert.equal(swing.swingLowDate, "2026-01-02");
  assert.equal(swing.swingHighDate, "2026-01-04");
});

test("detectPrimarySwing detects a real DOWN swing when the high occurs before the low", () => {
  const bars = [
    bar("2026-01-01", 100, 95),
    bar("2026-01-02", 130, 120), // real highest high, occurs first
    bar("2026-01-03", 105, 100),
    bar("2026-01-04", 98, 90), // real lowest low, occurs after
    bar("2026-01-05", 100, 95),
    bar("2026-01-06", 102, 96),
    bar("2026-01-07", 101, 94),
    bar("2026-01-08", 103, 97),
    bar("2026-01-09", 104, 98),
    bar("2026-01-10", 105, 99),
  ];
  const swing = detectPrimarySwing(bars, 90);
  assert.equal(swing.direction, "DOWN");
  assert.equal(swing.swingLow, 90);
  assert.equal(swing.swingHigh, 130);
});

test("detectPrimarySwing only considers the real lookback window, ignoring older bars", () => {
  const oldExtreme = [bar("2025-01-01", 500, 400)]; // far outside the lookback
  const recentBars = Array.from({ length: 15 }, (_, i) => bar(`2026-02-${String(i + 1).padStart(2, "0")}`, 110 + i, 100 + i));
  const bars = [...oldExtreme, ...recentBars];
  const swing = detectPrimarySwing(bars, 15);
  assert.ok(swing.swingHigh < 500, "the far-outside-lookback extreme must never leak into the primary swing");
});

test("detectPrimarySwing returns null when the highest high and lowest low are the same real bar (no distinct swing)", () => {
  const bars = Array.from({ length: 10 }, (_, i) => bar(`2026-01-${String(i + 1).padStart(2, "0")}`, 100, 100));
  assert.equal(detectPrimarySwing(bars), null);
});
