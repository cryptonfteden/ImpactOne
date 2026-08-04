const test = require("node:test");
const assert = require("node:assert/strict");

const { validateProviderShape } = require("./baseProviderContract");

function validProvider(overrides = {}) {
  return {
    providerId: "sec",
    label: "SEC",
    sourceType: "regulatory-filing",
    category: "regulation",
    defaultThemes: [],
    rateLimit: { maxPerMinute: 10 },
    fetch: async () => [],
    ...overrides,
  };
}

test("validateProviderShape passes a well-formed provider", () => {
  const result = validateProviderShape(validProvider());
  assert.equal(result.valid, true);
  assert.deepEqual(result.missingFields, []);
});

test("validateProviderShape catches a missing providerId", () => {
  const provider = validProvider();
  delete provider.providerId;
  const result = validateProviderShape(provider);
  assert.equal(result.valid, false);
  assert.ok(result.missingFields.includes("providerId"));
});

test("validateProviderShape catches a missing fetch function", () => {
  const provider = validProvider({ fetch: undefined });
  const result = validateProviderShape(provider);
  assert.equal(result.valid, false);
  assert.ok(result.missingFields.includes("fetch"));
});

test("validateProviderShape catches a malformed rateLimit", () => {
  const provider = validProvider({ rateLimit: { maxPerMinute: "fast" } });
  const result = validateProviderShape(provider);
  assert.equal(result.valid, false);
  assert.ok(result.missingFields.includes("rateLimit.maxPerMinute"));
});

test("validateProviderShape catches a non-array defaultThemes", () => {
  const provider = validProvider({ defaultThemes: "ai" });
  const result = validateProviderShape(provider);
  assert.equal(result.valid, false);
  assert.ok(result.missingFields.includes("defaultThemes"));
});
