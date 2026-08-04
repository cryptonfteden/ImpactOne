require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../../test/dbHelpers");
const marketSentimentService = require("./marketSentimentService");
const repository = require("./marketSentimentRepository");
const { FORBIDDEN_GOVERNANCE_KEYS } = require("./marketSentimentGovernance");

const autonomousMarketService = require("../autonomousMarketService");
const autonomousRecommendationRepository = require("../autonomousRecommendationRepository");
const altDataService = require("../altDataService");
const cotIntelligenceService = require("../intelligence/cotIntelligenceService");
const technicalIntelligenceService = require("../intelligence/technicalIntelligenceService");

async function withMocked(mocks, run) {
  const originals = {};
  for (const [moduleRef, fnName, impl] of mocks) {
    originals[`${fnName}`] = moduleRef[fnName];
    moduleRef[fnName] = impl;
  }
  try {
    return await run();
  } finally {
    for (const [moduleRef, fnName] of mocks) {
      moduleRef[fnName] = originals[fnName];
    }
  }
}

const REAL_FEED = [
  { impactType: "opportunity", importanceScore: 70, affectedRegions: [], publishedAt: "2026-07-26T18:00:00.000Z" },
  { impactType: "opportunity", importanceScore: 65, affectedRegions: [], publishedAt: "2026-07-26T17:00:00.000Z" },
];
const REAL_RECS = [
  { action: "BUY", createdAt: "2026-07-26T10:00:00.000Z" },
  { action: "BUY", createdAt: "2026-07-26T11:00:00.000Z" },
];
const REAL_MACRO = { source: "fred", regime: { riskMode: "risk-on", inflationPressure: "low", recessionRisk: "low" }, rates: { asOf: "2026-07-25" }, cpi: { asOf: "2026-07-01" } };
const REAL_POLYMARKET = [{ trend: "Up", source: "polymarket" }];
const REAL_COT = { status: "LIVE", errorState: null, netPositionChangePct: 4, asOf: "2026-07-20" };
const REAL_ANALYSIS = (symbol) => ({ symbol, signals: { volatilityRegime: { enoughData: true, signal: "LOW_VOLATILITY", calculationInputs: {}, freshness: { lastBarDate: "2026-07-25" } } } });

const HAPPY_PATH_MOCKS = [
  [autonomousMarketService, "getAutonomousOverview", async () => ({ feed: REAL_FEED })],
  [autonomousRecommendationRepository, "listActive", async () => REAL_RECS],
  [altDataService, "getMacroData", async () => REAL_MACRO],
  [altDataService, "getPolymarketData", async () => REAL_POLYMARKET],
  [cotIntelligenceService, "getCotIntelligence", async () => REAL_COT],
  [technicalIntelligenceService, "analyzeSymbol", async (symbol) => REAL_ANALYSIS(symbol)],
];

test.beforeEach(async () => {
  await truncateAll();
});

test("all inputs available: getMarketSentiment returns the full required shape with a real score", async () => {
  await withMocked(HAPPY_PATH_MOCKS, async () => {
    const reading = await marketSentimentService.getMarketSentiment("US", { now: new Date("2026-07-26T20:00:00.000Z") });
    assert.equal(reading.market, "US");
    assert.ok(Number.isFinite(reading.score));
    assert.ok(Number.isFinite(reading.confidence));
    assert.ok(reading.trend);
    assert.ok(Array.isArray(reading.contributors));
    assert.ok(Array.isArray(reading.missingInputs));
    assert.equal(typeof reading.lastUpdated, "string");
    assert.ok(reading.dataFreshness);
    assert.ok(reading.provenance);
    assert.ok(reading.provenance.sources.length > 0);
    assert.equal(reading.label, "Signal — not a recommendation");
  });
});

test("provider failure: one source throwing never blocks the rest of the reading", async () => {
  const mocksWithOneFailure = HAPPY_PATH_MOCKS.map(([moduleRef, fnName, impl]) => (fnName === "getMacroData" ? [moduleRef, fnName, async () => { throw new Error("FRED is down"); }] : [moduleRef, fnName, impl]));
  await withMocked(mocksWithOneFailure, async () => {
    const reading = await marketSentimentService.getMarketSentiment("US", { now: new Date("2026-07-26T20:00:00.000Z") });
    assert.ok(Number.isFinite(reading.score), "the reading should still degrade honestly, not crash, when one provider fails");
    assert.ok(reading.missingInputs.some((entry) => entry.startsWith("FEAR_GREED") || entry.startsWith("MACRO_EVENTS")));
  });
});

test("no inputs (every source fails): getMarketSentiment still returns the required shape with an honestly null score", async () => {
  const allFail = HAPPY_PATH_MOCKS.map(([moduleRef, fnName]) => [moduleRef, fnName, async () => { throw new Error("down"); }]);
  await withMocked(allFail, async () => {
    const reading = await marketSentimentService.getMarketSentiment("US", { now: new Date("2026-07-26T20:00:00.000Z") });
    assert.equal(reading.score, null);
    assert.equal(reading.confidence, null);
    assert.ok(reading.missingInputs.length > 0);
  });
});

