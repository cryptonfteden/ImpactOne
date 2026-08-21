// Accessed as finnhubService.getQuote(...) rather than destructured, so
// tests can monkey-patch it the same way openaiService.test.js patches
// axios.post — a destructured reference wouldn't see the patch.
const finnhubService = require("./finnhubService");
const portfolioRepository = require("./portfolioRepository");
const priceHistoryProvider = require("./intelligence/priceHistoryProvider");

function badRequest(message, extra = {}) {
  const error = new Error(message);
  error.statusCode = 400;
  Object.assign(error, extra);
  return error;
}

function round2(value) {
  return Number(Number(value).toFixed(2));
}

// Phase H2 — betaUserId is optional; omitted, this is the exact pre-H2
// singleton behavior every existing caller/test relies on.
async function getOrCreateDefaultPortfolio(betaUserId) {
  const existing = await portfolioRepository.findDefaultPortfolio(betaUserId);
  if (existing) {
    return existing;
  }
  return portfolioRepository.createDefaultPortfolio(betaUserId);
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
    const unrealizedPnlPct = avgEntryPrice > 0 ? (unrealizedPnl / (Math.abs(quantity) * avgEntryPrice)) * 100 : 0;
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
      direction: quantity < 0 ? "SHORT" : "LONG",
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

async function summarizePortfolio(portfolio) {
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

async function resolvePaperTradePrice(symbol) {
  try {
    const payload = await finnhubService.getQuote(symbol);
    const price = Number(payload.quote?.price);
    if (Number.isFinite(price) && price > 0) return { price, source: payload.quote?.source || "Finnhub live quote" };
  } catch {
    // The verified daily-close fallback below keeps paper trading testable
    // when the free live-quote allowance is exhausted. It is disclosed on
    // every returned order and is never presented as a live execution.
  }
  const bars = await priceHistoryProvider.getDailyBars(symbol, { range: "1mo" });
  const latest = bars.at(-1);
  const price = Number(latest?.close);
  if (!Number.isFinite(price) || price <= 0) throw badRequest(`No verified market price available for ${symbol}.`);
  const metadata = priceHistoryProvider.getChartSource(symbol, "1mo");
  return { price, source: `${metadata.source} · latest verified daily close ${latest.date}`, delayed: true };
}

async function getPortfolioSummary(betaUserId) {
  return summarizePortfolio(await getOrCreateDefaultPortfolio(betaUserId));
}

async function getPortfolioSummaryById(portfolioId) {
  const portfolio = await portfolioRepository.findPortfolioById(portfolioId);
  if (!portfolio) throw badRequest("Portfolio not found.");
  return summarizePortfolio(portfolio);
}

/**
 * Places a paper-trading market order. Whole shares only for now (matches
 * today's product behavior) — the schema already supports fractional
 * quantities for when that becomes a requirement.
 */
async function placeOrder({ symbol, side, quantity, sector, assetType, betaUserId, portfolioId, verifiedPaperPrice, verifiedPaperPriceSource }) {
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

  const portfolio = portfolioId
    ? await portfolioRepository.findPortfolioById(portfolioId)
    : await getOrCreateDefaultPortfolio(betaUserId);
  if (!portfolio) throw badRequest("Portfolio not found.");
  const suppliedPrice = Number(verifiedPaperPrice);
  const execution = Number.isFinite(suppliedPrice) && suppliedPrice > 0 && verifiedPaperPriceSource
    ? { price: suppliedPrice, source: String(verifiedPaperPriceSource), delayed: true }
    : await resolvePaperTradePrice(normalizedSymbol);
  const price = execution.price;

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

      return { order, trade, position, marketData: execution };
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

    return { order, trade, position, marketData: execution };
  });
}

async function openPaperPosition({ symbol, direction, quantity, sector, assetType, betaUserId }) {
  const normalizedSymbol = String(symbol || "").trim().toUpperCase();
  const normalizedDirection = String(direction || "").trim().toUpperCase();
  const normalizedQuantity = Number(quantity);
  if (!/^[A-Z]{1,6}(?:\.[A-Z])?$/.test(normalizedSymbol)) throw badRequest("Paper positions currently support US-listed equities only.");
  if (!["LONG", "SHORT"].includes(normalizedDirection)) throw badRequest("direction must be LONG or SHORT.");
  if (!Number.isInteger(normalizedQuantity) || normalizedQuantity <= 0) throw badRequest("quantity must be a positive whole number of shares.");

  const portfolio = await getOrCreateDefaultPortfolio(betaUserId);
  if (normalizedDirection === "LONG") {
    const existing = (await portfolioRepository.getOpenPositions(portfolio.id)).find((position) => position.symbol === normalizedSymbol);
    if (existing && Number(existing.quantity) < 0) throw badRequest(`Close the existing ${normalizedSymbol} short position before opening a long position.`);
    return placeOrder({ symbol: normalizedSymbol, side: "BUY", quantity: normalizedQuantity, sector, assetType, betaUserId });
  }

  const quotePayload = await finnhubService.getQuote(normalizedSymbol);
  const price = Number(quotePayload.quote?.price);
  if (!Number.isFinite(price) || price <= 0) throw badRequest(`No live price available for ${normalizedSymbol}.`);
  const notional = price * normalizedQuantity;

  return portfolioRepository.runOrderTransaction(portfolio.id, async (tx, lockedPortfolio) => {
    const existingPosition = await portfolioRepository.findOpenPositionTx(tx, portfolio.id, normalizedSymbol);
    if (existingPosition) throw badRequest(`Close the existing ${normalizedSymbol} position before opening a short position.`);
    if (notional > Number(lockedPortfolio.cashBalance)) throw badRequest(`Insufficient paper-trading collateral for a $${notional.toFixed(2)} short position.`);
    const order = await portfolioRepository.createOrderTx(tx, { portfolioId: portfolio.id, symbol: normalizedSymbol, side: "SELL", quantity: normalizedQuantity, requestedPrice: price, status: "FILLED", filledAt: new Date() });
    const position = await portfolioRepository.openShortPositionTx(tx, { portfolioId: portfolio.id, symbol: normalizedSymbol, sector, assetType, quantity: normalizedQuantity, price });
    const trade = await portfolioRepository.createTradeTx(tx, { orderId: order.id, portfolioId: portfolio.id, positionId: position.id, symbol: normalizedSymbol, side: "SELL", quantity: normalizedQuantity, price });
    const newCashBalance = Number(lockedPortfolio.cashBalance) + notional;
    await portfolioRepository.setCashBalanceTx(tx, portfolio.id, newCashBalance);
    await portfolioRepository.createLedgerEntryTx(tx, { portfolioId: portfolio.id, type: "TRADE_CREDIT", amount: notional, balanceAfter: newCashBalance, relatedTradeId: trade.id, description: `Opened paper SHORT ${normalizedQuantity} ${normalizedSymbol} @ $${price.toFixed(2)}` });
    return { order, trade, position, direction: "SHORT", paperTrading: true };
  });
}

