require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { validateProviderShape } = require("./baseProviderContract");
const providerRegistry = require("./providerRegistry");

const EXPECTED_PROVIDER_IDS = [
  "reutersBloombergWire",
  "sec",
  "reddit",
  "x",
  "telegram",
  "polymarket",
  "fed",
  "ecb",
  "fomc",
  "fda",
  "nasa",
  "usTreasury",
  "congress",
  "majorEarnings",
  "patentFeeds",
  // Sprint 37 — Market Intelligence Source Layer.
  "finviz",
  "tipranks",
  "zacks",
  "spdr",
  "cftcCot",
  "coinglass",
  "optionsFlow",
];

test("listProviders registers all 22 named sources", () => {
  const ids = providerRegistry.listProviders().map((provider) => provider.providerId);
  assert.deepEqual([...ids].sort(), [...EXPECTED_PROVIDER_IDS].sort());
});

test("every registered provider conforms to the base provider contract", () => {
  for (const provider of providerRegistry.listProviders()) {
    const { valid, missingFields } = validateProviderShape(provider);
    assert.equal(valid, true, `${provider.providerId} is missing: ${missingFields.join(", ")}`);
  }
});

test("getProvider returns the matching provider by id", () => {
  const provider = providerRegistry.getProvider("sec");
  assert.equal(provider.providerId, "sec");
  assert.equal(provider.label, "SEC (EDGAR filings)");
});

test("getProvider returns null for an unknown id", () => {
  assert.equal(providerRegistry.getProvider("does-not-exist"), null);
});

test("provider ids are unique across the registry", () => {
  const ids = providerRegistry.listProviders().map((provider) => provider.providerId);
  assert.equal(new Set(ids).size, ids.length);
});