test("stale inputs: dataFreshness honestly reflects real input age relative to now", async () => {
  const staleFeed = [{ impactType: "opportunity", importanceScore: 70, affectedRegions: [], publishedAt: "2026-07-20T00:00:00.000Z" }];
  const staleMocks = HAPPY_PATH_MOCKS.map(([moduleRef, fnName, impl]) => (fnName === "getAutonomousOverview" ? [moduleRef, fnName, async () => ({ feed: staleFeed })] : [moduleRef, fnName, impl]));
  await withMocked(staleMocks, async () => {
    const reading = await marketSentimentService.getMarketSentiment("US", { now: new Date("2026-07-26T20:00:00.000Z") });
    assert.equal(reading.dataFreshness.isStale, true);
  });
});

test("governance field prohibition: the real, fully-composed canonical reading never carries a forbidden field", async () => {
  await withMocked(HAPPY_PATH_MOCKS, async () => {
    const reading = await marketSentimentService.getMarketSentiment("US", { now: new Date("2026-07-26T20:00:00.000Z") });
    for (const key of FORBIDDEN_GOVERNANCE_KEYS) {
      assert.equal(key in reading, false, `${key} must never appear on a real sentiment reading`);
    }
  });
});

test("market isolation: US and CHINA computed from the same mocked sources never share unavailable/available state", async () => {
  await withMocked(HAPPY_PATH_MOCKS, async () => {
    const us = await marketSentimentService.getMarketSentiment("US", { now: new Date("2026-07-26T20:00:00.000Z") });
    const china = await marketSentimentService.getMarketSentiment("CHINA", { now: new Date("2026-07-26T20:00:00.000Z") });
    // China has no real macro/recommendation data source (registry-level
    // gating) even though the exact same mocked sources are available —
    // it must show strictly more honest gaps than US, never silently
    // inherit US's availability.
    assert.ok(china.missingInputs.length > us.missingInputs.length);
    assert.ok(china.missingInputs.some((entry) => entry.startsWith("MACRO_EVENTS")));
    assert.ok(china.missingInputs.some((entry) => entry.startsWith("FEAR_GREED")));
    assert.ok(china.missingInputs.some((entry) => entry.startsWith("AI_RECOMMENDATION_DISTRIBUTION")));
  });
});

test("snapshot persistence: captureSnapshot writes one OVERALL row and one row per dimension, all real and readable back", async () => {
  await withMocked(HAPPY_PATH_MOCKS, async () => {
    const result = await marketSentimentService.captureSnapshot("US", { now: new Date("2026-07-26T20:00:00.000Z") });
    assert.equal(result.overall.dimension, "OVERALL");
    assert.equal(result.overall.market, "US");
    assert.equal(result.overall.snapshotDate, "2026-07-26");
    assert.ok(result.dimensions.length >= 5);

    const history = await repository.listSnapshotHistory({ market: "US", dimension: "OVERALL", limit: 5 });
    assert.equal(history.length, 1);
    assert.equal(history[0].snapshotDate, "2026-07-26");
  });
});

test("snapshot persistence is append-only: capturing the same market+day twice violates the real unique constraint rather than silently overwriting", async () => {
  await withMocked(HAPPY_PATH_MOCKS, async () => {
    await marketSentimentService.captureSnapshot("US", { now: new Date("2026-07-26T20:00:00.000Z") });
    await assert.rejects(() => marketSentimentService.captureSnapshot("US", { now: new Date("2026-07-26T21:00:00.000Z") }));
  });
});

test("daily/weekly trend: honestly INSUFFICIENT_HISTORY on the very first read, then real once a prior snapshot exists", async () => {
  await withMocked(HAPPY_PATH_MOCKS, async () => {
    const firstRead = await marketSentimentService.getMarketSentiment("US", { now: new Date("2026-07-25T20:00:00.000Z") });
    assert.equal(firstRead.trend.daily.direction, "INSUFFICIENT_HISTORY");

    await marketSentimentService.captureSnapshot("US", { now: new Date("2026-07-25T20:00:00.000Z") });

    const secondRead = await marketSentimentService.getMarketSentiment("US", { now: new Date("2026-07-26T20:00:00.000Z") });
    assert.notEqual(secondRead.trend.daily.direction, undefined);
    assert.ok(["IMPROVING", "DETERIORATING", "STABLE"].includes(secondRead.trend.daily.direction));
  });
});

test("getMarketSentiment rejects an unknown market with a 400-style error rather than silently defaulting", async () => {
  await assert.rejects(() => marketSentimentService.getMarketSentiment("ATLANTIS"), /Unknown market/);
});
