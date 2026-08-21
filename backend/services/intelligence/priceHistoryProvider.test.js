const test = require("node:test");
const assert = require("node:assert/strict");
const { getDailyBars, rangeToYahooRange, fetchYahooDailyBars, fetchYahooIntradayBars, isRegularUsEquity } = require("./priceHistoryProvider");
const { sharedProviderCache } = require("../redisCache/providerCache");
const redisClient = require("../redisCache/redisClient");

function fakeAxiosResponse(bars) {
  return {
    data: {
      results: bars.map((bar) => ({
        t: new Date(bar.date).getTime(),
        o: bar.open,
        h: bar.high,
        l: bar.low,
        c: bar.close,
        v: bar.volume,
      })),
    },
  };
}

function fakeRedisClientForTest() {
  const store = new Map();
  return {
    async get(key) { return store.has(key) ? store.get(key) : null; },
    async set(key, value) { store.set(key, value); return "OK"; },
    async del() {},
    async keys() { return []; },
    _store: store,
  };
}

test.beforeEach(async () => {
  sharedProviderCache.resetStats();
  await sharedProviderCache.invalidatePrefix("priceHistory:");
});

test("getDailyBars: returns the exact same real bar shape as before this phase — no change to business logic", async () => {
  const originalGetClient = redisClient.getClient;
  redisClient.getClient = async () => null; // Redis unavailable — real, uncached call
  const originalGet = require("axios").get;
  require("axios").get = async () => fakeAxiosResponse([{ date: "2026-07-01", open: 100, high: 105, low: 99, close: 104, volume: 1000 }]);
  try {
    const bars = await getDailyBars("AAPL", { range: "5d" });
    assert.equal(bars.length, 1);
    assert.deepEqual(Object.keys(bars[0]).sort(), ["close", "date", "high", "low", "open", "volume"]);
    assert.equal(bars[0].close, 104);
  } finally {
    redisClient.getClient = originalGetClient;
    require("axios").get = originalGet;
  }
});

test("getDailyBars: a real cache hit returns the identical real bars without a second real network call", async () => {
  const originalGetClient = redisClient.getClient;
  const fake = fakeRedisClientForTest();
  redisClient.getClient = async () => fake;
  const originalGet = require("axios").get;
  let networkCalls = 0;
  require("axios").get = async () => {
    networkCalls += 1;
    return fakeAxiosResponse([{ date: "2026-07-01", open: 100, high: 105, low: 99, close: 104, volume: 1000 }]);
  };
  try {
    const first = await getDailyBars("AAPL", { range: "5d" });
    const second = await getDailyBars("AAPL", { range: "5d" });
    assert.deepEqual(first, second);
    assert.equal(networkCalls, 1, "the real network call must not repeat on a real cache hit");
  } finally {
    redisClient.getClient = originalGetClient;
    require("axios").get = originalGet;
  }
});

test("getDailyBars: different real symbols/ranges never share a real cache entry", async () => {
  const originalGetClient = redisClient.getClient;
  const fake = fakeRedisClientForTest();
  redisClient.getClient = async () => fake;
  const originalGet = require("axios").get;
  let networkCalls = 0;
  require("axios").get = async () => {
    networkCalls += 1;
    return fakeAxiosResponse([{ date: "2026-07-01", open: 100, high: 105, low: 99, close: 104, volume: 1000 }]);
  };
  try {
    await getDailyBars("AAPL", { range: "5d" });
    await getDailyBars("MSFT", { range: "5d" });
    await getDailyBars("AAPL", { range: "1y" });
    assert.equal(networkCalls, 3);
  } finally {
    redisClient.getClient = originalGetClient;
    require("axios").get = originalGet;
  }
});

test("getDailyBars: honestly returns an empty array with no symbol, exactly as before this phase", async () => {
  const bars = await getDailyBars("");
  assert.deepEqual(bars, []);
});

test("rangeToYahooRange maps each supported chart selector to an honest daily-history window", () => {
  assert.equal(rangeToYahooRange("15m"), "5d");
  assert.equal(rangeToYahooRange("4h"), "5d");
  assert.equal(rangeToYahooRange("1w"), "1mo");
  assert.equal(rangeToYahooRange("1y"), "1y");
});

test("fetchYahooDailyBars keeps only verified Yahoo OHLCV rows", async () => {
  const originalGet = require("axios").get;
  require("axios").get = async () => ({
    data: { chart: { result: [{ timestamp: [1783555200, 1783641600], indicators: { quote: [{ open: [100, null], high: [104, 105], low: [99, 101], close: [102, 103], volume: [2000, 3000] }] } }] } },
  });
  try {
    const bars = await fetchYahooDailyBars("SPY", "1mo");
    assert.equal(bars.length, 1);
    assert.equal(bars[0].close, 102);
    assert.equal(bars[0].volume, 2000);
  } finally {
    require("axios").get = originalGet;
  }
});

test("intraday session filtering applies to US equities but preserves continuous assets", async () => {
  assert.equal(isRegularUsEquity("AAPL"), true);
  assert.equal(isRegularUsEquity("BTC-USD"), false);
  const originalGet = require("axios").get;
  const saturday = Math.floor(new Date("2026-08-15T12:00:00Z").getTime() / 1000);
  require("axios").get = async () => ({
    data: { chart: { result: [{ timestamp: [saturday], indicators: { quote: [{ open: [100], high: [102], low: [99], close: [101], volume: [500] }] } }] } },
  });
  try {
    assert.equal((await fetchYahooIntradayBars("AAPL", "15m")).length, 0);
    assert.equal((await fetchYahooIntradayBars("BTC-USD", "15m")).length, 1);
  } finally {
    require("axios").get = originalGet;
  }
});

test("getDailyBars: a real network failure still gracefully returns an empty array, exactly as before this phase", async () => {
  const originalGetClient = redisClient.getClient;
  redisClient.getClient = async () => null;
  const originalGet = require("axios").get;
  require("axios").get = async () => { throw new Error("simulated network failure"); };
  try {
    const bars = await getDailyBars("AAPL", { range: "5d" });
    assert.deepEqual(bars, []);
  } finally {
    redisClient.getClient = originalGetClient;
    require("axios").get = originalGet;
  }
});
