require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const providerRegistry = require("./providers/providerRegistry");
const canonicalEventRepository = require("./canonicalEventRepository");
const providerRunLogRepository = require("./providerRunLogRepository");
const providerIngestionService = require("./providerIngestionService");

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

test("runProviderIngestion persists new items and records a SUCCESS run log", async () => {
  await withMockedFetch("sec", async () => [
    { headline: "New 10-K filed", sourceName: "SEC", sourceUrl: "https://sec.example.gov/1", publishedAt: new Date().toISOString() },
  ], async () => {
    const result = await providerIngestionService.runProviderIngestion("sec");
    assert.equal(result.status, "SUCCESS");
    assert.equal(result.itemsFetched, 1);
    assert.equal(result.itemsPersisted, 1);
    assert.equal(result.itemsDeduped, 0);

    const stored = await canonicalEventRepository.listRecent({ providerId: "sec" });
    assert.equal(stored.length, 1);
  });
});

test("runProviderIngestion dedupes items already seen on a second run", async () => {
  const fetchImpl = async () => [
    { headline: "Same filing", sourceName: "SEC", sourceUrl: "https://sec.example.gov/2", publishedAt: "2026-01-01T00:00:00.000Z" },
  ];
  await withMockedFetch("sec", fetchImpl, async () => {
    await providerIngestionService.runProviderIngestion("sec");
    const second = await providerIngestionService.runProviderIngestion("sec");
    assert.equal(second.itemsPersisted, 0);
    assert.equal(second.itemsDeduped, 1);
  });
});

test("runProviderIngestion never throws when fetch() fails, and records a FAILED run log", async () => {
  await withMockedFetch("sec", async () => {
    throw new Error("upstream unavailable");
  }, async () => {
    const result = await providerIngestionService.runProviderIngestion("sec");
    assert.equal(result.status, "FAILED");
    assert.ok(result.errorMessage.includes("upstream unavailable"));

    const runs = await providerRunLogRepository.getRecentRunsForProvider("sec");
    assert.equal(runs.length, 1);
    assert.equal(runs[0].status, "FAILED");
  });
});

test("runProviderIngestion returns a clean itemsFetched: 0 SUCCESS run for a stub provider (no error)", async () => {
  const result = await providerIngestionService.runProviderIngestion("reddit");
  assert.equal(result.status, "SUCCESS");
  assert.equal(result.itemsFetched, 0);
});

test("runProviderIngestion records a FAILED run for an unknown providerId, without throwing", async () => {
  const result = await providerIngestionService.runProviderIngestion("does-not-exist");
  assert.equal(result.status, "FAILED");
  assert.match(result.errorMessage, /Unknown provider/);
});

test("runProviderIngestion never calls the recommendation or verdict pipeline", async () => {
  // Static guarantee is asserted by grep in the closeout verification, but
  // this exercises a full real run and confirms no recommendation-related
  // side effect (e.g. no Recommendation row) is created.
  const { getPrismaClient } = require("../db/prismaClient");
  const prisma = getPrismaClient();
  const before = await prisma.recommendation.count();

  await withMockedFetch("sec", async () => [
    { headline: "Filing", sourceName: "SEC", sourceUrl: "https://sec.example.gov/3", publishedAt: new Date().toISOString() },
  ], () => providerIngestionService.runProviderIngestion("sec"));

  const after = await prisma.recommendation.count();
  assert.equal(after, before);
});