async function closePaperPosition({ symbol, betaUserId }) {
  const normalizedSymbol = String(symbol || "").trim().toUpperCase();
  const portfolio = await getOrCreateDefaultPortfolio(betaUserId);
  const current = (await portfolioRepository.getOpenPositions(portfolio.id)).find((position) => position.symbol === normalizedSymbol);
  if (!current) throw badRequest(`No open ${normalizedSymbol} paper position exists.`);
  const quantity = Math.abs(Number(current.quantity));
  if (Number(current.quantity) > 0) return placeOrder({ symbol: normalizedSymbol, side: "SELL", quantity, betaUserId });

  const quotePayload = await finnhubService.getQuote(normalizedSymbol);
  const price = Number(quotePayload.quote?.price);
  if (!Number.isFinite(price) || price <= 0) throw badRequest(`No live price available for ${normalizedSymbol}.`);
  return portfolioRepository.runOrderTransaction(portfolio.id, async (tx, lockedPortfolio) => {
    const existing = await portfolioRepository.findOpenPositionTx(tx, portfolio.id, normalizedSymbol);
    if (!existing || Number(existing.quantity) >= 0) throw badRequest(`No open ${normalizedSymbol} short position exists.`);
    const coverCost = price * quantity;
    if (coverCost > Number(lockedPortfolio.cashBalance)) throw badRequest("Insufficient paper cash to cover this short position.");
    const realizedPnl = (Number(existing.avgEntryPrice) - price) * quantity;
    const order = await portfolioRepository.createOrderTx(tx, { portfolioId: portfolio.id, symbol: normalizedSymbol, side: "BUY", quantity, requestedPrice: price, status: "FILLED", filledAt: new Date() });
    const position = await portfolioRepository.closePositionTx(tx, existing, price);
    const trade = await portfolioRepository.createTradeTx(tx, { orderId: order.id, portfolioId: portfolio.id, positionId: position.id, symbol: normalizedSymbol, side: "BUY", quantity, price, realizedPnl });
    const newCashBalance = Number(lockedPortfolio.cashBalance) - coverCost;
    await portfolioRepository.setCashBalanceTx(tx, portfolio.id, newCashBalance);
    await portfolioRepository.createLedgerEntryTx(tx, { portfolioId: portfolio.id, type: "TRADE_DEBIT", amount: -coverCost, balanceAfter: newCashBalance, relatedTradeId: trade.id, description: `Covered paper SHORT ${quantity} ${normalizedSymbol} @ $${price.toFixed(2)}` });
    return { order, trade, position, direction: "SHORT", closed: true, paperTrading: true };
  });
}

async function getTradeHistory({ limit, betaUserId } = {}) {
  const portfolio = await getOrCreateDefaultPortfolio(betaUserId);
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

async function getTransactionLog({ limit, betaUserId } = {}) {
  const portfolio = await getOrCreateDefaultPortfolio(betaUserId);
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

async function getPerformanceTimeline({ limit, betaUserId } = {}) {
  const portfolio = await getOrCreateDefaultPortfolio(betaUserId);
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
async function capturePerformanceSnapshot(betaUserId) {
  const summary = await getPortfolioSummary(betaUserId);
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

async function getPerformanceDelta(betaUserId) {
  const portfolio = await getOrCreateDefaultPortfolio(betaUserId);
  const today = await getPortfolioSummary(betaUserId);
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

async function resetPortfolio(betaUserId) {
  const portfolio = await getOrCreateDefaultPortfolio(betaUserId);
  await portfolioRepository.resetPortfolio(portfolio.id);
  return getPortfolioSummary(betaUserId);
}

module.exports = {
  getOrCreateDefaultPortfolio,
  getPortfolioSummary,
  getPortfolioSummaryById,
  placeOrder,
  openPaperPosition,
  closePaperPosition,
  getTradeHistory,
  getTransactionLog,
  getPerformanceTimeline,
  capturePerformanceSnapshot,
  getPerformanceDelta,
  resetPortfolio,
};
