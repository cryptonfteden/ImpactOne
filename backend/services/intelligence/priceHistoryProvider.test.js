const test = require("node:test");
const assert = require("node:assert/strict");
const { getDailyBars } = require("./priceHistoryProvider");
const { sharedProviderCache } = require("../redisCache/providerCache");
const redisClient = require("../redisCache/redisClient");

function fakeAxiosResponse(bars) {
  return {
    data: {
      chart: {
        result: [
          {
            timestamp: bars.map((bar) => Math.floor(new Date(bar.date).getTime() / 1000)),
            indicators: {
              quote: [
                {
                  open: bars.map((bar) => bar.open),
                  high: bars.map((bar) => bar.high),
                  low: bars.map((bar) => bar.low),
                  close: bars.map((bar) => bar.close),
                  volume: bars.map((bar) => bar.volume),
                },
              ],
            },
          },
        ],
      },
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

test.beforeEach(() => {
  sharedProviderCache.resetStats();
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
