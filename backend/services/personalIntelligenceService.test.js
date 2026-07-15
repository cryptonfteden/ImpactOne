require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const userMemoryRepository = require("./userMemoryRepository");
const personalIntelligenceService = require("./personalIntelligenceService");

function rec(overrides = {}) {
  return {
    symbol: "NVDA",
    action: "BUY",
    qualityScore: 70,
    timeHorizon: "1-3 months",
    reasoning: "Test reasoning.",
    portfolioContext: null,
    ...overrides,
  };
}

test.beforeEach(async () => {
  await truncateAll();
});

test("rankByUserRelevance never mutates any field on the input recommendations, only reorders", async () => {
  const input = [rec({ symbol: "NVDA" }), rec({ symbol: "AAPL" })];
  const inputSnapshot = JSON.parse(JSON.stringify(input));

  const ranked = await personalIntelligenceService.rankByUserRelevance(input);
  assert.deepEqual(JSON.parse(JSON.stringify(input)), inputSnapshot, "input array/objects must never be mutated");
  for (const item of ranked) {
    assert.ok(input.includes(item), "every ranked item must be a reference to an original input object, never a copy or a fabricated one");
  }
});

test("rankByUserRelevance boosts a recommendation whose sector the user has actually viewed before", async () => {
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "MSFT", sector: "Technology" });
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "MSFT", sector: "Technology" });

  const input = [
    rec({ symbol: "XOM", portfolioContext: { sector: "Energy" } }),
    rec({ symbol: "NVDA", portfolioContext: { sector: "Technology" } }),
  ];
  const ranked = await personalIntelligenceService.rankByUserRelevance(input);
  assert.equal(ranked[0].symbol, "NVDA", "the favorite-sector recommendation should rank first");
});

test("rankByUserRelevance never invents an ignored-sector penalty for a sector with no real candidates elsewhere", async () => {
  const input = [rec({ symbol: "NVDA", portfolioContext: { sector: "Technology" } })];
  const ranked = await personalIntelligenceService.rankByUserRelevance(input);
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].symbol, "NVDA");
});

test("rankByUserRelevance boosts previously-viewed symbols via real view counts, capped", async () => {
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "NVDA" });
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "NVDA" });
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "NVDA" });

  const input = [rec({ symbol: "AAPL" }), rec({ symbol: "NVDA" })];
  const ranked = await personalIntelligenceService.rankByUserRelevance(input);
  assert.equal(ranked[0].symbol, "NVDA");
});

test("rankByUserRelevance is a no-op for an empty or single-item list (no unnecessary queries)", async () => {
  assert.deepEqual(await personalIntelligenceService.rankByUserRelevance([]), []);
  const single = [rec()];
  assert.deepEqual(await personalIntelligenceService.rankByUserRelevance(single), single);
});
