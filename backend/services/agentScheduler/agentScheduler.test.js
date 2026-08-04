const test = require("node:test");
const assert = require("node:assert/strict");
const { createAgentScheduler } = require("./agentScheduler");

function makeAgent({ id, priority = 5, execute, confidence, health, delayMs = 0 }) {
  return {
    metadata: { id, name: `${id} agent`, category: "TEST", priority },
    async execute(symbol) {
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
      return execute ? execute(symbol) : { summary: "ok", direction: null, evidence: [] };
    },
    confidence: confidence || (() => 50),
    health: health || (async () => ({ status: "healthy", reason: null })),
  };
}

test("runAgent returns a fulfilled record for a healthy, successful agent", async () => {
  const scheduler = createAgentScheduler({ concurrency: 5 });
  const record = await scheduler.runAgent(makeAgent({ id: "a", confidence: () => 88 }), "NVDA");
  assert.equal(record.status, "fulfilled");
  assert.equal(record.confidence, 88);
  assert.equal(record.attempts, 1);
  assert.ok(Number.isFinite(record.tookMs));
  assert.ok(Number.isFinite(record.waitMs));
});

test("runAgent skips execute() entirely for an unavailable agent (health-gated, same as the original orchestrator behavior)", async () => {
  const scheduler = createAgentScheduler({ concurrency: 5 });
  let executed = false;
  const agent = makeAgent({
    id: "sick",
    execute: () => {
      executed = true;
      return {};
    },
    health: async () => ({ status: "unavailable", reason: "not configured" }),
  });
  const record = await scheduler.runAgent(agent, "NVDA");
  assert.equal(executed, false);
  assert.equal(record.status, "unavailable");
});

test("runAgent enforces a per-agent timeout and reports 'timeout', never hanging", async () => {
  const scheduler = createAgentScheduler({ concurrency: 5 });
  const record = await scheduler.runAgent(makeAgent({ id: "slow", delayMs: 200 }), "NVDA", { timeoutMs: 20, maxRetries: 0 });
  assert.equal(record.status, "timeout");
});

test("runAgent retries a failing agent up to maxRetries with real backoff between attempts", async () => {
  const scheduler = createAgentScheduler({ concurrency: 5 });
  let calls = 0;
  const agent = makeAgent({
    id: "flaky",
    execute: () => {
      calls += 1;
      if (calls < 3) throw new Error("transient");
      return { summary: "ok", direction: null, evidence: [] };
    },
  });
  const record = await scheduler.runAgent(agent, "NVDA", { maxRetries: 2, baseDelayMs: 5, maxDelayMs: 50 });
  assert.equal(calls, 3);
  assert.equal(record.status, "fulfilled");
  assert.equal(record.attempts, 3);
});

test("runAgent reports 'error' with the real error message after exhausting retries", async () => {
  const scheduler = createAgentScheduler({ concurrency: 5 });
  const agent = makeAgent({
    id: "always-fails",
    execute: () => {
      throw new Error("permanent failure");
    },
  });
  const record = await scheduler.runAgent(agent, "NVDA", { maxRetries: 1, baseDelayMs: 5 });
  assert.equal(record.status, "error");
  assert.equal(record.attempts, 2);
  assert.equal(record.error, "permanent failure");
});

test("configurable concurrency limit: only N agents execute simultaneously, the rest queue", async () => {
  const scheduler = createAgentScheduler({ concurrency: 2 });
  let concurrentCount = 0;
  let maxConcurrentSeen = 0;
  const agent = (id) =>
    makeAgent({
      id,
      execute: async () => {
        concurrentCount += 1;
        maxConcurrentSeen = Math.max(maxConcurrentSeen, concurrentCount);
        await new Promise((resolve) => setTimeout(resolve, 30));
        concurrentCount -= 1;
        return { summary: "ok" };
      },
    });

  await Promise.all([
    scheduler.runAgent(agent("a"), "AAA"),
    scheduler.runAgent(agent("b"), "BBB"),
    scheduler.runAgent(agent("c"), "CCC"),
    scheduler.runAgent(agent("d"), "DDD"),
  ]);

  assert.ok(maxConcurrentSeen <= 2, `expected at most 2 concurrent executions, saw ${maxConcurrentSeen}`);
});

