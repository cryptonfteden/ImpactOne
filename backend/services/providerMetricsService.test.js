require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const providerIngestionService = require("./providerIngestionService");
const providerRegistry = require("./providers/providerRegistry");
const providerMetricsService = require("./providerMetricsService");

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

test("getMetricsForProvider returns an honest zero-state for a provider with no run history", async () => {
  const metrics = await providerMetricsService.getMetricsForProvider("sec");
  assert.equal(metrics.totalRuns, 0);
  assert.equal(metrics.dedupRate, null);
  assert.equal(metrics.errorRate, null);
  assert.equal(metrics.lastSuccessAt, null);
});

test("getMetricsForProvider returns null for an unregistered provider", async () => {
  const metrics = await providerMetricsService.getMetricsForProvider("does-not-exist");
  assert.equal(metrics, null);
});

test("getMetricsForProvider aggregates totals and dedup rate across multiple runs", async () => {
  const publishedAt = new Date().toISOString();
  await withMockedFetch(
    "sec",
    async () => {
      // Same two items every call (fixed publishedAt/sourceUrl), so the
      // second run's items dedupe against the first run's, not create new
      // dedupe keys of their own.
      return [
        { headline: "Filing A", sourceName: "SEC", sourceUrl: "https://sec.example.gov/a", publishedAt },
        { headline: "Filing B", sourceName: "SEC", sourceUrl: "https://sec.example.gov/b", publishedAt },
      ];
    },
    async () => {
      await providerIngestionService.runProviderIngestion("sec");
      await providerIngestionService.runProviderIngestion("sec");
    }
  );

  const metrics = await providerMetricsService.getMetricsForProvider("sec");
  assert.equal(metrics.totalRuns, 2);
  assert.equal(metrics.totalItemsFetched, 4);
  assert.equal(metrics.totalItemsPersisted, 2);
  assert.equal(metrics.totalItemsDeduped, 2);
  assert.equal(metrics.dedupRate, 50);
  assert.equal(metrics.errorRate, 0);
  assert.ok(metrics.lastSuccessAt);
});

test("getMetricsForProvider computes a nonzero errorRate when a run fails", async () => {
  await withMockedFetch(
    "sec",
    async () => {
      throw new Error("upstream unavailable");
    },
    () => providerIngestionService.runProviderIngestion("sec")
  );

  const metrics = await providerMetricsService.getMetricsForProvider("sec");
  assert.equal(metrics.totalRuns, 1);
  assert.equal(metrics.errorRate, 100);
  assert.equal(metrics.lastSuccessAt, null);
});
