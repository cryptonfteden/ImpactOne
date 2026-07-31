const test = require("node:test");
const assert = require("node:assert/strict");
const { createProviderCache } = require("./providerCache");
const redisClient = require("./redisClient");

function fakeRedisClient() {
  const store = new Map();
  return {
    async get(key) {
      const entry = store.get(key);
      return entry === undefined ? null : entry;
    },
    async set(key, value) {
      store.set(key, value);
      return "OK";
    },
    async del(keys) {
      const list = Array.isArray(keys) ? keys : [keys];
      let count = 0;
      for (const key of list) {
        if (store.delete(key)) count += 1;
      }
      return count;
    },
    async keys(pattern) {
      const prefix = pattern.replace(/\*$/, "");
      return [...store.keys()].filter((key) => key.startsWith(prefix));
    },
    _store: store,
  };
}

async function withFakeClient(fn) {
  const original = redisClient.getClient;
  const fake = fakeRedisClient();
  redisClient.getClient = async () => fake;
  try {
    await fn(fake);
  } finally {
    redisClient.getClient = original;
  }
}

test("getOrCompute: a real cache miss calls computeFn, stores the real result, and returns it", async () => {
  await withFakeClient(async () => {
    const cache = createProviderCache();
    let computeCalls = 0;
    const result = await cache.getOrCompute("key1", async () => { computeCalls += 1; return { value: 42 }; }, { ttlMs: 60000 });
    assert.deepEqual(result, { value: 42 });
    assert.equal(computeCalls, 1);
    assert.equal(cache.getStats().misses, 1);
    assert.equal(cache.getStats().hits, 0);
  });
});

test("getOrCompute: a real cache hit never calls computeFn again, returning the exact same real value", async () => {
  await withFakeClient(async () => {
    const cache = createProviderCache();
    let computeCalls = 0;
    const computeFn = async () => { computeCalls += 1; return { value: 42 }; };
    await cache.getOrCompute("key1", computeFn, { ttlMs: 60000 });
    const second = await cache.getOrCompute("key1", computeFn, { ttlMs: 60000 });
    assert.deepEqual(second, { value: 42 });
    assert.equal(computeCalls, 1, "computeFn must not be called again on a real cache hit");
    assert.equal(cache.getStats().hits, 1);
  });
});

test("getOrCompute: ttlMs <= 0 always bypasses the cache — never even attempts a real Redis call", async () => {
  await withFakeClient(async (fake) => {
    const cache = createProviderCache();
    let computeCalls = 0;
    await cache.getOrCompute("key1", async () => { computeCalls += 1; return 1; }, { ttlMs: 0 });
    await cache.getOrCompute("key1", async () => { computeCalls += 1; return 1; }, { ttlMs: 0 });
    assert.equal(computeCalls, 2);
    assert.equal(fake._store.size, 0);
  });
});

test("getOrCompute: gracefully falls back to computeFn when Redis is unavailable, never throwing", async () => {
  const original = redisClient.getClient;
  redisClient.getClient = async () => null;
  try {
    const cache = createProviderCache();
    let computeCalls = 0;
    const result = await cache.getOrCompute("key1", async () => { computeCalls += 1; return "real-value"; }, { ttlMs: 60000 });
    assert.equal(result, "real-value");
    assert.equal(computeCalls, 1);
    assert.equal(cache.getStats().bypassed, 1);
  } finally {
    redisClient.getClient = original;
  }
});

test("getOrCompute: a real Redis GET failure gracefully falls back to computeFn, never throwing", async () => {
  const original = redisClient.getClient;
  redisClient.getClient = async () => ({ get: async () => { throw new Error("simulated Redis outage"); } });
  try {
    const cache = createProviderCache();
    const result = await cache.getOrCompute("key1", async () => "fresh-value", { ttlMs: 60000 });
    assert.equal(result, "fresh-value");
    assert.equal(cache.getStats().bypassed, 1);
  } finally {
    redisClient.getClient = original;
  }
});

test("getOrCompute: a real Redis SET failure never affects the real value already being returned", async () => {
  const original = redisClient.getClient;
  redisClient.getClient = async () => ({ get: async () => null, set: async () => { throw new Error("simulated write failure"); } });
  try {
    const cache = createProviderCache();
    const result = await cache.getOrCompute("key1", async () => "fresh-value", { ttlMs: 60000 });
    assert.equal(result, "fresh-value");
  } finally {
    redisClient.getClient = original;
  }
});

test("invalidate: removes exactly one real key, never affecting any other", async () => {
  await withFakeClient(async (fake) => {
    const cache = createProviderCache();
    await cache.getOrCompute("key1", async () => "a", { ttlMs: 60000 });
    await cache.getOrCompute("key2", async () => "b", { ttlMs: 60000 });
    await cache.invalidate("key1");
    assert.equal(fake._store.has("key1"), false);
    assert.equal(fake._store.has("key2"), true);
  });
});

test("invalidatePrefix: removes every real key sharing the given prefix", async () => {
  await withFakeClient(async (fake) => {
    const cache = createProviderCache();
    await cache.getOrCompute("priceHistory:AAPL:1y", async () => "a", { ttlMs: 60000 });
    await cache.getOrCompute("priceHistory:MSFT:1y", async () => "b", { ttlMs: 60000 });
    await cache.getOrCompute("other:key", async () => "c", { ttlMs: 60000 });
    await cache.invalidatePrefix("priceHistory:");
    assert.equal(fake._store.has("priceHistory:AAPL:1y"), false);
    assert.equal(fake._store.has("priceHistory:MSFT:1y"), false);
    assert.equal(fake._store.has("other:key"), true);
  });
});

test("resetStats: zeroes every real counter", async () => {
  await withFakeClient(async () => {
    const cache = createProviderCache();
    await cache.getOrCompute("key1", async () => "a", { ttlMs: 60000 });
    cache.resetStats();
    assert.deepEqual(cache.getStats().hits, 0);
    assert.deepEqual(cache.getStats().misses, 0);
    assert.deepEqual(cache.getStats().bypassed, 0);
  });
});

test("getStats: includes a real, current generatedAt timestamp", async () => {
  const cache = createProviderCache({ now: () => 1700000000000 });
  const stats = cache.getStats();
  assert.equal(stats.generatedAt, new Date(1700000000000).toISOString());
});
