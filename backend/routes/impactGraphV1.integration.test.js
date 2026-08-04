require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { truncateAll } = require("../test/dbHelpers");
const app = require("../app");
const { getPrismaClient } = require("../db/prismaClient");
const watchlistFolderService = require("../services/watchlistFolderService");
const finnhubService = require("../services/finnhubService");
const betaUserRepository = require("../services/betaUserRepository");

// Real HTTP requests need a real, persisted BetaUser row for the header
// to be honored by the real betaUserContext middleware.
let USER;
test.before(async () => {
  const inviteCode = "TEST-IMPACT-GRAPH-V1";
  const existing = await betaUserRepository.findByInviteCode(inviteCode);
  const betaUser = existing || (await betaUserRepository.createBetaUser({ label: "Impact Graph Test User", inviteCode }));
  USER = betaUser.id;
});

test.beforeEach(async () => {
  await truncateAll();
});

test("symbol endpoint returns an honest NO_DATA for a symbol with no real WorldMemoryRecord", async () => {
  const response = await request(app).get("/api/v2/impact-graph/ZZZZ");
  assert.equal(response.status, 200);
  assert.equal(response.body.status, "NO_DATA");
});

test("portfolio endpoint is honest with zero open positions", async () => {
  const response = await request(app).get("/api/v2/impact-graph/portfolio").set("X-Beta-User-Id", USER);
  assert.equal(response.status, 200);
  assert.equal(response.body.status, "NO_DATA");
  assert.match(response.body.message, /No open positions/);
});

test("portfolio endpoint merges real per-symbol graphs for real held positions", async () => {
  const prisma = getPrismaClient();
  const cause = await prisma.worldMemoryRecord.create({ data: { occurredAt: new Date(), symbols: ["TSM"], sectors: [], headline: "Taiwan tension" } });
  const effect = await prisma.worldMemoryRecord.create({ data: { occurredAt: new Date(), symbols: ["NVDA"], sectors: [], headline: "NVDA supply risk" } });
  await prisma.worldMemoryCausalLink.create({ data: { causeRecordId: cause.id, effectRecordId: effect.id, explanation: "real link", confidence: 55, methodologyVersion: "x4-v1" } });

  const originalGetQuote = finnhubService.getQuote;
  finnhubService.getQuote = async (symbol) => ({ quote: { symbol, price: 200, marketCap: 1e12, volume: 1e7 } });
  try {
    await request(app).post(`/api/v2/portfolio/orders`).set("X-Beta-User-Id", USER).send({ symbol: "NVDA", side: "BUY", quantity: 1 });
    const response = await request(app).get("/api/v2/impact-graph/portfolio").set("X-Beta-User-Id", USER);
    assert.equal(response.body.status, "REAL_CHAIN");
    assert.deepEqual(response.body.symbolsWithChain, ["NVDA"]);
    assert.equal(response.body.edges.length, 1);
  } finally {
    finnhubService.getQuote = originalGetQuote;
  }
});

test("workspace endpoint is honest with zero tracked symbols", async () => {
  const folder = await watchlistFolderService.createFolder(USER, "AI");
  const response = await request(app).get(`/api/v2/impact-graph/workspace/${folder.id}`).set("X-Beta-User-Id", USER);
  assert.equal(response.body.status, "NO_DATA");
  assert.match(response.body.message, /no tracked symbols/);
});

test("workspace endpoint merges real per-symbol graphs for real tracked symbols, isolated per user", async () => {
  const prisma = getPrismaClient();
  const effect = await prisma.worldMemoryRecord.create({ data: { occurredAt: new Date(), symbols: ["NVDA"], sectors: [], headline: "NVDA event" } });
  await prisma.worldMemoryCausalLink.create({ data: { causeRecordId: null, effectRecordId: effect.id, explanation: "unknown cause", confidence: 20, methodologyVersion: "x4-v1" } });

  const folder = await watchlistFolderService.createFolder(USER, "AI");
  await watchlistFolderService.addSymbol(USER, folder.id, "NVDA");

  const response = await request(app).get(`/api/v2/impact-graph/workspace/${folder.id}`).set("X-Beta-User-Id", USER);
  assert.equal(response.body.status, "REAL_CHAIN");
  assert.equal(response.body.edges[0].causeRecordId, null); // real, honest unknown upstream preserved through the merge

  const inviteCode = "TEST-IMPACT-GRAPH-V1-USER-B";
  const existing = await betaUserRepository.findByInviteCode(inviteCode);
  const userB = existing || (await betaUserRepository.createBetaUser({ label: "User B", inviteCode }));
  const otherUserResponse = await request(app).get(`/api/v2/impact-graph/workspace/${folder.id}`).set("X-Beta-User-Id", userB.id);
  assert.equal(otherUserResponse.status, 404);
});
