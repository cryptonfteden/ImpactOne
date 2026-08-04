const test = require("node:test");
const assert = require("node:assert/strict");
const { fetchFredSeries, emptySeriesMetrics } = require("./fredSeriesProvider");

test("emptySeriesMetrics honestly reports dataAvailable: false with the given reason, never fabricated values", () => {
  const metrics = emptySeriesMetrics("FEDFUNDS", "no data");
  assert.equal(metrics.dataAvailable, false);
  assert.equal(metrics.unavailableReason, "no data");
  assert.equal(metrics.latest, null);
  assert.deepEqual(metrics.observations, []);
});

test("fetchFredSeries: parses a real successful response and computes a real YoY change", async () => {
  const originalGet = require("axios").get;
  require("axios").get = () =>
    Promise.resolve({
      data: "observation_date,FEDFUNDS\n2025-06-01,4.33\n2026-06-01,3.63\n",
    });
  try {
    const metrics = await fetchFredSeries("FEDFUNDS");
    assert.equal(metrics.dataAvailable, true);
    assert.equal(metrics.latest.value, 3.63);
    assert.equal(metrics.priorYearAgo.value, 4.33);
    assert.ok(metrics.changeYoY < 0, "a rate cut should be a negative YoY change");
  } finally {
    require("axios").get = originalGet;
  }
});

test("fetchFredSeries: honestly reports unavailable on a real network failure, never a fabricated fallback", async () => {
  const originalGet = require("axios").get;
  require("axios").get = () => Promise.reject(new Error("simulated timeout"));
  try {
    const metrics = await fetchFredSeries("FEDFUNDS");
    assert.equal(metrics.dataAvailable, false);
    assert.match(metrics.unavailableReason, /FRED request failed/);
  } finally {
    require("axios").get = originalGet;
  }
});

test("fetchFredSeries: honestly reports unavailable when every real observation is missing", async () => {
  const originalGet = require("axios").get;
  require("axios").get = () => Promise.resolve({ data: "observation_date,FEDFUNDS\n2026-06-01,.\n" });
  try {
    const metrics = await fetchFredSeries("FEDFUNDS");
    assert.equal(metrics.dataAvailable, false);
    assert.match(metrics.unavailableReason, /no real usable observations/);
  } finally {
    require("axios").get = originalGet;
  }
});

test("fetchFredSeries: changeYoY is null when no real year-ago observation is within tolerance", async () => {
  const originalGet = require("axios").get;
  require("axios").get = () => Promise.resolve({ data: "observation_date,FEDFUNDS\n2026-06-01,3.63\n" });
  try {
    const metrics = await fetchFredSeries("FEDFUNDS");
    assert.equal(metrics.dataAvailable, true);
    assert.equal(metrics.priorYearAgo, null);
    assert.equal(metrics.changeYoY, null);
  } finally {
    require("axios").get = originalGet;
  }
});
