// Phase X5 — Part 5, Performance. Real, one-off measurement script (not a
// test — no assertions, just timing) against the real Express app via
// supertest, seeding real data first so each measured call reflects a
// realistic response shape rather than an empty-state fast path.
require("../test/testEnv");
const request = require("supertest");
const app = require("../app");
const { truncateAll } = require("../test/dbHelpers");
const { getPrismaClient } = require("../db/prismaClient");
const betaUserRepository = require("../services/betaUserRepository");
const watchlistFolderService = require("../services/watchlistFolderService");
const finnhubService = require("../services/finnhubService");

async function timed(label, fn) {
  const start = Date.now();
  await fn();
  console.log(`${label}: ${Date.now() - start}ms`);
}

async function main() {
  await truncateAll();
  const prisma = getPrismaClient();
  const existing = await betaUserRepository.findByInviteCode("PERF-CHECK");
  const betaUser = existing || (await betaUserRepository.createBetaUser({ label: "Perf", inviteCode: "PERF-CHECK" }));

  finnhubService.getQuote = async (symbol) => ({ quote: { symbol, price: 200, marketCap: 1e12, volume: 1e7 } });

  // Seed a "large workspace" — 30 tracked symbols, per Part 5's "Large
  // Workspace performance" requirement.
  const folder = await watchlistFolderService.createFolder(betaUser.id, "Large Workspace");
  const symbols = Array.from({ length: 30 }, (_, i) => `SYM${i}`);
  for (const symbol of symbols) {
    await watchlistFolderService.addSymbol(betaUser.id, folder.id, symbol);
  }

  // Seed real causal data for one symbol so Impact Graph isn't a trivial
  // empty-state measurement.
  const cause = await prisma.worldMemoryRecord.create({ data: { occurredAt: new Date(), symbols: ["SYM0"], sectors: [], headline: "seed" } });
  const effect = await prisma.worldMemoryRecord.create({ data: { occurredAt: new Date(), symbols: ["SYM1"], sectors: [], headline: "seed effect" } });
  await prisma.worldMemoryCausalLink.create({ data: { causeRecordId: cause.id, effectRecordId: effect.id, explanation: "seed", confidence: 60, methodologyVersion: "perf-check" } });

  const headers = { "X-Beta-User-Id": betaUser.id };

  await timed("GET /api/v2/home-summary (initial load proxy)", () => request(app).get("/api/v2/home-summary").set(headers));
  await timed("GET /api/v2/impact-graph/SYM0", () => request(app).get("/api/v2/impact-graph/SYM0").set(headers));
  await timed("GET /api/v2/decisions", () => request(app).get("/api/v2/decisions").set(headers));
  await timed("GET /api/v2/notifications", () => request(app).get("/api/v2/notifications").set(headers));
  await timed(`GET /api/v2/workspaces/${folder.id} (30-symbol workspace)`, () => request(app).get(`/api/v2/workspaces/${folder.id}`).set(headers));
  await timed("GET /api/v2/impact-graph/workspace/:folderId (30-symbol merge)", () => request(app).get(`/api/v2/impact-graph/workspace/${folder.id}`).set(headers));

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
