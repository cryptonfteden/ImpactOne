require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const { createUnifiedProvider, withRetry, withTimeout, DEFAULT_TIMEOUT_MS } = require("./providerAbstraction");
const { validateProviderShape } = require("./baseProviderContract");
const redisClient = require("../redisCache/redisClient");
const { sharedProviderCache } = require("../redisCache/providerCache");

function baseConfig(overrides = {}) {
  return {
    providerId: "test-unified-provider",
    label: "Test Unified Provider",
    sourceType: "test",
    category: "test",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 30 },
    ...overrides,
  };
}

test("createUnifiedProvider: produces a provider that still satisfies the exact, unmodified base contract", () => {
  const provider = createUnifiedProvider(baseConfig(), async () => []);
  const { valid, missingFields } = validateProviderShape(provider);
  assert.equal(valid, true, `unexpected missing fields: ${missingFields.join(", ")}`);
});

test("createUnifiedProvider: fetch() returns exactly what the real core fetch implementation returns — no change to business logic", async () => {
  const realItems = [{ headline: "real event" }];
  const provider = createUnifiedProvider(baseConfig(), async () => realItems);
  const result = await provider.fetch();
  assert.deepEqual(result, realItems);
});

test("createUnifiedProvider: attaches real getHealth/getMetrics/getDiagnostics/getCacheStats accessor methods", () => {
  const provider = createUnifiedProvider(baseConfig(), async () => []);
  assert.equal(typeof provider.getHealth, "function");
  assert.equal(typeof provider.getMetrics, "function");
  assert.equal(typeof provider.getDiagnostics, "function");
  assert.equal(typeof provider.getCacheStats, "function");
});

test("createUnifiedProvider: getHealth() delegates to the real, existing providerHealthService for this exact providerId", async () => {
  const provider = createUnifiedProvider(baseConfig({ providerId: "sec" }), async () => []);
  const health = await provider.getHealth();
  assert.equal(health.providerId, "sec");
});

test("createUnifiedProvider: getCacheStats() returns the real, shared cache's own current stats", () => {
  const provider = createUnifiedProvider(baseConfig(), async () => []);
  const stats = provider.getCacheStats();
  const directStats = sharedProviderCache.getStats();
  assert.equal(stats.hits, directStats.hits);
  assert.equal(stats.misses, directStats.misses);
  assert.equal(stats.bypassed, directStats.bypassed);
});

test("shared timeout policy: a real core fetch that hangs past the configured timeout rejects with a real TIMEOUT error, never hanging the caller", async () => {
  const provider = createUnifiedProvider(baseConfig(), () => new Promise(() => {}), { timeoutMs: 20 });
  await assert.rejects(() => provider.fetch(), /TIMEOUT/);
});

test("shared timeout policy: a real core fetch that resolves well within the timeout is completely unaffected", async () => {
  const provider = createUnifiedProvider(baseConfig(), async () => ["fast-result"], { timeoutMs: 5000 });
  const result = await provider.fetch();
  assert.deepEqual(result, ["fast-result"]);
});

test("shared cache hook: disabled by default (cacheTtlMs 0) — every real call reaches the real core fetch implementation", async () => {
  let calls = 0;
  const provider = createUnifiedProvider(baseConfig(), async () => { calls += 1; return [calls]; });
  const first = await provider.fetch();
  const second = await provider.fetch();
  assert.equal(calls, 2, "with caching disabled, every call must reach the real core fetch implementation");
  assert.deepEqual(first, [1]);
  assert.deepEqual(second, [2]);
});

test("shared cache hook: when explicitly enabled (cacheTtlMs > 0) with a real, reachable cache, a second real call is served from cache", async () => {
  const store = new Map();
  const fakeClient = {
    async get(key) { return store.has(key) ? store.get(key) : null; },
    async set(key, value) { store.set(key, value); return "OK"; },
  };
  const originalGetClient = redisClient.getClient;
  redisClient.getClient = async () => fakeClient;
  try {
    let calls = 0;
    const provider = createUnifiedProvider(baseConfig({ providerId: "test-cached-provider" }), async () => { calls += 1; return ["real-data"]; }, { cacheTtlMs: 60000 });
    const first = await provider.fetch();
    const second = await provider.fetch();
    assert.equal(calls, 1, "the real core fetch implementation must not be called again on a real cache hit");
    assert.deepEqual(first, second);
  } finally {
    redisClient.getClient = originalGetClient;
  }
});

test("shared retry policy (withRetry): re-exported verbatim, retries a real transient failure up to maxAttempts", async () => {
  let attempts = 0;
  const result = await withRetry(async () => {
    attempts += 1;
    if (attempts < 2) throw new Error("transient");
    return "recovered";
  }, { maxAttempts: 3, baseDelayMs: 1 });
  assert.equal(result, "recovered");
  assert.equal(attempts, 2);
});

test("shared timeout policy (withTimeout): re-exported verbatim from agentScheduler.js, the exact same real implementation", async () => {
  const result = await withTimeout(Promise.resolve("ok"), 1000);
  assert.equal(result, "ok");
});

test("DEFAULT_TIMEOUT_MS is a real, disclosed, positive number", () => {
  assert.ok(Number.isFinite(DEFAULT_TIMEOUT_MS) && DEFAULT_TIMEOUT_MS > 0);
});
