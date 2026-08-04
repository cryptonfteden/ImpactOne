const test = require("node:test");
const assert = require("node:assert/strict");
const { generateReport } = require("./sentimentAgent");
const canonicalVerdict = require("../../canonicalVerdict");
const { scoreArticles } = require("./articleSentimentScorer");

function daysAgo(now, n) {
  return new Date(now.getTime() - n * 86400000).toISOString();
}

function fakeProvider(metrics) {
  return { getSymbolSentimentData: async () => metrics };
}

test("generateReport: unavailable data produces an honest, fully-populated unavailable report (never partial/fabricated)", async () => {
  const metrics = { symbol: "NOPE", asOf: "2026-07-27T00:00:00.000Z", dataAvailable: false, unavailableReason: "No NEWS_API_KEY configured." };
  const report = await generateReport("NOPE", { provider: fakeProvider(metrics) });
  assert.equal(report.dataAvailable, false);
  assert.equal(report.sentimentState, "NEUTRAL");
  assert.equal(report.confidence.confidence, 0);
  assert.deepEqual(report.bullishFactors, []);
  assert.ok(typeof report.aiSummary === "string" && report.aiSummary.length > 0);
});

test("generateReport: composes every mission-required output field from real, available data (real positive-leaning articles)", async () => {
  const now = new Date();
  const rawArticles = [
    { title: "Company beats earnings, stock surges to record high", description: "Strong growth reported.", source: "Reuters", publishedAt: daysAgo(now, 1), url: "https://x/1" },
    { title: "Analysts upgrade stock after rally", description: "Bullish outlook.", source: "Bloomberg", publishedAt: daysAgo(now, 2), url: "https://x/2" },
  ];
  const priceBars = Array.from({ length: 14 }, (_, i) => ({
    date: daysAgo(now, 13 - i).slice(0, 10),
    open: 100 + i,
    high: 101 + i,
    low: 99 + i,
    close: 100 + i,
    volume: 1000,
  }));
  const metrics = {
    symbol: "FAKE",
    asOf: now.toISOString(),
    dataAvailable: true,
    unavailableReason: null,
    articles: scoreArticles(rawArticles),
    socialAvailable: false,
    socialUnavailableReason: "no real social source",
    priceBars,
    lookbackDays: 14,
  };

  const report = await generateReport("FAKE", { provider: fakeProvider(metrics) });

  assert.equal(report.symbol, "FAKE");
  assert.equal(report.dataAvailable, true);
  assert.ok(["POSITIVE", "NEUTRAL", "NEGATIVE"].includes(report.sentimentState));
  assert.ok(["IMPROVING", "STABLE", "DETERIORATING"].includes(report.sentimentTrend));
  assert.ok(Number.isFinite(report.sentimentScore));
  assert.ok("value" in report.sentimentVelocity);
  assert.ok(Number.isFinite(report.sourceQuality.credibilityScore));
  assert.ok(Array.isArray(report.abnormalActivity.volumeSpikes));
  assert.ok(Array.isArray(report.bullishFactors));
  assert.ok(Array.isArray(report.bearishFactors));
  assert.ok(Array.isArray(report.risks));
  assert.ok(report.risks.some((r) => r.includes("Social sentiment")));
  assert.ok(Number.isFinite(report.confidence.confidence));
  assert.ok(typeof report.aiSummary === "string" && report.aiSummary.length > 0);
  assert.ok(report.inputs);
});

test("generateReport: retains the real underlying metrics as `inputs` for auditability", async () => {
  const metrics = { symbol: "FAKE", asOf: "2026-07-27T00:00:00.000Z", dataAvailable: true, unavailableReason: null, articles: [], socialAvailable: false, socialUnavailableReason: "stub", priceBars: [], lookbackDays: 14 };
  const report = await generateReport("FAKE", { provider: fakeProvider(metrics) });
  assert.equal(report.inputs, metrics);
});

test("generateReport: never surfaces a forbidden committee verdict key anywhere in the serialized report", async () => {
  const now = new Date();
  const metrics = {
    symbol: "FAKE",
    asOf: now.toISOString(),
    dataAvailable: true,
    unavailableReason: null,
    articles: scoreArticles([{ title: "Company beats expectations", description: null, source: "Reuters", publishedAt: daysAgo(now, 1), url: "https://x" }]),
    socialAvailable: false,
    socialUnavailableReason: "stub",
    priceBars: [],
    lookbackDays: 14,
  };
  const report = await generateReport("FAKE", { provider: fakeProvider(metrics) });
  const serialized = JSON.stringify(report);
  for (const forbiddenKey of canonicalVerdict.FORBIDDEN_COMMITTEE_KEYS) {
    assert.doesNotMatch(serialized, new RegExp(`"${forbiddenKey}"\\s*:`), `report must never contain the forbidden key "${forbiddenKey}"`);
  }
});

test("generateReport: gracefully handles zero real articles from an otherwise-available news source, never crashing", async () => {
  const metrics = { symbol: "EMPTY", asOf: new Date().toISOString(), dataAvailable: true, unavailableReason: null, articles: [], socialAvailable: false, socialUnavailableReason: "stub", priceBars: [], lookbackDays: 14 };
  const report = await generateReport("EMPTY", { provider: fakeProvider(metrics) });
  assert.equal(report.dataAvailable, true);
  assert.equal(report.sentimentScore, 50);
  assert.equal(report.sentimentState, "NEUTRAL");
});
