require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const providerIngestionService = require("./providerIngestionService");
const providerRegistry = require("./providers/providerRegistry");
const providerDiagnosticsService = require("./providerDiagnosticsService");

test.beforeEach(async () => {
  await truncateAll();
});

function withMockedFetch(providerId, fetchImpl, run) {
  const provider = providerRegistry.getProvider(providerId);
  const originalFetch = provider.fetch;
  provider.fetch = fetchImpl;
  return run().finally(() => {
    provider.fetch = originalFetch;
  });
}

test("getDiagnosticsForProvider returns null for an unregistered provider", async () => {
  const diagnostics = await providerDiagnosticsService.getDiagnosticsForProvider("does-not-exist");
  assert.equal(diagnostics, null);
});

test("getDiagnosticsForProvider reports a conformant provider and no error history", async () => {
  const diagnostics = await providerDiagnosticsService.getDiagnosticsForProvider("sec");
  assert.equal(diagnostics.contractValid, true);
  assert.deepEqual(diagnostics.contractIssues, []);
  assert.equal(diagnostics.lastError, null);
  assert.ok(Number.isFinite(diagnostics.rateLimiter.maxPerMinute));
});

test("getDiagnosticsForProvider surfaces the most recent error message and timestamp", async () => {
  await withMockedFetch(
    "sec",
    async () => {
      throw new Error("upstream unavailable");
    },
    () => providerIngestionService.runProviderIngestion("sec")
  );

  const diagnostics = await providerDiagnosticsService.getDiagnosticsForProvider("sec");
  assert.ok(diagnostics.lastError);
  assert.match(diagnostics.lastError.message, /upstream unavailable/);
  assert.ok(diagnostics.lastError.occurredAt);
});

test("getDiagnosticsForProvider's rateLimiter state reflects real usage from the same limiter ingestion uses", async () => {
  await withMockedFetch("reddit", async () => [], () => providerIngestionService.runProviderIngestion("reddit"));

  const diagnostics = await providerDiagnosticsService.getDiagnosticsForProvider("reddit");
  assert.equal(diagnostics.rateLimiter.currentCount, 1, "the run above should have consumed exactly one unit of budget");
});

test("getDiagnosticsForProvider catches a deliberately malformed provider", async () => {
  const provider = providerRegistry.getProvider("nasa");
  const originalFetch = provider.fetch;
  delete provider.fetch;

  try {
    const diagnostics = await providerDiagnosticsService.getDiagnosticsForProvider("nasa");
    assert.equal(diagnostics.contractValid, false);
    assert.ok(diagnostics.contractIssues.includes("fetch"));
  } finally {
    provider.fetch = originalFetch;
  }
});
