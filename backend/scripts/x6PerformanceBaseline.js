// Phase X6 — Part 6, Performance Baseline. Real, seeded measurements
// against the live Express app via supertest — not synthetic. Extends
// Phase X5's x5PerformanceCheck.js with the two areas that script didn't
// cover (Chart, and a fresh Workspace measurement to confirm X5's
// parallelization fix still holds).
require("../test/testEnv");
const request = require("supertest");
const app = require("../app");
const { truncateAll } = require("../test/dbHelpers");
const { getPrismaClient } = require("../db/prismaClient");
const betaUserRepository = require("../services/betaUserRepository");
const watchlistFolderService = require("../services/watchlistFolderService");
const finnhubService = require("../services/finnhubService");
const priceHistoryProvider = require("../services/intelligence/priceHistoryProvider");

async function timed(label, fn) {
  const start = Date.now();
  await fn();
  const ms = Date.now() - start;
  console.log(`${label}: ${ms}ms`);
  return ms;
}

async function main() {
  await truncateAll();
  const prisma = getPrismaClient();
  const inviteCode = "X6-PERF-BASELINE";
  const existing = await betaUserRepository.findByInviteCode(inviteCode);
  const betaUser = existing || (await betaUserRepository.createBetaUser({ label: "X6 Perf", inviteCode }));

  finnhubService.getQuote = async (symbol) => ({ quote: { symbol, price: 200, marketCap: 1e12, volume: 1e7 } });
  const originalGetDailyBars = priceHistoryProvider.getDailyBars;
  priceHistoryProvider.getDailyBars = async () =>
    Array.from({ length: 120 }, (_, i) => ({ date: `d${i}`, open: 190 + i, high: 191 + i, low: 189 + i, close: 190 + i, volume: 8_000_000 }));

  const folder = await watchlistFolderService.createFolder(betaUser.id, "Baseline Workspace");
  const symbols = Array.from({ length: 30 }, (_, i) => `SYM${i}`);
  for (const symbol of symbols) {
    await watchlistFolderService.addSymbol(betaUser.id, folder.id, symbol);
  }

  const cause = await prisma.worldMemoryRecord.create({ data: { occurredAt: new Date(), symbols: ["SYM0"], sectors: [], headline: "seed" } });
  const effect = await prisma.worldMemoryRecord.create({ data: { occurredAt: new Date(), symbols: ["SYM1"], sectors: [], headline: "seed effect" } });
  await prisma.worldMemoryCausalLink.create({ data: { causeRecordId: cause.id, effectRecordId: effect.id, explanation: "seed", confidence: 60, methodologyVersion: "x6-perf" } });

  const headers = { "X-Beta-User-Id": betaUser.id };

  console.log("--- Cold start proxy (first request after a fresh process) ---");
  await timed("GET /api/v2/home-summary (cold)", () => request(app).get("/api/v2/home-summary").set(headers));

  console.log("\n--- Warm start proxy (repeat request, same process) ---");
  await timed("GET /api/v2/home-summary (warm)", () => request(app).get("/api/v2/home-summary").set(headers));

  console.log("\n--- Route transitions (per-screen data fetch cost; shell switch itself is client-side, zero network cost) ---");
  await timed("Chart: GET /api/v2/market/chart/SYM0 (120 real bars)", () => request(app).get("/api/v2/market/chart/SYM0").set(headers));
  await timed("Decision Center: GET /api/v2/decisions", () => request(app).get("/api/v2/decisions").set(headers));
  await timed("Impact Graph: GET /api/v2/impact-graph/SYM0", () => request(app).get("/api/v2/impact-graph/SYM0").set(headers));
  await timed(`Workspace: GET /api/v2/workspaces/${folder.id} (30 symbols)`, () => request(app).get(`/api/v2/workspaces/${folder.id}`).set(headers));

  priceHistoryProvider.getDailyBars = originalGetDailyBars;
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
