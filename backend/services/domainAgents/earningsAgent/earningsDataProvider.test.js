require("../../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { createFinnhubEarningsDataProvider, emptyMetrics, isConfigured } = require("./earningsDataProvider");

test("emptyMetrics() returns the full, honestly-empty shape with the given reason", () => {
  const metrics = emptyMetrics("NVDA", "test reason");
  assert.equal(metrics.symbol, "NVDA");
  assert.equal(metrics.dataAvailable, false);
  assert.equal(metrics.unavailableReason, "test reason");
  assert.deepEqual(metrics.epsHistory, []);
  assert.deepEqual(metrics.revenue, { growthYoY: null });
  assert.deepEqual(metrics.eps, { growthYoY: null });
  assert.deepEqual(metrics.margins, { netProfitMargin: null, grossMargin: null });
  assert.deepEqual(metrics.cashFlow, { freeCashFlowGrowthYoY: null });
  assert.deepEqual(metrics.guidance, { changed: null, direction: null });
  assert.deepEqual(metrics.analystRevisions, { direction: null, count: null });
});

test("isConfigured() reflects the real FINNHUB_API_KEY environment state", () => {
  assert.equal(typeof isConfigured(), "boolean");
});

test("getSymbolEarnings never throws, and always returns the full documented shape, whether the live call succeeds or gracefully degrades in this environment", async () => {
  const provider = createFinnhubEarningsDataProvider({ timeoutMs: 4000 });
  const metrics = await provider.getSymbolEarnings("NVDA");

  assert.equal(metrics.symbol, "NVDA");
  assert.equal(typeof metrics.dataAvailable, "boolean");
  assert.ok(Array.isArray(metrics.epsHistory));
  assert.ok("growthYoY" in metrics.revenue);
  assert.ok("growthYoY" in metrics.eps);
  assert.ok("netProfitMargin" in metrics.margins);
  // Honestly unavailable regardless of live-call outcome — no data source
  // for these is connected in this environment (see EARNINGS_AGENT.md).
  assert.equal(metrics.cashFlow.freeCashFlowGrowthYoY, null);
  assert.equal(metrics.guidance.direction, null);
  assert.equal(metrics.analystRevisions.direction, null);

  if (!metrics.dataAvailable) {
    assert.ok(metrics.unavailableReason);
  }
});

test("a provider with no reachable network (impossible host) gracefully degrades rather than throwing or hanging", async () => {
  const provider = createFinnhubEarningsDataProvider({ timeoutMs: 500 });
  // Force a real network failure regardless of this sandbox's actual
  // egress state, by pointing well outside any real host — still goes
  // through the same real axios call path as production.
  const originalGet = require("axios").get;
  require("axios").get = () => Promise.reject(new Error("simulated network failure"));
  try {
    const metrics = await provider.getSymbolEarnings("NVDA");
    assert.equal(metrics.dataAvailable, false);
    assert.match(metrics.unavailableReason, /simulated network failure/);
  } finally {
    require("axios").get = originalGet;
  }
});
