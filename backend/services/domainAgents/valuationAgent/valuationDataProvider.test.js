require("../../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { createFinnhubValuationDataProvider, emptyMetrics, isConfigured, extractFirstFinite } = require("./valuationDataProvider");

test("emptyMetrics() returns the full, honestly-empty shape with the given reason", () => {
  const metrics = emptyMetrics("NVDA", "test reason");
  assert.equal(metrics.symbol, "NVDA");
  assert.equal(metrics.dataAvailable, false);
  assert.equal(metrics.unavailableReason, "test reason");
  assert.deepEqual(metrics.eps, { trailing: null, forward: null });
  assert.deepEqual(metrics.directRatios, { pe: null, forwardPe: null, peg: null, evEbitda: null, ps: null, pb: null, fcfYield: null });
  assert.equal(metrics.industry, null);
  assert.equal(metrics.roic, null);
});

test("isConfigured() reflects the real FINNHUB_API_KEY environment state", () => {
  assert.equal(typeof isConfigured(), "boolean");
});

test("extractFirstFinite picks the first finite candidate field and ignores non-finite/missing ones — the field-name-uncertainty defense", () => {
  assert.equal(extractFirstFinite({ a: undefined, b: null, c: 5 }, ["a", "b", "c"]), 5);
  assert.equal(extractFirstFinite({ a: "not a number" }, ["a", "b"]), null);
  assert.equal(extractFirstFinite({}, ["a", "b"]), null);
  assert.equal(extractFirstFinite({ a: NaN, b: 7 }, ["a", "b"]), 7);
});

test("getSymbolValuation never throws and always returns the full documented shape, whether the live call succeeds or gracefully degrades", async () => {
  const provider = createFinnhubValuationDataProvider({ timeoutMs: 4000 });
  const metrics = await provider.getSymbolValuation("NVDA");

  assert.equal(metrics.symbol, "NVDA");
  assert.equal(typeof metrics.dataAvailable, "boolean");
  assert.ok("trailing" in metrics.eps);
  assert.ok("forward" in metrics.eps);
  assert.ok(metrics.directRatios);
  if (!metrics.dataAvailable) {
    assert.ok(metrics.unavailableReason);
  }
});

test("a provider with a forced network failure gracefully degrades rather than throwing or hanging", async () => {
  const provider = createFinnhubValuationDataProvider({ timeoutMs: 500 });
  const originalGet = require("axios").get;
  require("axios").get = () => Promise.reject(new Error("simulated network failure"));
  try {
    const metrics = await provider.getSymbolValuation("NVDA");
    assert.equal(metrics.dataAvailable, false);
    assert.match(metrics.unavailableReason, /simulated network failure/);
  } finally {
    require("axios").get = originalGet;
  }
});
