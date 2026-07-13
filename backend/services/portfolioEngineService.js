// Accessed as finnhubService.getQuote(...) rather than destructured, so
// tests can monkey-patch it the same way openaiService.test.js patches
// axios.post — a destructured reference wouldn't see the patch.
const finnhubService = require("./finnhubService");
const portfolioRepository = require("./portfolioRepository");

function badRequest(message, extra = {}) {
  const error = new Error(message);
  error.statusCode = 400;
  Object.assign(error, extra);
  return error;
}

function round2(value) {
  return Number(Number(value).toFixed(2));
}

async function getOrCreateDefaultPortfolio() {
  const existing = await portfolioRepository.findDefaultPortfolio();
  if (existing) {
    return existing;
  }
  return portfolioRepository.createDefaultPortfolio();
}

async function markPositions(positions) {
  const quotes = await Promise.all(
    positions.map((position) => finnhubService.getQuote(position.symbol).catch(() => null))
  );

  return positions.map((position, index) => {
    const livePrice = Number(quotes[index]?.quote?.price);
    const markPrice = Number.isFinite(livePrice) && livePrice > 0
      ? livePrice
      : Number(position.lastMarkPrice || position.avgEntryPrice);
    const dayChangePercent = Number(quotes[index]?.quote?.changePercent) || 0;
    const quantity = Number(position.quantity);
    const avgEntryPrice = Number(position.avgEntryPrice);
    const marketValue = markPrice * quantity;
    const unrealizedPnl = (markPrice - avgEntryPrice) * quantity;
    const unrealizedPnlPct = avgEntryPrice > 0 ? ((markPrice - avgEntryPrice) / avgEntryPrice) * 100 : 0;
    // Today's mark-to-market contribution, derived from the position's
    // current value and its live day % change — not the same as
    // unrealizedPnl, which is measured from the entry price.
    const dailyPnl = marketValue * (dayChangePercent / 100);

    return {
      id: position.id,
      symbol: position.symbol,
      sector: position.sector,
      assetType: position.assetType,
      quantity,
      avgEntryPrice: round2(avgEntryPrice),
      currentPrice: round2(markPrice),
      marketValue: round2(marketValue),
      unrealizedPnl: round2(unrealizedPnl),
      unrealizedPnlPct: round2(unrealizedPnlPct),
      dailyPnl: round2(dailyPnl),
      dayChangePercent: round2(dayChangePercent),
      openedAt: position.openedAt,
    };
  });
}

function computeAllocation(markedPositions, totalValue) {
  const bySector = {};
  const byAssetType = {};

  markedPositions.forEach((position) => {
    bySector[position.sector] = (bySector[position.sector] || 0) + position.marketValue;
    byAssetType[position.assetType] = (byAssetType[position.assetType] || 0) + position.marketValue;
  });

  const toRows = (map) => Object.entries(map).map(([name, value]) => ({
    name,
    value: round2(value),
    pct: totalValue > 0 ? round2((value / totalValue) * 100) : 0,
  }));

  return { bySector: toRows(bySector), byAssetType: toRows(byAssetType) };
}

