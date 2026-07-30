const test = require("node:test");
const assert = require("node:assert/strict");
const { generateReport } = require("./newsAgent");

const FORBIDDEN_COMMITTEE_KEYS = ["action", "decision", "verdict", "finalDecision", "recommendation"];

function fakeAvailableProvider() {
  const now = new Date();
  return {
    async getSymbolNewsData(symbol) {
      return {
        symbol,
        asOf: now.toISOString(),
        dataAvailable: true,
        unavailableReason: null,
        articles: [
          { title: "Apple Inc surges on strong iPhone sales beat", description: "Apple reported record profit growth.", source: "Reuters", publishedAt: new Date(now.getTime() - 2 * 3600000).toISOString(), url: "https://x" },
          { title: "Apple announces new acquisition", description: "Apple to acquire a small AI startup.", source: "Bloomberg", publishedAt: new Date(now.getTime() - 20 * 3600000).toISOString(), url: "https://y" },
          { title: "Fed signals rate cuts amid inflation concerns", description: "Federal Reserve hints at policy shift.", source: "CNBC", publishedAt: new Date(now.getTime() - 30 * 3600000).toISOString(), url: "https://z" },
        ],
        profile: { symbol, dataAvailable: true, unavailableReason: null, companyName: "Apple Inc", industry: "Technology" },
      };
    },
  };
}

function fakeUnavailableProvider(reason) {
  return {
    async getSymbolNewsData(symbol) {
      return { symbol, asOf: new Date().toISOString(), dataAvailable: false, unavailableReason: reason };
    },
  };
}

test("generateReport: produces a fully populated, well-formed report from real (fixture) news data", async () => {
  const report = await generateReport("AAPL", { provider: fakeAvailableProvider() });
  assert.equal(report.dataAvailable, true);
  assert.ok(["BULLISH", "NEUTRAL", "BEARISH"].includes(report.newsBias));
  assert.ok(Number.isFinite(report.newsScore));
  assert.ok(Number.isFinite(report.importanceScore));
  assert.ok(Number.isFinite(report.freshnessScore));
  assert.ok(Number.isFinite(report.confirmationScore));
  assert.ok(["SHORT", "MEDIUM", "LONG"].includes(report.impactHorizon));
  assert.ok(Array.isArray(report.affectedSectors));
  assert.ok(Array.isArray(report.bullishFactors));
  assert.ok(Array.isArray(report.bearishFactors));
  assert.ok(Array.isArray(report.risks));
  assert.ok(Number.isFinite(report.confidence));
  assert.equal(typeof report.aiSummary, "string");
  assert.ok(report.aiSummary.length > 0);
});

test("generateReport: honestly reports unavailable when the real provider itself has no verified news", async () => {
  const report = await generateReport("AAPL", { provider: fakeUnavailableProvider("no NEWS_API_KEY configured") });
  assert.equal(report.dataAvailable, false);
  assert.equal(report.newsBias, "UNKNOWN");
  assert.equal(report.newsScore, null);
  assert.match(report.unavailableReason, /no NEWS_API_KEY configured/);
});

test("generateReport: the full composed report never contains a forbidden governance key", async () => {
  const report = await generateReport("AAPL", { provider: fakeAvailableProvider() });
  const serialized = JSON.stringify(report);
  for (const forbidden of FORBIDDEN_COMMITTEE_KEYS) {
    assert.ok(!new RegExp(`"${forbidden}"\\s*:`).test(serialized), `report must not contain the forbidden key "${forbidden}"`);
  }
});

test("generateReport: classifies a real mix of company/sector/macro articles correctly", async () => {
  const report = await generateReport("AAPL", { provider: fakeAvailableProvider() });
  const eventTypes = report.details.classifiedArticles.map((article) => article.eventType);
  assert.ok(eventTypes.includes("COMPANY"));
  assert.ok(eventTypes.includes("MACRO"));
});