test("setConcurrencyLimit/getConcurrencyLimit change the real limit and immediately try to dispatch queued work", async () => {
  const scheduler = createAgentScheduler({ concurrency: 1 });
  assert.equal(scheduler.getConcurrencyLimit(), 1);

  let started = 0;
  const agent = (id) =>
    makeAgent({
      id,
      execute: async () => {
        started += 1;
        await new Promise((resolve) => setTimeout(resolve, 40));
        return { summary: "ok" };
      },
    });

  const p1 = scheduler.runAgent(agent("a"), "AAA");
  const p2 = scheduler.runAgent(agent("b"), "BBB");
  // With concurrency 1, "b" should still be queued at this point.
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(started, 1);

  scheduler.setConcurrencyLimit(2);
  await Promise.all([p1, p2]);
  assert.equal(started, 2);
});

test("priority scheduling: when concurrency is constrained, higher-priority agents are dispatched first", async () => {
  const scheduler = createAgentScheduler({ concurrency: 1 });
  const dispatchOrder = [];
  const agent = (id, priority) =>
    makeAgent({
      id,
      priority,
      execute: async () => {
        dispatchOrder.push(id);
        return { summary: "ok" };
      },
    });

  // Occupy the single slot first so the next three all queue up together.
  const blocker = scheduler.runAgent(
    makeAgent({
      id: "blocker",
      execute: async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return { summary: "ok" };
      },
    }),
    "SYM"
  );
  await new Promise((resolve) => setTimeout(resolve, 2)); // let the blocker actually occupy the slot

  const low = scheduler.runAgent(agent("low", 1), "SYM2");
  const high = scheduler.runAgent(agent("high", 9), "SYM3");
  const mid = scheduler.runAgent(agent("mid", 5), "SYM4");

  await Promise.all([blocker, low, high, mid]);
  assert.deepEqual(dispatchOrder, ["high", "mid", "low"]);
});

test("duplicate in-flight request prevention: two concurrent calls for the same agent+symbol share one execution", async () => {
  const scheduler = createAgentScheduler({ concurrency: 5 });
  let executionCount = 0;
  const agent = makeAgent({
    id: "shared",
    execute: async () => {
      executionCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { summary: "ok" };
    },
  });

  const [first, second] = await Promise.all([scheduler.runAgent(agent, "NVDA"), scheduler.runAgent(agent, "NVDA")]);
  assert.equal(executionCount, 1, "execute() must only really run once for the duplicate pair");
  assert.equal(first, second, "both callers receive the exact same result record");
  assert.equal(scheduler.getMetrics().totalDeduped, 1);
});

test("duplicate prevention is scoped to (agentId, symbol) — the same agent for a different symbol is not deduped", async () => {
  const scheduler = createAgentScheduler({ concurrency: 5 });
  let executionCount = 0;
  const agent = makeAgent({
    id: "shared",
    execute: async () => {
      executionCount += 1;
      return { summary: "ok" };
    },
  });

  await Promise.all([scheduler.runAgent(agent, "AAA"), scheduler.runAgent(agent, "BBB")]);
  assert.equal(executionCount, 2);
});

