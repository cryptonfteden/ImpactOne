const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeCoveringActivity } = require("./coveringActivityAnalyzer");

function day(ratio) {
  return { shortVolumeRatio: ratio };
}

test("analyzeCoveringActivity honestly reports UNKNOWN with fewer than 2 real days", () => {
  const result = analyzeCoveringActivity([day(0.3)]);
  assert.equal(result.classification, "UNKNOWN");
});

test("analyzeCoveringActivity: real, consistent day-over-day declines report HIGH covering", () => {
  const result = analyzeCoveringActivity([day(0.5), day(0.4), day(0.3), day(0.2)]);
  assert.equal(result.classification, "HIGH");
  assert.equal(result.decliningDays, 3);
  assert.equal(result.totalComparableDays, 3);
  assert.equal(result.decliningDayRatio, 1);
});

test("analyzeCoveringActivity: real, consistent day-over-day increases report LOW covering", () => {
  const result = analyzeCoveringActivity([day(0.2), day(0.3), day(0.4), day(0.5)]);
  assert.equal(result.classification, "LOW");
  assert.equal(result.decliningDays, 0);
});

test("analyzeCoveringActivity: a real, even split reports MODERATE covering", () => {
  const result = analyzeCoveringActivity([day(0.3), day(0.2), day(0.4)]); // 1 decline, 1 rise = 0.5
  assert.equal(result.decliningDayRatio, 0.5);
  assert.equal(result.classification, "MODERATE");
});
