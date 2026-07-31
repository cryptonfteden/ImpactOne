// Phase REDIS-CACHE-001 — the one real Redis connection this platform
// uses. Deliberately lazy and defensive: `REDIS_URL` is honestly empty
// in every environment this codebase runs in today (confirmed via a
// dedicated research pass — no Redis instance is configured anywhere),
// so this module must never throw, never block a caller, and never
// leave the process waiting on a connection that will never succeed.
// Every real failure mode (no REDIS_URL configured, connection
// refused, timeout, mid-session disconnect) degrades to the exact same
// observable behavior: `isAvailable()` returns `false`, and every
// get/set call is a real, honest no-op — never a fabricated cache hit,
// never a thrown error that could break the real provider call this
// cache wraps ("no change to business logic").
const env = require("../../config/env");

let redisModule = null;
try {
  // Required lazily/defensively — if the `redis` package were ever
  // absent from node_modules for any reason, this cache degrades to
  // "always unavailable" rather than crashing the whole process at
  // require time.
  redisModule = require("redis");
} catch {
  redisModule = null;
}

const CONNECT_TIMEOUT_MS = 2000;

let client = null;
let connectingPromise = null;
let hasLoggedUnavailable = false;

function warnOnceUnavailable(reason) {
  if (hasLoggedUnavailable) return;
  hasLoggedUnavailable = true;
  console.warn(`[redisClient] Redis is unavailable (${reason}) — the provider cache will gracefully fall back to always-miss (real, uncached provider calls). No business logic is affected.`);
}

/**
 * Lazily connects at most once per process. Never throws — any real
 * connection failure is caught and honestly recorded as "unavailable."
 * @returns {Promise<import("redis").RedisClientType|null>} the real, connected client, or null if Redis is unavailable
 */
async function getClient() {
  if (!env.REDIS_URL || !redisModule) {
    warnOnceUnavailable(!redisModule ? "redis package not installed" : "REDIS_URL not configured");
    return null;
  }

  if (client && client.isOpen) {
    return client;
  }

  if (connectingPromise) {
    return connectingPromise;
  }

  connectingPromise = (async () => {
    try {
      const candidate = redisModule.createClient({
        url: env.REDIS_URL,
        // `reconnectStrategy: false` is deliberate: this module already
        // re-attempts a fresh connection on its own terms (the next real
        // getClient() call, after the "error" handler below clears the
        // stale reference) — the underlying client retrying forever in
        // the background is exactly what could hang a caller in this
        // environment, where Redis is confirmed absent.
        socket: { connectTimeout: CONNECT_TIMEOUT_MS, reconnectStrategy: false },
      });
      candidate.on("error", () => {
        // Real, already-connected client dropped — never crashes the
        // process; the next getClient() call re-attempts a fresh
        // connection instead of reusing a known-dead one.
        client = null;
      });
      await candidate.connect();
      client = candidate;
      return client;
    } catch (error) {
      warnOnceUnavailable(error.message);
      client = null;
      return null;
    } finally {
      connectingPromise = null;
    }
  })();

  return connectingPromise;
}

/**
 * @returns {Promise<boolean>} whether a real, usable Redis connection is currently available
 */
async function isAvailable() {
  const real = await getClient();
  return real !== null;
}

// Test/shutdown-only — never called from real request paths.
async function _resetForTests() {
  if (client) {
    try {
      await client.quit();
    } catch {
      // already disconnected — nothing further to do
    }
  }
  client = null;
  connectingPromise = null;
  hasLoggedUnavailable = false;
}

module.exports = { getClient, isAvailable, _resetForTests, CONNECT_TIMEOUT_MS };
