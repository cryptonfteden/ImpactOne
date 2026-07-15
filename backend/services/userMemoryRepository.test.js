require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const userMemoryRepository = require("./userMemoryRepository");

test.beforeEach(async () => {
  await truncateAll();
});

test("appendEvent persists a real event and listEvents reads it back, most recent first", async () => {
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "NVDA", sector: "Technology" });
  await userMemoryRepository.appendEvent({ eventType: "THEME_VIEWED", subject: "ai" });

  const all = await userMemoryRepository.listEvents();
  assert.equal(all.length, 2);
  assert.equal(all[0].eventType, "THEME_VIEWED", "most recent event should come first");

  const onlyViews = await userMemoryRepository.listEvents({ eventType: "RECOMMENDATION_VIEWED" });
  assert.equal(onlyViews.length, 1);
  assert.equal(onlyViews[0].subject, "NVDA");
  assert.equal(onlyViews[0].sector, "Technology");
});

test("the repository exposes no update or delete method (append-only by design)", () => {
  const exportedNames = Object.keys(userMemoryRepository);
  assert.equal(exportedNames.some((name) => /update/i.test(name)), false, "no update-style export should ever exist");
  assert.equal(exportedNames.some((name) => /delete/i.test(name)), false, "no delete-style export should ever exist");
});

test("getSectorInterestSummary ranks favoriteSectors by real view count, most-viewed first", async () => {
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "NVDA", sector: "Technology" });
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "MSFT", sector: "Technology" });
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "XOM", sector: "Energy" });

  const summary = await userMemoryRepository.getSectorInterestSummary({ candidateSectors: ["Technology", "Energy", "Healthcare"] });
  assert.equal(summary.favoriteSectors[0].sector, "Technology");
  assert.equal(summary.favoriteSectors[0].viewCount, 2);
  assert.equal(summary.favoriteSectors[1].sector, "Energy");
});

test("getSectorInterestSummary only names an 'ignored' sector when it was a real candidate the user was actually offered", async () => {
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "NVDA", sector: "Technology" });

  const summary = await userMemoryRepository.getSectorInterestSummary({ candidateSectors: ["Technology", "Energy", "Healthcare"] });
  assert.deepEqual(summary.ignoredSectors.sort(), ["Energy", "Healthcare"]);

  const withNoCandidates = await userMemoryRepository.getSectorInterestSummary();
  assert.deepEqual(withNoCandidates.ignoredSectors, [], "never fabricates an ignored sector with no real candidate list");
});

test("getRecommendationViewCounts counts real views per symbol", async () => {
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "NVDA" });
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "NVDA" });
  await userMemoryRepository.appendEvent({ eventType: "THEME_VIEWED", subject: "ai" });

  const counts = await userMemoryRepository.getRecommendationViewCounts();
  assert.equal(counts.get("NVDA"), 2);
  assert.equal(counts.has("ai"), false, "theme views must not be counted as recommendation views");
});
