require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const userMemoryRepository = require("./userMemoryRepository");
const betaUserRepository = require("./betaUserRepository");

let USER;

test.before(async () => {
  const inviteCode = "TEST-USER-MEMORY-REPOSITORY-001";
  const existing = await betaUserRepository.findByInviteCode(inviteCode);
  const betaUser = existing || (await betaUserRepository.createBetaUser({ label: "User Memory Repository Test User", inviteCode }));
  USER = betaUser.id;
});

test.beforeEach(async () => {
  await truncateAll();
});

test("appendEvent persists a real event and listEvents reads it back, most recent first", async () => {
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "NVDA", sector: "Technology", betaUserId: USER });
  await userMemoryRepository.appendEvent({ eventType: "THEME_VIEWED", subject: "ai", betaUserId: USER });

  const all = await userMemoryRepository.listEvents({ betaUserId: USER });
  assert.equal(all.length, 2);
  assert.equal(all[0].eventType, "THEME_VIEWED", "most recent event should come first");

  const onlyViews = await userMemoryRepository.listEvents({ eventType: "RECOMMENDATION_VIEWED", betaUserId: USER });
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
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "NVDA", sector: "Technology", betaUserId: USER });
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "MSFT", sector: "Technology", betaUserId: USER });
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "XOM", sector: "Energy", betaUserId: USER });

  const summary = await userMemoryRepository.getSectorInterestSummary({ candidateSectors: ["Technology", "Energy", "Healthcare"], betaUserId: USER });
  assert.equal(summary.favoriteSectors[0].sector, "Technology");
  assert.equal(summary.favoriteSectors[0].viewCount, 2);
  assert.equal(summary.favoriteSectors[1].sector, "Energy");
});

test("getSectorInterestSummary only names an 'ignored' sector when it was a real candidate the user was actually offered", async () => {
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "NVDA", sector: "Technology", betaUserId: USER });

  const summary = await userMemoryRepository.getSectorInterestSummary({ candidateSectors: ["Technology", "Energy", "Healthcare"], betaUserId: USER });
  assert.deepEqual(summary.ignoredSectors.sort(), ["Energy", "Healthcare"]);

  const withNoCandidates = await userMemoryRepository.getSectorInterestSummary({ betaUserId: USER });
  assert.deepEqual(withNoCandidates.ignoredSectors, [], "never fabricates an ignored sector with no real candidate list");
});

test("getRecommendationViewCounts counts real views per symbol", async () => {
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "NVDA", betaUserId: USER });
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "NVDA", betaUserId: USER });
  await userMemoryRepository.appendEvent({ eventType: "THEME_VIEWED", subject: "ai", betaUserId: USER });

  const counts = await userMemoryRepository.getRecommendationViewCounts({ betaUserId: USER });
  assert.equal(counts.get("NVDA"), 2);
  assert.equal(counts.has("ai"), false, "theme views must not be counted as recommendation views");
});

// Phase PERSONALIZATION-PRIVACY-001 — the actual bug this phase closes:
// every read below must return a real, honest, empty-or-scoped result
// with no real betaUserId, and must never surface another user's data.
test("Phase PERSONALIZATION-PRIVACY-001 — every read returns an honest empty result with no betaUserId, never a cross-user blend", async () => {
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "NVDA", sector: "Technology", betaUserId: USER });
  await userMemoryRepository.appendEvent({ eventType: "THEME_VIEWED", subject: "ai", betaUserId: USER });

  assert.deepEqual(await userMemoryRepository.listEvents(), []);
  assert.deepEqual(await userMemoryRepository.getSectorInterestSummary({ candidateSectors: ["Technology"] }), { favoriteSectors: [], ignoredSectors: [] });
  assert.deepEqual(await userMemoryRepository.getThemeInterestSummary(), { favoriteThemes: [] });
  assert.equal((await userMemoryRepository.getRecommendationViewCounts()).size, 0);
});

test("Phase PERSONALIZATION-PRIVACY-001 — one user's real activity never appears in another user's reads (multi-user isolation)", async () => {
  const inviteCode = "TEST-USER-MEMORY-REPOSITORY-001-USER-B";
  const existing = await betaUserRepository.findByInviteCode(inviteCode);
  const userB = existing || (await betaUserRepository.createBetaUser({ label: "User B", inviteCode }));

  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "NVDA", sector: "Technology", betaUserId: USER });
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "NVDA", sector: "Technology", betaUserId: USER });
  await userMemoryRepository.appendEvent({ eventType: "THEME_VIEWED", subject: "ai", betaUserId: USER });

  // User B has done nothing — every one of their reads must be honestly empty.
  const userBEvents = await userMemoryRepository.listEvents({ betaUserId: userB.id });
  assert.deepEqual(userBEvents, [], "User B must never see User A's events");

  const userBSectors = await userMemoryRepository.getSectorInterestSummary({ candidateSectors: ["Technology"], betaUserId: userB.id });
  assert.deepEqual(userBSectors.favoriteSectors, [], "User B must never inherit User A's favorite sectors");

  const userBThemes = await userMemoryRepository.getThemeInterestSummary({ betaUserId: userB.id });
  assert.deepEqual(userBThemes.favoriteThemes, [], "User B must never inherit User A's favorite themes");

  const userBViewCounts = await userMemoryRepository.getRecommendationViewCounts({ betaUserId: userB.id });
  assert.equal(userBViewCounts.size, 0, "User B must never inherit User A's view counts");

  // User A's own reads must still see their real data, unaffected by User B's presence.
  const userAEvents = await userMemoryRepository.listEvents({ betaUserId: USER });
  assert.equal(userAEvents.length, 3);
});
