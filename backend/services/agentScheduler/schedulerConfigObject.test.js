const test = require("node:test");
const assert = require("node:assert/strict");
const { createSchedulerConfig } = require("./schedulerConfigObject");

test("a fresh config seeds every field from the shared defaults when no overrides are given", () => {
  const config = createSchedulerConfig();
  const snapshot = config.get();
  assert.ok(Number.isFinite(snapshot.concurrency));
  assert.ok(Number.isFinite(snapshot.timeoutMs));
  assert.ok(Number.isFinite(snapshot.maxRetries));
  assert.ok(Number.isFinite(snapshot.baseDelayMs));
  assert.ok(Number.isFinite(snapshot.maxDelayMs));
  assert.ok(Number.isFinite(snapshot.agingFactorPerMs));
  assert.ok(Number.isFinite(snapshot.healthCacheTtlMs));
});

test("constructor overrides win over the shared defaults", () => {
  const config = createSchedulerConfig({ concurrency: 7, timeoutMs: 1234 });
  const snapshot = config.get();
  assert.equal(snapshot.concurrency, 7);
  assert.equal(snapshot.timeoutMs, 1234);
});

test("update() applies a valid partial change and returns the new full snapshot", () => {
  const config = createSchedulerConfig({ concurrency: 5 });
  const updated = config.update({ concurrency: 10 });
  assert.equal(updated.concurrency, 10);
  assert.equal(config.get().concurrency, 10);
});

test("get() returns a real copy — mutating the returned object never affects the live config", () => {
  const config = createSchedulerConfig({ concurrency: 5 });
  const snapshot = config.get();
  snapshot.concurrency = 999;
  assert.equal(config.get().concurrency, 5);
});

test("update() rejects an unknown field and applies nothing from that call", () => {
  const config = createSchedulerConfig({ concurrency: 5 });
  assert.throws(() => config.update({ notARealField: 1 }), /Unknown scheduler config field/);
  assert.equal(config.get().concurrency, 5);
});

test("update() rejects an invalid value for a real field (all-or-nothing on a mixed invalid batch)", () => {
  const config = createSchedulerConfig({ concurrency: 5, timeoutMs: 1000 });
  assert.throws(() => config.update({ concurrency: 10, timeoutMs: -1 }), /Invalid scheduler config value/);
  // Neither field should have changed — the whole update is validated before anything is applied.
  assert.equal(config.get().concurrency, 5);
  assert.equal(config.get().timeoutMs, 1000);
});

test("maxRetries must be a non-negative integer; concurrency/timeoutMs/backoff bounds must be positive/non-negative finite numbers", () => {
  const config = createSchedulerConfig();
  assert.throws(() => config.update({ maxRetries: 1.5 }));
  assert.throws(() => config.update({ maxRetries: -1 }));
  assert.throws(() => config.update({ concurrency: 0 }));
  assert.throws(() => config.update({ timeoutMs: 0 }));
  assert.throws(() => config.update({ baseDelayMs: -1 }));
  assert.doesNotThrow(() => config.update({ agingFactorPerMs: 0, healthCacheTtlMs: 0 }));
});