async function getPortfolioSummary() {
  const portfolio = await getOrCreateDefaultPortfolio();
  const openPositions = await portfolioRepository.getOpenPositions(portfolio.id);
  const markedPositions = await markPositions(openPositions);

  const cashBalance = Number(portfolio.cashBalance);
  const startingCapital = Number(portfolio.startingCapital);
  const positionsValue = markedPositions.reduce((sum, position) => sum + position.marketValue, 0);
  const unrealizedPnl = markedPositions.reduce((sum, position) => sum + position.unrealizedPnl, 0);
  const dailyPnl = markedPositions.reduce((sum, position) => sum + position.dailyPnl, 0);
  const totalValue = cashBalance + positionsValue;
  const totalReturn = totalValue - startingCapital;
  const totalReturnPct = startingCapital > 0 ? (totalReturn / startingCapital) * 100 : 0;
  const dailyPnlPct = totalValue > 0 ? (dailyPnl / totalValue) * 100 : 0;
  const realizedPnl = await portfolioRepository.sumRealizedPnl(portfolio.id);

  return {
    portfolioId: portfolio.id,
    cashBalance: round2(cashBalance),
    startingCapital: round2(startingCapital),
    positionsValue: round2(positionsValue),
    totalValue: round2(totalValue),
    realizedPnl: round2(realizedPnl),
    unrealizedPnl: round2(unrealizedPnl),
    dailyPnl: round2(dailyPnl),
    dailyPnlPct: round2(dailyPnlPct),
    totalReturn: round2(totalReturn),
    totalReturnPct: round2(totalReturnPct),
    positions: markedPositions,
    allocation: computeAllocation(markedPositions, totalValue),
    benchmarkSymbol: portfolio.benchmarkSymbol,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Places a paper-trading market order. Whole shares only for now (matches
 * today's product behavior) — the schema already supports fractional
 * quantities for when that becomes a requirement.
 */
async function placeOrder({ symbol, side, quantity, sector, assetType }) {
  const normalizedSymbol = String(symbol || "").trim().toUpperCase();
  const normalizedSide = String(side || "").trim().toUpperCase();
  const normalizedQuantity = Number(quantity);

  if (!normalizedSymbol) {
    throw badRequest("A symbol is required.");
  }
  if (!["BUY", "SELL"].includes(normalizedSide)) {
    throw badRequest("side must be BUY or SELL.");
  }
  if (!Number.isInteger(normalizedQuantity) || normalizedQuantity <= 0) {
    throw badRequest("quantity must be a positive whole number of shares.");
  }

  const portfolio = await getOrCreateDefaultPortfolio();
  const quotePayload = await finnhubService.getQuote(normalizedSymbol);
  const price = Number(quotePayload.quote?.price);
  if (!Number.isFinite(price) || price <= 0) {
    throw badRequest(`No live price available for ${normalizedSymbol}.`);
  }

  return portfolioRepository.runOrderTransaction(portfolio.id, async (tx, lockedPortfolio) => {
    const existingPosition = await portfolioRepository.findOpenPositionTx(tx, portfolio.id, normalizedSymbol);

    if (normalizedSide === "BUY") {
      const cost = price * normalizedQuantity;
      if (cost > Number(lockedPortfolio.cashBalance)) {
        await portfolioRepository.createOrderTx(tx, {
          portfolioId: portfolio.id,
          symbol: normalizedSymbol,
          side: "BUY",
          quantity: normalizedQuantity,
          requestedPrice: price,
          status: "REJECTED",
          rejectionReason: "Insufficient cash balance.",
        });
        throw badRequest(
          `Insufficient cash balance to buy ${normalizedQuantity} ${normalizedSymbol} at $${price.toFixed(2)} (needs $${cost.toFixed(2)}, has $${Number(lockedPortfolio.cashBalance).toFixed(2)}).`
        );
      }

      const order = await portfolioRepository.createOrderTx(tx, {
        portfolioId: portfolio.id,
        symbol: normalizedSymbol,
        side: "BUY",
        quantity: normalizedQuantity,
        requestedPrice: price,
        status: "FILLED",
        filledAt: new Date(),
      });

      const position = await portfolioRepository.openOrIncreasePositionTx(tx, {
        portfolioId: portfolio.id,
        symbol: normalizedSymbol,
        sector,
        assetType,
        quantity: normalizedQuantity,
        price,
        existingPosition,
      });

      const trade = await portfolioRepository.createTradeTx(tx, {
        orderId: order.id,
        portfolioId: portfolio.id,
        positionId: position.id,
        symbol: normalizedSymbol,
        side: "BUY",
        quantity: normalizedQuantity,
        price,
      });

      const newCashBalance = Number(lockedPortfolio.cashBalance) - cost;
      await portfolioRepository.setCashBalanceTx(tx, portfolio.id, newCashBalance);
      await portfolioRepository.createLedgerEntryTx(tx, {
        portfolioId: portfolio.id,
        type: "TRADE_DEBIT",
        amount: -cost,
        balanceAfter: newCashBalance,
        relatedTradeId: trade.id,
        description: `Bought ${normalizedQuantity} ${normalizedSymbol} @ $${price.toFixed(2)}`,
      });

      return { order, trade, position };
    }

    // SELL
    const heldQuantity = existingPosition ? Number(existingPosition.quantity) : 0;
    if (!existingPosition || heldQuantity < normalizedQuantity) {
      await portfolioRepository.createOrderTx(tx, {
        portfolioId: portfolio.id,
        symbol: normalizedSymbol,
        side: "SELL",
        quantity: normalizedQuantity,
        requestedPrice: price,
        status: "REJECTED",
        rejectionReason: "Insufficient position quantity to sell.",
      });
      throw badRequest(`Cannot sell ${normalizedQuantity} ${normalizedSymbol}: position only holds ${heldQuantity}.`);
    }

    const order = await portfolioRepository.createOrderTx(tx, {
      portfolioId: portfolio.id,
      symbol: normalizedSymbol,
      side: "SELL",
      quantity: normalizedQuantity,
      requestedPrice: price,
      status: "FILLED",
      filledAt: new Date(),
    });

    const proceeds = price * normalizedQuantity;
    const realizedPnl = (price - Number(existingPosition.avgEntryPrice)) * normalizedQuantity;

    const position = await portfolioRepository.reduceOrClosePositionTx(tx, {
      existingPosition,
      quantity: normalizedQuantity,
      price,
    });

    const trade = await portfolioRepository.createTradeTx(tx, {
      orderId: order.id,
      portfolioId: portfolio.id,
      positionId: position.id,
      symbol: normalizedSymbol,
      side: "SELL",
      quantity: normalizedQuantity,
      price,
      realizedPnl,
    });

    const newCashBalance = Number(lockedPortfolio.cashBalance) + proceeds;
    await portfolioRepository.setCashBalanceTx(tx, portfolio.id, newCashBalance);
    await portfolioRepository.createLedgerEntryTx(tx, {
      portfolioId: portfolio.id,
      type: "TRADE_CREDIT",
      amount: proceeds,
      balanceAfter: newCashBalance,
      relatedTradeId: trade.id,
      description: `Sold ${normalizedQuantity} ${normalizedSymbol} @ $${price.toFixed(2)}`,
    });

    if (realizedPnl !== 0) {
      await portfolioRepository.createLedgerEntryTx(tx, {
        portfolioId: portfolio.id,
        type: "REALIZED_PNL_SETTLEMENT",
        amount: 0,
        balanceAfter: newCashBalance,
        relatedTradeId: trade.id,
        description: `Realized P/L ${realizedPnl >= 0 ? "+" : ""}$${realizedPnl.toFixed(2)} on ${normalizedSymbol}`,
      });
    }

    return { order, trade, position };
  });
}

async function getTradeHistory({ limit } = {}) {
  const portfolio = await getOrCreateDefaultPortfolio();
  const trades = await portfolioRepository.getTrades(portfolio.id, { limit });
  return trades.map((trade) => ({
    id: trade.id,
    symbol: trade.symbol,
    side: trade.side,
    quantity: Number(trade.quantity),
    price: round2(trade.price),
    realizedPnl: trade.realizedPnl === null ? null : round2(trade.realizedPnl),
    executedAt: trade.executedAt,
  }));
}

async function getTransactionLog({ limit } = {}) {
  const portfolio = await getOrCreateDefaultPortfolio();
  const entries = await portfolioRepository.getLedgerEntries(portfolio.id, { limit });
  return entries.map((entry) => ({
    id: entry.id,
    type: entry.type,
    amount: round2(entry.amount),
    balanceAfter: round2(entry.balanceAfter),
    relatedTradeId: entry.relatedTradeId,
    description: entry.description,
    createdAt: entry.createdAt,
  }));
}

async function getPerformanceTimeline({ limit } = {}) {
  const portfolio = await getOrCreateDefaultPortfolio();
  const snapshots = await portfolioRepository.getPerformanceSnapshots(portfolio.id, { limit });
  return snapshots.map((snapshot) => ({
    capturedAt: snapshot.capturedAt,
    totalValue: round2(snapshot.totalValue),
    cashBalance: round2(snapshot.cashBalance),
    positionsValue: round2(snapshot.positionsValue),
    realizedPnl: round2(snapshot.realizedPnl),
    unrealizedPnl: round2(snapshot.unrealizedPnl),
    totalReturnPct: round2(snapshot.totalReturnPct),
    benchmarkReturnPct: snapshot.benchmarkReturnPct === null ? null : round2(snapshot.benchmarkReturnPct),
  }));
}

/**
 * Captures one point-in-time snapshot for the performance timeline.
 * Called on-demand this sprint; a scheduled daily job is a later sprint
 * (background workers/scheduler are out of scope here).
 */
async function capturePerformanceSnapshot() {
  const summary = await getPortfolioSummary();
  const snapshot = await portfolioRepository.createPerformanceSnapshot({
    portfolioId: summary.portfolioId,
    totalValue: summary.totalValue,
    cashBalance: summary.cashBalance,
    positionsValue: summary.positionsValue,
    realizedPnl: summary.realizedPnl,
    unrealizedPnl: summary.unrealizedPnl,
    totalReturnPct: summary.totalReturnPct,
    // Benchmark-relative return needs a tracked baseline price and is not
    // yet wired up — left null rather than faked. See PROJECT_STATUS.md.
    benchmarkReturnPct: null,
  });

  return {
    capturedAt: snapshot.capturedAt,
    totalValue: round2(snapshot.totalValue),
    cashBalance: round2(snapshot.cashBalance),
    positionsValue: round2(snapshot.positionsValue),
    realizedPnl: round2(snapshot.realizedPnl),
    unrealizedPnl: round2(snapshot.unrealizedPnl),
    totalReturnPct: round2(snapshot.totalReturnPct),
    benchmarkReturnPct: null,
  };
}

/**
 * Sprint 24 — real, sourced "today vs yesterday" for Portfolio Intelligence
 * and Home's "what changed for my portfolio." Compares the current live
 * summary against the most recent PerformanceSnapshot captured before
 * today (not merely the previous row, since capture is currently
 * on-demand, not scheduled — the "prior" snapshot could be from any
 * earlier date). Honest about absence: when no snapshot exists from a
 * prior day, this says so explicitly rather than fabricating a zero delta.
 * MEANINGFUL_CHANGE_THRESHOLD_PCT keeps this "highlight only meaningful
 * changes," not noise.
 */
const MEANINGFUL_CHANGE_THRESHOLD_PCT = 0.5;

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

async function getPerformanceDelta() {
  const portfolio = await getOrCreateDefaultPortfolio();
  const today = await getPortfolioSummary();
  const allSnapshots = await portfolioRepository.getPerformanceSnapshots(portfolio.id, { limit: 365 });

  const cutoff = startOfTodayUtc();
  const priorSnapshots = allSnapshots.filter((snapshot) => new Date(snapshot.capturedAt) < cutoff);
  const previous = priorSnapshots.length ? priorSnapshots[priorSnapshots.length - 1] : null;

  if (!previous) {
    return {
      hasComparison: false,
      totalValue: round2(today.totalValue),
      changes: [],
      summary: "No prior-day snapshot yet — this is the first day being tracked.",
    };
  }

  const previousTotalValue = Number(previous.totalValue);
  const valueChangeAbs = today.totalValue - previousTotalValue;
  const valueChangePct = previousTotalValue !== 0 ? (valueChangeAbs / previousTotalValue) * 100 : 0;

  const changes = [];
  if (Math.abs(valueChangePct) >= MEANINGFUL_CHANGE_THRESHOLD_PCT) {
    changes.push({
      dimension: "totalValue",
      label: "Total portfolio value",
      beforeValue: round2(previousTotalValue),
      afterValue: round2(today.totalValue),
      changePct: round2(valueChangePct),
    });
  }

  const previousUnrealizedPnl = Number(previous.unrealizedPnl);
  const unrealizedPnlChange = today.unrealizedPnl - previousUnrealizedPnl;
  if (Math.abs(unrealizedPnlChange) >= 1) {
    changes.push({
      dimension: "unrealizedPnl",
      label: "Unrealized P/L",
      beforeValue: round2(previousUnrealizedPnl),
      afterValue: round2(today.unrealizedPnl),
      changePct: null,
    });
  }

  return {
    hasComparison: true,
    previousCapturedAt: previous.capturedAt,
    totalValue: round2(today.totalValue),
    valueChangeAbs: round2(valueChangeAbs),
    valueChangePct: round2(valueChangePct),
    changes,
    summary: changes.length
      ? `Portfolio value ${valueChangeAbs >= 0 ? "up" : "down"} ${Math.abs(round2(valueChangePct))}% since the last snapshot.`
      : "No meaningful change in your portfolio since the last snapshot.",
  };
}

async function resetPortfolio() {
  const portfolio = await getOrCreateDefaultPortfolio();
  await portfolioRepository.resetPortfolio(portfolio.id);
  return getPortfolioSummary();
}

module.exports = {
  getOrCreateDefaultPortfolio,
  getPortfolioSummary,
  placeOrder,
  getTradeHistory,
  getTransactionLog,
  getPerformanceTimeline,
  capturePerformanceSnapshot,
  getPerformanceDelta,
  resetPortfolio,
};
