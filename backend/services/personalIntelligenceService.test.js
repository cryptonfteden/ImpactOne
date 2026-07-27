require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const userMemoryRepository = require("./userMemoryRepository");
const personalIntelligenceService = require("./personalIntelligenceService");
const betaUserRepository = require("./betaUserRepository");

let USER;

test.before(async () => {
  const inviteCode = "TEST-PERSONAL-INTELLIGENCE-001";
  const existing = await betaUserRepository.findByInviteCode(inviteCode);
  const betaUser = existing || (await betaUserRepository.createBetaUser({ label: "Personal Intelligence Test User", inviteCode }));
  USER = betaUser.id;
});

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
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "MSFT", sector: "Technology", betaUserId: USER });
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "MSFT", sector: "Technology", betaUserId: USER });

  const input = [
    rec({ symbol: "XOM", portfolioContext: { sector: "Energy" } }),
    rec({ symbol: "NVDA", portfolioContext: { sector: "Technology" } }),
  ];
  const ranked = await personalIntelligenceService.rankByUserRelevance(input, { betaUserId: USER });
  assert.equal(ranked[0].symbol, "NVDA", "the favorite-sector recommendation should rank first");
});

test("Phase PERSONALIZATION-PRIVACY-001 — rankByUserRelevance never boosts from another user's view history", async () => {
  const inviteCode = "TEST-PERSONAL-INTELLIGENCE-001-USER-B";
  const existing = await betaUserRepository.findByInviteCode(inviteCode);
  const userB = existing || (await betaUserRepository.createBetaUser({ label: "User B", inviteCode }));

  // User A views MSFT/Technology heavily.
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "MSFT", sector: "Technology", betaUserId: USER });
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "MSFT", sector: "Technology", betaUserId: USER });

  const input = [
    rec({ symbol: "XOM", portfolioContext: { sector: "Energy" } }),
    rec({ symbol: "NVDA", portfolioContext: { sector: "Technology" } }),
  ];
  // Ranking for User B must not see User A's Technology-sector interest.
  const ranked = await personalIntelligenceService.rankByUserRelevance(input, { betaUserId: userB.id });
  assert.equal(ranked[0].symbol, "XOM", "User B's ranking must preserve original order — User A's sector interest must not leak in as a boost");
});

test("rankByUserRelevance never invents an ignored-sector penalty for a sector with no real candidates elsewhere", async () => {
  const input = [rec({ symbol: "NVDA", portfolioContext: { sector: "Technology" } })];
  const ranked = await personalIntelligenceService.rankByUserRelevance(input);
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].symbol, "NVDA");
});

test("rankByUserRelevance boosts previously-viewed symbols via real view counts, capped", async () => {
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "NVDA", betaUserId: USER });
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "NVDA", betaUserId: USER });
  await userMemoryRepository.appendEvent({ eventType: "RECOMMENDATION_VIEWED", subject: "NVDA", betaUserId: USER });

  const input = [rec({ symbol: "AAPL" }), rec({ symbol: "NVDA" })];
  const ranked = await personalIntelligenceService.rankByUserRelevance(input, { betaUserId: USER });
  assert.equal(ranked[0].symbol, "NVDA");
});

test("rankByUserRelevance is a no-op for an empty or single-item list (no unnecessary queries)", async () => {
  assert.deepEqual(await personalIntelligenceService.rankByUserRelevance([]), []);
  const single = [rec()];
  assert.deepEqual(await personalIntelligenceService.rankByUserRelevance(single), single);
});
