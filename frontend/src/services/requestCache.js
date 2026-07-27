// Phase PLATFORM-INTEGRATION-001 — a small, explicit request cache so
// Mission Control, Portfolio Workspace, and News Intelligence can share
// the real GET calls they genuinely overlap on (overnight Claim changes,
// the real portfolio summary) instead of each independently re-fetching
// the same data. Two real problems solved by one cache entry:
//   - de-duplication: a second caller within the same in-flight window
//     gets the SAME promise, not a second real HTTP request.
//   - reuse: a caller within `ttlMs` of the last resolved fetch gets the
//     already-resolved data with zero network cost.
// Scoped deliberately to an explicit key per call site (never a blanket
// cache over every apiClient.get), so screens that need genuinely fresh
// data on every load are entirely unaffected.

const DEFAULT_TTL_MS = 15000;
const entries = new Map(); // key -> { promise, expiresAt }

export function withRequestCache(key, fetcher, { ttlMs = DEFAULT_TTL_MS } = {}) {
  const cached = entries.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.promise;
  }

  const promise = fetcher().catch((error) => {
    // A failed fetch must not poison the cache — the next caller (or a
    // retry) should get a fresh real attempt, not a cached rejection.
    entries.delete(key);
    throw error;
  });

  entries.set(key, { promise, expiresAt: Date.now() + ttlMs });
  return promise;
}

export function clearRequestCache(key) {
  if (key) {
    entries.delete(key);
  } else {
    entries.clear();
  }
}
