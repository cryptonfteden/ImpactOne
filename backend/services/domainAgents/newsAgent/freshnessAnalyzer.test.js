const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeFreshness } = require("./freshnessAnalyzer");

test("scores 100 for a real article within 6 hours (breaking)", () => {
  const now = new Date("2026-07-30T12:00:00Z");
  const result = analyzeFreshness([{ publishedAt: "2026-07-30T08:00:00Z" }], now);
  assert.equal(result.freshnessScore, 100);
  assert.equal(result.isBreaking, true);
});

test("scores 80 for a real article within 24 hours but past 6", () => {
  const now = new Date("2026-07-30T12:00:00Z");
  const result = analyzeFreshness([{ publishedAt: "2026-07-29T20:00:00Z" }], now);
  assert.equal(result.freshnessScore, 80);
  assert.equal(result.isBreaking, false);
});

test("scores the stale floor for a real article older than a week", () => {
  const now = new Date("2026-07-30T12:00:00Z");
  const result = analyzeFreshness([{ publishedAt: "2026-07-01T12:00:00Z" }], now);
  assert.equal(result.freshnessScore, 10);
});

test("uses the real most-recent article among several", () => {
  const now = new Date("2026-07-30T12:00:00Z");
  const result = analyzeFreshness(
    [{ publishedAt: "2026-07-01T12:00:00Z" }, { publishedAt: "2026-07-30T10:00:00Z" }],
    now
  );
  assert.equal(result.freshnessScore, 100);
});

test("honestly scores 0 with no real articles", () => {
  const result = analyzeFreshness([]);
  assert.equal(result.freshnessScore, 0);
  assert.equal(result.hoursSinceLatest, null);
});
