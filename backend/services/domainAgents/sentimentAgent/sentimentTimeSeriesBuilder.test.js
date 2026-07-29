const test = require("node:test");
const assert = require("node:assert/strict");
const { buildDailySeries } = require("./sentimentTimeSeriesBuilder");

const asOf = new Date("2026-03-10T12:00:00Z");

test("buildDailySeries returns one real entry per real calendar day in the window, oldest first", () => {
  const series = buildDailySeries([], { lookbackDays: 5, asOf });
  assert.equal(series.length, 5);
  assert.equal(series[series.length - 1].date, "2026-03-10");
  assert.equal(series[0].date, "2026-03-06");
});

test("buildDailySeries honestly reports articleCount: 0 and averageScore: null for a real day with no articles", () => {
  const series = buildDailySeries([], { lookbackDays: 3, asOf });
  for (const day of series) {
    assert.equal(day.articleCount, 0);
    assert.equal(day.averageScore, null);
  }
});

test("buildDailySeries buckets real articles by their real publishedAt date and averages their real scores", () => {
  const articles = [
    { publishedAt: "2026-03-10T08:00:00Z", score: 0.5 },
    { publishedAt: "2026-03-10T20:00:00Z", score: -0.1 },
    { publishedAt: "2026-03-09T00:00:00Z", score: 0.2 },
  ];
  const series = buildDailySeries(articles, { lookbackDays: 3, asOf });
  const march10 = series.find((day) => day.date === "2026-03-10");
  const march9 = series.find((day) => day.date === "2026-03-09");
  assert.equal(march10.articleCount, 2);
  assert.equal(march10.averageScore, (0.5 - 0.1) / 2);
  assert.equal(march9.articleCount, 1);
  assert.equal(march9.averageScore, 0.2);
});

test("buildDailySeries ignores articles with no real publishedAt, never crashing", () => {
  const series = buildDailySeries([{ score: 0.5 }], { lookbackDays: 3, asOf });
  assert.ok(series.every((day) => day.articleCount === 0));
});