test("cancelJob() gracefully cancels a still-queued job before it ever executes", async () => {
  const scheduler = createAgentScheduler({ concurrency: 1 });
  let blockerStarted = false;
  const blocker = scheduler.runAgent(
    makeAgent({
      id: "blocker",
      execute: async () => {
        blockerStarted = true;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { summary: "ok" };
      },
    }),
    "SYM"
  );
  await new Promise((resolve) => setTimeout(resolve, 2));
  assert.equal(blockerStarted, true);

  let queuedExecuted = false;
  const queuedPromise = scheduler.runAgent(
    makeAgent({
      id: "queued",
      execute: async () => {
        queuedExecuted = true;
        return { summary: "should never run" };
      },
    }),
    "SYM2"
  );

  // Find the queued job's id via metrics is not exposed; cancel by symbol instead (the simpler, real public API).
  scheduler.cancelSymbol("SYM2");
  const queuedRecord = await queuedPromise;
  await blocker;

  assert.equal(queuedExecuted, false, "a cancelled queued job must never call execute()");
  assert.equal(queuedRecord.error, "CANCELLED");
});

test("cancelSymbol() aborts a job that is already mid-execution (its timeout race), resolving gracefully rather than hanging", async () => {
  const scheduler = createAgentScheduler({ concurrency: 5 });
  const agent = makeAgent({
    id: "long-runner",
    execute: async () => {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return { summary: "should never get here" };
    },
  });

  const promise = scheduler.runAgent(agent, "NVDA", { timeoutMs: 10000, maxRetries: 0 });
  await new Promise((resolve) => setTimeout(resolve, 10));
  const cancelledSomething = scheduler.cancelSymbol("NVDA");
  const record = await promise;

  assert.equal(cancelledSomething, true);
  assert.equal(record.error, "CANCELLED");
  assert.equal(scheduler.getMetrics().totalCancelled, 1);
});

test("getMetrics reports real, internally-consistent numbers after a mixed batch", async () => {
  const scheduler = createAgentScheduler({ concurrency: 5 });
  await scheduler.runAgent(makeAgent({ id: "ok1" }), "AAA");
  await scheduler.runAgent(makeAgent({ id: "sick", health: async () => ({ status: "unavailable", reason: "x" }) }), "BBB");
  await scheduler.runAgent(makeAgent({ id: "slow", delayMs: 100 }), "CCC", { timeoutMs: 10, maxRetries: 0 });

  const metrics = scheduler.getMetrics();
  assert.equal(metrics.totalScheduled, 3);
  assert.equal(metrics.totalCompleted, 3);
  assert.equal(metrics.totalSucceeded, 1);
  assert.equal(metrics.totalUnavailable, 1);
  assert.equal(metrics.totalTimedOut, 1);
  assert.equal(metrics.activeCount, 0, "no job should still be marked active once every promise has settled");
  assert.equal(metrics.concurrencyLimit, 5);
});

test("reset() clears scheduler state for a fresh start", async () => {
  const scheduler = createAgentScheduler({ concurrency: 5 });
  await scheduler.runAgent(makeAgent({ id: "a" }), "NVDA");
  assert.ok(scheduler.getMetrics().totalScheduled > 0);
  scheduler.reset();
  const metrics = scheduler.getMetrics();
  assert.equal(metrics.totalScheduled, 0);
  assert.equal(metrics.activeCount, 0);
  assert.equal(metrics.queueDepth, 0);
});

test("setConcurrencyLimit rejects a non-positive or non-finite limit", () => {
  const scheduler = createAgentScheduler();
  assert.throws(() => scheduler.setConcurrencyLimit(0));
  assert.throws(() => scheduler.setConcurrencyLimit(-5));
  assert.throws(() => scheduler.setConcurrencyLimit(NaN));
});

test("runAll runs a whole agent list through the same scheduler and preserves per-agent identity in the results", async () => {
  const scheduler = createAgentScheduler({ concurrency: 5 });
  const results = await scheduler.runAll(
    [makeAgent({ id: "a", confidence: () => 10 }), makeAgent({ id: "b", confidence: () => 90 })],
    "NVDA"
  );
  assert.deepEqual(results.map((r) => r.agentId).sort(), ["a", "b"]);
});

