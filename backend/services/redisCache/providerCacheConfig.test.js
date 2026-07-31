const test = require("node:test");
const assert = require("node:assert/strict");
const { getTtlMsForNamespace, TTL_MS_BY_NAMESPACE } = require("./providerCacheConfig");
const env = require("../../config/env");

test("getTtlMsForNamespace: returns the real, disclosed TTL for a named namespace", () => {
  assert.equal(getTtlMsForNamespace("priceHistory"), TTL_MS_BY_NAMESPACE.priceHistory);
});

test("getTtlMsForNamespace: falls back to the real global default for an unnamed namespace", () => {
  assert.equal(getTtlMsForNamespace("some-unnamed-namespace"), env.REDIS_CACHE_DEFAULT_TTL_MS);
});

test("every disclosed TTL is a real, positive, finite number", () => {
  for (const [namespace, ttlMs] of Object.entries(TTL_MS_BY_NAMESPACE)) {
    assert.ok(Number.isFinite(ttlMs) && ttlMs > 0, `namespace "${namespace}" must have a real positive TTL`);
  }
});
