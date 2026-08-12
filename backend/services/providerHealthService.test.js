require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const providerIngestionService = require("./providerIngestionService");
const providerHealthService = require("./providerHealthService");
const providerRegistry = require("./providers/providerRegistry");

test.beforeEach(async () => {
  await truncateAll();
});

test("getHealthSummary reports every registered provider, even ones with no run history yet", async () => {
  const summary = await providerHealthService.getHealthSummary();
  assert.equal(summary.length, providerRegistry.listProviders().length);
  const sec = summary.find((entry) => entry.providerId === "sec");
  assert.equal(sec.lastRunAt, null);
  assert.equal(sec.lastStatus, null);
  assert.equal(sec.successRate, null);
  assert.equal(sec.dataState, "NO_RUN_HISTORY");
});

test("getHealthSummary reflects a real run's outcome", async () => {
  await providerIngestionService.runProviderIngestion("reddit");
  const summary = await providerHealthService.getHealthSummary();
  const reddit = summary.find((entry) => entry.providerId === "reddit");
  assert.equal(reddit.lastStatus, "SUCCESS");
  assert.equal(reddit.successRate, 100);
  assert.equal(reddit.dataState, "NO_DATA");
  assert.equal(reddit.lastRunFetchedItems, 0);
  assert.ok(reddit.lastRunAt);
});

test("getHealthForProvider returns null for an unregistered provider", async () => {
  const result = await providerHealthService.getHealthForProvider("does-not-exist");
  assert.equal(result, null);
});

test("getHealthForProvider includes recentRuns for a known provider", async () => {
  await providerIngestionService.runProviderIngestion("nasa");
  const result = await providerHealthService.getHealthForProvider("nasa");
  assert.equal(result.providerId, "nasa");
  assert.equal(result.recentRuns.length, 1);
});
