const test = require("node:test");
const assert = require("node:assert/strict");
const { getTtlMsForNamespace, TTL_MS_BY_NAMESPACE, getTtlMsForProvider, PROVIDER_TTL_MS_BY_ID } = require("./providerCacheConfig");
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

// Phase PROVIDER-ABSTRACTION-002
test("getTtlMsForProvider: honestly returns 0 (caching disabled) for a provider with no explicit override — the safe, backward-compatible default", () => {
  assert.equal(getTtlMsForProvider("some-provider-with-no-override"), 0);
});

test("getTtlMsForProvider: returns the real, disclosed override when one is configured for a providerId", () => {
  const original = PROVIDER_TTL_MS_BY_ID.testProvider;
  PROVIDER_TTL_MS_BY_ID.testProvider = 12345;
  try {
    assert.equal(getTtlMsForProvider("testProvider"), 12345);
  } finally {
    if (original === undefined) delete PROVIDER_TTL_MS_BY_ID.testProvider;
    else PROVIDER_TTL_MS_BY_ID.testProvider = original;
  }
});
