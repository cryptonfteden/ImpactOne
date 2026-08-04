const test = require("node:test");
const assert = require("node:assert/strict");

const { createLimiter } = require("./rateLimiter");

test("tryAcquire allows up to maxPerMinute calls within the window", () => {
  const limiter = createLimiter({ maxPerMinute: 3 });
  assert.equal(limiter.tryAcquire(), true);
  assert.equal(limiter.tryAcquire(), true);
  assert.equal(limiter.tryAcquire(), true);
});

test("tryAcquire denies once the window's budget is exhausted", () => {
  const limiter = createLimiter({ maxPerMinute: 2 });
  assert.equal(limiter.tryAcquire(), true);
  assert.equal(limiter.tryAcquire(), true);
  assert.equal(limiter.tryAcquire(), false);
});

test("two independent limiters track separate budgets", () => {
  const a = createLimiter({ maxPerMinute: 1 });
  const b = createLimiter({ maxPerMinute: 1 });
  assert.equal(a.tryAcquire(), true);
  assert.equal(b.tryAcquire(), true);
  assert.equal(a.tryAcquire(), false);
});

test("getState reports the configured budget and current usage without consuming it", () => {
  const limiter = createLimiter({ maxPerMinute: 5 });
  limiter.tryAcquire();
  limiter.tryAcquire();

  const first = limiter.getState();
  assert.equal(first.maxPerMinute, 5);
  assert.equal(first.currentCount, 2);
  assert.ok(first.windowResetInMs > 0 && first.windowResetInMs <= 60_000);

  const second = limiter.getState();
  assert.equal(second.currentCount, 2, "getState must be read-only — calling it twice must not change the count");
});

test("getState reflects a fresh window (currentCount 0) before any tryAcquire call", () => {
  const limiter = createLimiter({ maxPerMinute: 10 });
  const state = limiter.getState();
  assert.equal(state.currentCount, 0);
  assert.equal(state.maxPerMinute, 10);
});
