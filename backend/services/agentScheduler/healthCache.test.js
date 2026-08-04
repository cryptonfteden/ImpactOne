const test = require("node:test");
const assert = require("node:assert/strict");
const { createHealthCache } = require("./healthCache");

test("a cache miss computes and caches the result; a subsequent call within the TTL is a cache hit and never recomputes", async () => {
  let clock = 0;
  let computeCalls = 0;
  const cache = createHealthCache({ getTtlMs: () => 1000, now: () => clock });
  const agent = {};
  const compute = async () => {
    computeCalls += 1;
    return { status: "healthy" };
  };

  const first = await cache.getOrCompute(agent, compute);
  const second = await cache.getOrCompute(agent, compute);
  assert.equal(computeCalls, 1);
  assert.deepEqual(first, second);
  assert.deepEqual(cache.getStats(), { hits: 1, misses: 1 });
});

test("a cache entry recomputes once the TTL has elapsed", async () => {
  let clock = 0;
  let computeCalls = 0;
  const cache = createHealthCache({ getTtlMs: () => 100, now: () => clock });
  const agent = {};
  const compute = async () => {
    computeCalls += 1;
    return { status: "healthy", call: computeCalls };
  };

  await cache.getOrCompute(agent, compute);
  clock = 200; // past the 100ms TTL
  await cache.getOrCompute(agent, compute);
  assert.equal(computeCalls, 2);
});

test("caching is keyed by the agent object itself — two different agent objects never share a cached result, even with identical shape", async () => {
  const cache = createHealthCache({ getTtlMs: () => 1000 });
  const agentA = { id: "same-id" };
  const agentB = { id: "same-id" };

  await cache.getOrCompute(agentA, async () => ({ status: "healthy" }));
  let computedForB = false;
  await cache.getOrCompute(agentB, async () => {
    computedForB = true;
    return { status: "unavailable" };
  });

  assert.equal(computedForB, true, "a different object must never reuse another object's cached health result");
});

test("a TTL of 0 disables caching entirely — every call recomputes", async () => {
  let computeCalls = 0;
  const cache = createHealthCache({ getTtlMs: () => 0 });
  const agent = {};
  const compute = async () => {
    computeCalls += 1;
    return { status: "healthy" };
  };
  await cache.getOrCompute(agent, compute);
  await cache.getOrCompute(agent, compute);
  assert.equal(computeCalls, 2);
});

test("getTtlMs is re-read on every call, so a live config change takes effect immediately", async () => {
  let ttl = 1000;
  let clock = 0;
  let computeCalls = 0;
  const cache = createHealthCache({ getTtlMs: () => ttl, now: () => clock });
  const agent = {};
  const compute = async () => {
    computeCalls += 1;
    return { status: "healthy" };
  };

  await cache.getOrCompute(agent, compute);
  ttl = 0; // disable caching from here on
  await cache.getOrCompute(agent, compute);
  assert.equal(computeCalls, 2);
});

test("invalidate() forces the next call to recompute for that specific agent only", async () => {
  const cache = createHealthCache({ getTtlMs: () => 10000 });
  const agentA = {};
  const agentB = {};
  let callsA = 0;
  let callsB = 0;

  await cache.getOrCompute(agentA, async () => {
    callsA += 1;
    return { status: "healthy" };
  });
  await cache.getOrCompute(agentB, async () => {
    callsB += 1;
    return { status: "healthy" };
  });

  cache.invalidate(agentA);
  await cache.getOrCompute(agentA, async () => {
    callsA += 1;
    return { status: "healthy" };
  });
  await cache.getOrCompute(agentB, async () => {
    callsB += 1;
    return { status: "healthy" };
  });

  assert.equal(callsA, 2, "agentA was invalidated and must recompute");
  assert.equal(callsB, 1, "agentB was never invalidated and must still be served from cache");
});

test("clear() resets the whole cache; resetStats() zeroes the counters", async () => {
  const cache = createHealthCache({ getTtlMs: () => 10000 });
  const agent = {};
  await cache.getOrCompute(agent, async () => ({ status: "healthy" }));
  await cache.getOrCompute(agent, async () => ({ status: "healthy" }));
  assert.equal(cache.getStats().hits, 1);

  cache.resetStats();
  assert.deepEqual(cache.getStats(), { hits: 0, misses: 0 });

  let recomputed = false;
  cache.clear();
  await cache.getOrCompute(agent, async () => {
    recomputed = true;
    return { status: "healthy" };
  });
  assert.equal(recomputed, true, "clear() must force a recompute even well within the TTL");
});
