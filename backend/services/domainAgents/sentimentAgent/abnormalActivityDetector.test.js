const test = require("node:test");
const assert = require("node:assert/strict");
const { detectAbnormalActivity } = require("./abnormalActivityDetector");

function day(date, articleCount, averageScore = 0) {
  return { date, articleCount, averageScore };
}

test("detectAbnormalActivity reports no activity for a real, uniform baseline series", () => {
  const series = [day("2026-01-01", 5, 0.1), day("2026-01-02", 5, 0.1), day("2026-01-03", 5, 0.1), day("2026-01-04", 5, 0.1)];
  const result = detectAbnormalActivity(series);
  assert.deepEqual(result.volumeSpikes, []);
  assert.deepEqual(result.sentimentShifts, []);
  assert.equal(result.hasAbnormalActivity, false);
});

test("detectAbnormalActivity flags a real day whose article count is a genuine statistical outlier", () => {
  const series = [day("2026-01-01", 2), day("2026-01-02", 2), day("2026-01-03", 2), day("2026-01-04", 2), day("2026-01-05", 50)];
  const result = detectAbnormalActivity(series);
  assert.equal(result.volumeSpikes.length, 1);
  assert.equal(result.volumeSpikes[0].date, "2026-01-05");
  assert.ok(result.volumeSpikes[0].zScore >= 2);
  assert.equal(result.hasAbnormalActivity, true);
});

test("detectAbnormalActivity flags a real, large day-over-day sentiment swing as a shift", () => {
  const series = [day("2026-01-01", 3, -0.9), day("2026-01-02", 3, 0.9)];
  const result = detectAbnormalActivity(series);
  assert.equal(result.sentimentShifts.length, 1);
  assert.equal(result.sentimentShifts[0].date, "2026-01-02");
  assert.ok(Math.abs(result.sentimentShifts[0].delta) > 30);
});

test("detectAbnormalActivity does not flag a real, small day-over-day sentiment move", () => {
  const series = [day("2026-01-01", 3, 0.1), day("2026-01-02", 3, 0.15)];
  const result = detectAbnormalActivity(series);
  assert.deepEqual(result.sentimentShifts, []);
});

test("detectAbnormalActivity handles a zero-variance (all-identical) real series without dividing by zero", () => {
  const series = [day("2026-01-01", 0), day("2026-01-02", 0), day("2026-01-03", 0)];
  assert.doesNotThrow(() => detectAbnormalActivity(series));
  assert.deepEqual(detectAbnormalActivity(series).volumeSpikes, []);
});
