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
