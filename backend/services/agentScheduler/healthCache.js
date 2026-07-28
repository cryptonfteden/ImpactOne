// Phase PLATFORM-HARDENING-001 — a small TTL cache for agent.health()
// results, keyed by the AGENT OBJECT ITSELF (a WeakMap), never by
// agentId string. This is a deliberate choice: keying by id would let a
// stale cached result from one registered agent silently leak onto a
// different agent object that happens to reuse the same id (exactly
// what happens across independent test runs, and could in principle
// happen after a real unregister/re-register cycle in production). A
// WeakMap keyed by the live object reference cannot have that failure
// mode — a fresh object never collides with a prior one — and it costs
// nothing extra for the normal case (one persistent registered agent
// object reused across every real request).
function createHealthCache({ getTtlMs, now = Date.now } = {}) {
  let store = new WeakMap();
  let hits = 0;
  let misses = 0;

  async function getOrCompute(agent, computeFn) {
    const ttlMs = typeof getTtlMs === "function" ? getTtlMs() : getTtlMs ?? 0;
    // ttlMs<=0 always bypasses the cache, even if a still-fresh entry
    // exists from a moment ago when a larger TTL was configured — the
    // current, live TTL always governs, never a stale one baked into an
    // existing entry.
    const cached = ttlMs > 0 ? store.get(agent) : undefined;
    if (cached && cached.expiresAtMs > now()) {
      hits += 1;
      return cached.result;
    }
    misses += 1;
    const result = await computeFn();
    if (ttlMs > 0) {
      store.set(agent, { result, expiresAtMs: now() + ttlMs });
    } else {
      store.delete(agent);
    }
    return result;
  }

  function invalidate(agent) {
    store.delete(agent);
  }

  function clear() {
    store = new WeakMap();
  }

  function getStats() {
    return { hits, misses };
  }

  function resetStats() {
    hits = 0;
    misses = 0;
  }

  return { getOrCompute, invalidate, clear, getStats, resetStats };
}

module.exports = { createHealthCache };
