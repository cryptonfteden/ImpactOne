// Phase REDIS-CACHE-001 — the one generic, reusable provider-response
// cache. Mirrors `agentScheduler/healthCache.js`'s own exact API shape
// (`getOrCompute`/`invalidate`/`clear`/`getStats`/`resetStats`) —
// generalized from a WeakMap keyed by object reference to a real,
// string-keyed Redis store (since a cache key here is a real
// deterministic input like `"priceHistory:AAPL:1y"`, not a live object
// reference). "No change to business logic": `getOrCompute` always
// returns exactly what `computeFn()` would have returned — a cache hit
// returns the real, previously-computed value verbatim (deserialized
// from real JSON, never re-derived or altered); a cache miss, a
// disabled cache (`ttlMs <= 0`), or a genuinely unavailable Redis
// connection all fall through to calling `computeFn()` directly. This
// module never throws — any real Redis error during a get/set is
// treated exactly like "Redis is unavailable" (see redisClient.js's
// own header) and degrades to a real, uncached call-through.
const redisClient = require("./redisClient");

function createProviderCache({ now = Date.now } = {}) {
  let hits = 0;
  let misses = 0;
  let bypassed = 0; // real Redis errors / unavailability — distinct from an honest cache miss

  async function getOrCompute(cacheKey, computeFn, { ttlMs = 0, shouldCache = () => true } = {}) {
    if (!(ttlMs > 0)) {
      misses += 1;
      return computeFn();
    }

    let client = null;
    try {
      client = await redisClient.getClient();
    } catch {
      client = null;
    }

    if (!client) {
      bypassed += 1;
      return computeFn();
    }

    try {
      const cachedRaw = await client.get(cacheKey);
      if (cachedRaw !== null && cachedRaw !== undefined) {
        hits += 1;
        return JSON.parse(cachedRaw);
      }
    } catch {
      bypassed += 1;
      return computeFn();
    }

    misses += 1;
    const result = await computeFn();

    try {
      if (shouldCache(result)) {
        await client.set(cacheKey, JSON.stringify(result), { PX: ttlMs });
      }
    } catch {
      // A real write failure never affects the real, already-computed
      // result being returned to the caller — only the cache is
      // degraded, never the response.
    }

    return result;
  }

  async function invalidate(cacheKey) {
    let client = null;
    try {
      client = await redisClient.getClient();
    } catch {
      client = null;
    }
    if (!client) return;
    try {
      await client.del(cacheKey);
    } catch {
      // Best-effort — an invalidation failure is not a business-logic
      // failure; the next real TTL expiry (or Redis recovery) still
      // resolves it.
    }
  }

  async function invalidatePrefix(prefix) {
    let client = null;
    try {
      client = await redisClient.getClient();
    } catch {
      client = null;
    }
    if (!client) return;
    try {
      const matchingKeys = await client.keys(`${prefix}*`);
      if (matchingKeys.length) {
        await client.del(matchingKeys);
      }
    } catch {
      // Best-effort, same discipline as invalidate().
    }
  }

  function getStats() {
    return { hits, misses, bypassed, generatedAt: new Date(now()).toISOString() };
  }

  function resetStats() {
    hits = 0;
    misses = 0;
    bypassed = 0;
  }

  return { getOrCompute, invalidate, invalidatePrefix, getStats, resetStats };
}

// A single, shared, process-wide cache — this is what every real
// provider call in this codebase reads from and writes to. Tests that
// need isolation should construct their own instance via
// createProviderCache() instead.
const sharedProviderCache = createProviderCache();

module.exports = { createProviderCache, sharedProviderCache };
