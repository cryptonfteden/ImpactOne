require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../../test/dbHelpers");
const providerRunLogRepository = require("../providerRunLogRepository");
const providerQualityService = require("./providerQualityService");

test.beforeEach(async () => {
  await truncateAll();
});

test("computeQualityForRuns returns all-null dimensions honestly when there is no run history", () => {
  const result = providerQualityService.computeQualityForRuns([]);
  assert.equal(result.availability, null);
  assert.equal(result.dataQuality, null);
  assert.equal(result.freshness, null);
  assert.equal(result.completeness, null);
});

test("a provider returning SUCCESS with empty payloads never scores well on dataQuality, even though availability is 100%", () => {
  const runs = [
    { status: "SUCCESS", itemsFetched: 0, itemsPersisted: 0, startedAt: new Date() },
    { status: "SUCCESS", itemsFetched: 0, itemsPersisted: 0, startedAt: new Date() },
  ];
  const result = providerQualityService.computeQualityForRuns(runs);
  assert.equal(result.availability, 100, "the provider IS reachable — that dimension is honestly high");
  assert.equal(result.dataQuality, 0, "but it never returns real data — this must never look healthy");
  assert.equal(result.freshness, null, "no substantive run ever happened, so freshness is honestly unknown, not fabricated as recent");
});

test("dataQuality and completeness are independently computed — a provider can return real items that mostly fail to persist", () => {
  const runs = [{ status: "SUCCESS", itemsFetched: 100, itemsPersisted: 10, startedAt: new Date() }];
  const result = providerQualityService.computeQualityForRuns(runs);
  assert.equal(result.dataQuality, 100, "it did return real (non-empty) data");
  assert.equal(result.completeness, 10, "but only 10% of what it fetched actually persisted — a distinct, real signal");
});

test("FAILED runs count against availability but are excluded from dataQuality's denominator (never divide by unreachable attempts)", () => {
  const runs = [
    { status: "FAILED", itemsFetched: 0, itemsPersisted: 0, startedAt: new Date() },
    { status: "SUCCESS", itemsFetched: 5, itemsPersisted: 5, startedAt: new Date() },
  ];
  const result = providerQualityService.computeQualityForRuns(runs);
  assert.equal(result.availability, 50);
  assert.equal(result.dataQuality, 100, "of the 1 reachable run, 100% returned real data");
});

test("freshness reflects real elapsed time since the last SUBSTANTIVE run, not the last technically-successful one", () => {
  const oldSubstantive = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const recentEmpty = new Date(Date.now() - 1 * 60 * 60 * 1000);
  const runs = [
    { status: "SUCCESS", itemsFetched: 10, itemsPersisted: 10, startedAt: oldSubstantive },
    { status: "SUCCESS", itemsFetched: 0, itemsPersisted: 0, startedAt: recentEmpty },
  ];
  const result = providerQualityService.computeQualityForRuns(runs);
  assert.equal(result.freshness, 48, "the recent run was empty — it must not be reported as making the provider 'fresh'");
});

test("getProviderQuality reads real ProviderRunLog rows for a known provider and returns null for an unknown one", async () => {
  await providerRunLogRepository.createRunLog({ providerId: "sec", status: "SUCCESS", itemsFetched: 3, itemsPersisted: 3, itemsDeduped: 0 });
  const result = await providerQualityService.getProviderQuality("sec");
  assert.equal(result.providerId, "sec");
  assert.equal(result.totalRuns, 1);

  const unknown = await providerQualityService.getProviderQuality("does-not-exist");
  assert.equal(unknown, null);
});

test("getAllProviderQuality returns one entry per registered provider", async () => {
  const providerRegistry = require("../providers/providerRegistry");
  const results = await providerQualityService.getAllProviderQuality();
  assert.equal(results.length, providerRegistry.listProviders().length);
});
