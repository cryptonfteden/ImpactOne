const { getPrismaClient } = require("../db/prismaClient");

const DEFAULT_PORTFOLIO_NAME = "Default Portfolio";
const DEFAULT_STARTING_CAPITAL = 100000;
const DEFAULT_BENCHMARK_SYMBOL = "SPY";
const STRATEGY_LAB_PORTFOLIO_NAME = "ImpactOne Strategy Lab";

// All raw Prisma access lives in this file. Service layers describe *what*
// should happen; this file is the only place that knows *how* it's stored.

// Phase H2 — betaUserId is optional. When present, scopes the lookup to
// that beta user's own portfolio, isolated from every other user's.
// When absent, behaves exactly as before this phase (the pre-H2 global
// singleton, matched by name) — required for backward compatibility with
// every existing call site and test.
async function findDefaultPortfolio(betaUserId) {
  const prisma = getPrismaClient();
  if (betaUserId) {
    return prisma.portfolio.findFirst({
      where: { betaUserId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
  }
  // Historical local runs could create more than one unscoped default
  // portfolio. An unordered findFirst() made the active demo account change
  // nondeterministically between requests/restarts. The oldest portfolio is
  // the original account and is now selected deterministically.
  return prisma.portfolio.findFirst({
    where: { name: DEFAULT_PORTFOLIO_NAME, betaUserId: null },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}

async function createDefaultPortfolio(betaUserId) {
  const prisma = getPrismaClient();
  return prisma.portfolio.create({
    data: {
      name: DEFAULT_PORTFOLIO_NAME,
      cashBalance: DEFAULT_STARTING_CAPITAL,
      startingCapital: DEFAULT_STARTING_CAPITAL,
      benchmarkSymbol: DEFAULT_BENCHMARK_SYMBOL,
      betaUserId: betaUserId || null,
    },
  });
}

async function getOpenPositions(portfolioId) {
  const prisma = getPrismaClient();
  return prisma.position.findMany({
    where: { portfolioId, closedAt: null },
    orderBy: { openedAt: "asc" },
  });
}

async function getTrades(portfolioId, { limit = 200 } = {}) {
  const prisma = getPrismaClient();
  return prisma.trade.findMany({
    where: { portfolioId },
    orderBy: { executedAt: "desc" },
    take: limit,
  });
}

async function sumRealizedPnl(portfolioId) {
  const prisma = getPrismaClient();
  const result = await prisma.trade.aggregate({
    where: { portfolioId },
    _sum: { realizedPnl: true },
  });
  return Number(result._sum.realizedPnl || 0);
}

async function getLedgerEntries(portfolioId, { limit = 500 } = {}) {
  const prisma = getPrismaClient();
  return prisma.cashLedgerEntry.findMany({
    where: { portfolioId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

async function getPerformanceSnapshots(portfolioId, { limit = 365 } = {}) {
  const prisma = getPrismaClient();
  return prisma.performanceSnapshot.findMany({
    where: { portfolioId },
    orderBy: { capturedAt: "asc" },
    take: limit,
  });
}

async function createPerformanceSnapshot(data) {
  const prisma = getPrismaClient();
  return prisma.performanceSnapshot.create({ data });
}

/**
 * Runs `mutator` inside a single Prisma transaction, handing it the
 * transactional client and the portfolio row read within that transaction
 * (so cash-balance checks are never made against stale data under
 * concurrent order placement).
 */
async function runOrderTransaction(portfolioId, mutator) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    const portfolio = await tx.portfolio.findUniqueOrThrow({ where: { id: portfolioId } });
    return mutator(tx, portfolio);
  });
}

async function findOpenPositionTx(tx, portfolioId, symbol) {
  return tx.position.findFirst({ where: { portfolioId, symbol, closedAt: null } });
}

async function createOrderTx(tx, data) {
  return tx.order.create({ data });
}

async function createTradeTx(tx, data) {
  return tx.trade.create({ data });
}

async function openOrIncreasePositionTx(tx, { portfolioId, symbol, sector, assetType, quantity, price, existingPosition }) {
  if (existingPosition) {
    const totalQuantity = Number(existingPosition.quantity) + quantity;
    const totalCost = Number(existingPosition.avgEntryPrice) * Number(existingPosition.quantity) + price * quantity;
    const avgEntryPrice = totalCost / totalQuantity;
    return tx.position.update({
      where: { id: existingPosition.id },
      data: {
        quantity: totalQuantity,
        avgEntryPrice,
        lastMarkPrice: price,
        unrealizedPnl: (price - avgEntryPrice) * totalQuantity,
      },
    });
  }

  return tx.position.create({
    data: {
      portfolioId,
      symbol,
      sector: sector || "General",
      assetType: assetType || "Equity",
      quantity,
      avgEntryPrice: price,
      lastMarkPrice: price,
      unrealizedPnl: 0,
    },
  });
}

async function findPortfolioById(id) {
  return getPrismaClient().portfolio.findUnique({ where: { id } });
}

async function findPortfolioByName(name) {
  return getPrismaClient().portfolio.findFirst({
    where: { name, betaUserId: null },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}

async function createNamedPortfolio(name, startingCapital = DEFAULT_STARTING_CAPITAL) {
  return getPrismaClient().portfolio.create({
    data: { name, cashBalance: startingCapital, startingCapital, benchmarkSymbol: DEFAULT_BENCHMARK_SYMBOL, betaUserId: null },
  });
}

async function getOrCreateStrategyLabPortfolio() {
  return (await findPortfolioByName(STRATEGY_LAB_PORTFOLIO_NAME))
    || createNamedPortfolio(STRATEGY_LAB_PORTFOLIO_NAME);
}

async function openShortPositionTx(tx, { portfolioId, symbol, sector, assetType, quantity, price }) {
  return tx.position.create({
    data: {
      portfolioId,
      symbol,
      sector: sector || "General",
      assetType: assetType || "Equity",
      quantity: -Math.abs(quantity),
      avgEntryPrice: price,
      lastMarkPrice: price,
      unrealizedPnl: 0,
    },
  });
}

async function reduceOrClosePositionTx(tx, { existingPosition, quantity, price }) {
  const remaining = Number(existingPosition.quantity) - quantity;

  if (remaining > 0) {
    return tx.position.update({
      where: { id: existingPosition.id },
      data: {
        quantity: remaining,
        lastMarkPrice: price,
        unrealizedPnl: (price - Number(existingPosition.avgEntryPrice)) * remaining,
      },
    });
  }

  return tx.position.update({
    where: { id: existingPosition.id },
    data: { quantity: 0, lastMarkPrice: price, unrealizedPnl: 0, closedAt: new Date() },
  });
}

async function closePositionTx(tx, existingPosition, price) {
  return tx.position.update({ where: { id: existingPosition.id }, data: { quantity: 0, lastMarkPrice: price, unrealizedPnl: 0, closedAt: new Date() } });
}

async function setCashBalanceTx(tx, portfolioId, newBalance) {
  return tx.portfolio.update({ where: { id: portfolioId }, data: { cashBalance: newBalance } });
}

async function createLedgerEntryTx(tx, data) {
  return tx.cashLedgerEntry.create({ data });
}

async function resetPortfolio(portfolioId) {
  const prisma = getPrismaClient();
  return prisma.$transaction(async (tx) => {
    await tx.cashLedgerEntry.deleteMany({ where: { portfolioId } });
    await tx.trade.deleteMany({ where: { portfolioId } });
    await tx.order.deleteMany({ where: { portfolioId } });
    await tx.position.deleteMany({ where: { portfolioId } });
    await tx.performanceSnapshot.deleteMany({ where: { portfolioId } });

    return tx.portfolio.update({
      where: { id: portfolioId },
      data: { cashBalance: DEFAULT_STARTING_CAPITAL, startingCapital: DEFAULT_STARTING_CAPITAL },
    });
  });
}

module.exports = {
  DEFAULT_STARTING_CAPITAL,
  STRATEGY_LAB_PORTFOLIO_NAME,
  findDefaultPortfolio,
  createDefaultPortfolio,
  findPortfolioById,
  findPortfolioByName,
  createNamedPortfolio,
  getOrCreateStrategyLabPortfolio,
  getOpenPositions,
  getTrades,
  sumRealizedPnl,
  getLedgerEntries,
  getPerformanceSnapshots,
  createPerformanceSnapshot,
  runOrderTransaction,
  findOpenPositionTx,
  createOrderTx,
  createTradeTx,
  openOrIncreasePositionTx,
  openShortPositionTx,
  reduceOrClosePositionTx,
  closePositionTx,
  setCashBalanceTx,
  createLedgerEntryTx,
  resetPortfolio,
};