// --- PLATFORM-HARDENING-001: scheduler configuration object + health cache ---

test("getConfig exposes every live scheduler config field, seeded from constructor overrides", () => {
  const scheduler = createAgentScheduler({ concurrency: 3, timeoutMs: 999 });
  const config = scheduler.getConfig();
  assert.equal(config.concurrency, 3);
  assert.equal(config.timeoutMs, 999);
  assert.ok(Number.isFinite(config.healthCacheTtlMs));
});

test("updateConfig changes live behavior for subsequent calls without reconstructing the scheduler", async () => {
  const scheduler = createAgentScheduler({ concurrency: 5, maxRetries: 0 });
  let calls = 0;
  const agent = makeAgent({
    id: "flaky",
    execute: () => {
      calls += 1;
      throw new Error("always fails");
    },
  });

  await scheduler.runAgent(agent, "AAA");
  assert.equal(calls, 1, "maxRetries:0 by default — a single attempt only");

  scheduler.updateConfig({ maxRetries: 2, baseDelayMs: 1, maxDelayMs: 5 });
  await scheduler.runAgent(agent, "BBB");
  assert.equal(calls, 4, "1 initial + 2 retries after updateConfig raised maxRetries to 2, on top of the first call's 1 attempt");
});

test("updateConfig rejects an invalid value and leaves the live config untouched", () => {
  const scheduler = createAgentScheduler({ concurrency: 5 });
  assert.throws(() => scheduler.updateConfig({ concurrency: -1 }));
  assert.equal(scheduler.getConfig().concurrency, 5);
});

test("getConcurrencyLimit/setConcurrencyLimit remain backward-compatible thin wrappers over the config object", () => {
  const scheduler = createAgentScheduler({ concurrency: 4 });
  assert.equal(scheduler.getConcurrencyLimit(), 4);
  scheduler.setConcurrencyLimit(8);
  assert.equal(scheduler.getConcurrencyLimit(), 8);
  assert.equal(scheduler.getConfig().concurrency, 8, "setConcurrencyLimit must update the same underlying config the rest of the scheduler reads from");
});

test("a healthy agent's health() is cached across repeated executions against different symbols (real health-cache hit)", async () => {
  const scheduler = createAgentScheduler({ concurrency: 5, healthCacheTtlMs: 10000 });
  let healthCalls = 0;
  const agent = makeAgent({
    id: "cached",
    health: async () => {
      healthCalls += 1;
      return { status: "healthy", reason: null };
    },
  });

  await scheduler.runAgent(agent, "AAA");
  await scheduler.runAgent(agent, "BBB");
  assert.equal(healthCalls, 1, "the second call must be served from the health cache, not a fresh health() call");
  assert.equal(scheduler.getHealthCacheStats().hits, 1);
});

test("setting healthCacheTtlMs to 0 via updateConfig disables health caching for subsequent calls", async () => {
  const scheduler = createAgentScheduler({ concurrency: 5, healthCacheTtlMs: 10000 });
  let healthCalls = 0;
  const agent = makeAgent({
    id: "uncached",
    health: async () => {
      healthCalls += 1;
      return { status: "healthy", reason: null };
    },
  });

  await scheduler.runAgent(agent, "AAA");
  scheduler.updateConfig({ healthCacheTtlMs: 0 });
  await scheduler.runAgent(agent, "BBB");
  assert.equal(healthCalls, 2);
});

test("reset() also clears the health cache and its stats", async () => {
  const scheduler = createAgentScheduler({ concurrency: 5, healthCacheTtlMs: 10000 });
  const agent = makeAgent({ id: "a" });
  await scheduler.runAgent(agent, "AAA");
  await scheduler.runAgent(agent, "BBB");
  assert.ok(scheduler.getHealthCacheStats().hits >= 1);

  scheduler.reset();
  assert.deepEqual(scheduler.getHealthCacheStats(), { hits: 0, misses: 0 });
});
