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

test("generateReport: unrelated stories from different sources cannot cast a news vote", async () => {
  const report = await generateReport("AAPL", { provider: fakeAvailableProvider() });
  assert.equal(report.signalEligible, false);
  assert.equal(report.dataQuality.independentlyConfirmedEvent, false);
  assert.match(report.dataQuality.blockers.join(" "), /No single company event was independently confirmed/);
});

test("generateReport: a fresh, material event confirmed by independent sources can clear the evidence gate", async () => {
  const now = Date.now();
  const provider = {
    async getSymbolNewsData(symbol) {
      return {
        symbol,
        asOf: new Date(now).toISOString(),
        dataAvailable: true,
        sourceProvider: "fixture",
        articles: [
          { title: "Apple wins major Pentagon artificial intelligence contract", description: "The Pentagon awarded Apple a major artificial intelligence defense contract", source: "Reuters", publishedAt: new Date(now - 3600000).toISOString(), url: "https://a" },
          { title: "Pentagon awards Apple major artificial intelligence contract", description: "Apple secured the artificial intelligence defense contract from the Pentagon", source: "Bloomberg", publishedAt: new Date(now - 7200000).toISOString(), url: "https://b" },
          { title: "Apple Pentagon artificial intelligence contract expands", description: "The major defense contract expands Apple artificial intelligence work", source: "CNBC", publishedAt: new Date(now - 10800000).toISOString(), url: "https://c" },
          { title: "Apple secures Pentagon artificial intelligence contract", description: "A major artificial intelligence defense contract was awarded to Apple", source: "MarketWatch", publishedAt: new Date(now - 14400000).toISOString(), url: "https://d" },
          { title: "Apple awarded major Pentagon artificial intelligence contract", description: "The defense contract funds Apple artificial intelligence work", source: "Forbes", publishedAt: new Date(now - 18000000).toISOString(), url: "https://e" },
        ],
        profile: { symbol, dataAvailable: true, companyName: "Apple Inc", industry: "Technology" },
      };
    },
  };
  const report = await generateReport("AAPL", { provider });
  assert.equal(report.dataQuality.independentlyConfirmedEvent, true);
  assert.equal(report.signalEligible, true);
  assert.ok(report.importanceScore >= 60);
});
