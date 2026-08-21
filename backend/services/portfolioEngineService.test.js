require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const finnhubService = require("./finnhubService");
const portfolioEngineService = require("./portfolioEngineService");
const portfolioRepository = require("./portfolioRepository");

function mockQuote(price, changePercent = 0) {
  return async (symbol) => ({
    quote: { symbol: String(symbol).toUpperCase(), price, change: 0, changePercent },
  });
}

async function withMockedQuote(price, run, changePercent = 0) {
  const original = finnhubService.getQuote;
  finnhubService.getQuote = mockQuote(price, changePercent);
  try {
    return await run();
  } finally {
    finnhubService.getQuote = original;
  }
}

test.beforeEach(async () => {
  await truncateAll();
});

test("getPortfolioSummary creates a fresh $100k portfolio on first access", async () => {
  const summary = await portfolioEngineService.getPortfolioSummary();
  assert.equal(summary.cashBalance, 100000);
  assert.equal(summary.startingCapital, 100000);
  assert.equal(summary.totalValue, 100000);
  assert.equal(summary.positions.length, 0);
  assert.equal(summary.realizedPnl, 0);
  assert.equal(summary.unrealizedPnl, 0);
});

test("placeOrder BUY opens a position, debits cash, and logs a ledger entry", async () => {
  await withMockedQuote(100, async () => {
    const result = await portfolioEngineService.placeOrder({ symbol: "AAPL", side: "BUY", quantity: 10 });
    assert.equal(result.order.status, "FILLED");
    assert.equal(Number(result.trade.price), 100);
    assert.equal(Number(result.position.quantity), 10);

    const summary = await portfolioEngineService.getPortfolioSummary();
    assert.equal(summary.cashBalance, 99000); // 100000 - (10 * 100)
    assert.equal(summary.positions.length, 1);
    assert.equal(summary.positions[0].symbol, "AAPL");
    assert.equal(summary.positions[0].quantity, 10);
    assert.equal(summary.positions[0].avgEntryPrice, 100);

    const log = await portfolioEngineService.getTransactionLog();
    assert.equal(log.length, 1);
    assert.equal(log[0].type, "TRADE_DEBIT");
    assert.equal(log[0].amount, -1000);
  });
});

test("placeOrder BUY is rejected when it would exceed the cash balance", async () => {
  await withMockedQuote(100000, async () => {
    await assert.rejects(
      () => portfolioEngineService.placeOrder({ symbol: "BRK.A", side: "BUY", quantity: 2 }),
      (error) => {
        assert.equal(error.statusCode, 400);
        assert.match(error.message, /Insufficient cash balance/);
        return true;
      }
    );

    const summary = await portfolioEngineService.getPortfolioSummary();
    assert.equal(summary.cashBalance, 100000, "cash must be untouched by a rejected order");
    assert.equal(summary.positions.length, 0);
  });
});

test("placeOrder SELL is rejected when the position doesn't hold enough shares", async () => {
  await withMockedQuote(50, async () => {
    await portfolioEngineService.placeOrder({ symbol: "MSFT", side: "BUY", quantity: 5 });

    await assert.rejects(
      () => portfolioEngineService.placeOrder({ symbol: "MSFT", side: "SELL", quantity: 10 }),
      (error) => {
        assert.equal(error.statusCode, 400);
        assert.match(error.message, /only holds 5/);
        return true;
      }
    );
  });
});

test("placeOrder averages entry price across two buys of the same symbol", async () => {
  await withMockedQuote(100, async () => {
    await portfolioEngineService.placeOrder({ symbol: "NVDA", side: "BUY", quantity: 10 });
  });
  await withMockedQuote(200, async () => {
    await portfolioEngineService.placeOrder({ symbol: "NVDA", side: "BUY", quantity: 10 });
  });

  const summary = await portfolioEngineService.getPortfolioSummary();
  const position = summary.positions.find((item) => item.symbol === "NVDA");
  assert.equal(position.quantity, 20);
  assert.equal(position.avgEntryPrice, 150); // (10*100 + 10*200) / 20
});

test("placeOrder SELL (partial) computes realized P/L and reduces the position", async () => {
  await withMockedQuote(100, async () => {
    await portfolioEngineService.placeOrder({ symbol: "TSLA", side: "BUY", quantity: 10 });
  });

  await withMockedQuote(150, async () => {
    const result = await portfolioEngineService.placeOrder({ symbol: "TSLA", side: "SELL", quantity: 4 });
    assert.equal(Number(result.trade.realizedPnl), 200); // (150-100) * 4
  });

  const summary = await portfolioEngineService.getPortfolioSummary();
  assert.equal(summary.realizedPnl, 200);
  const position = summary.positions.find((item) => item.symbol === "TSLA");
  assert.equal(position.quantity, 6);

  const trades = await portfolioEngineService.getTradeHistory();
  assert.equal(trades.length, 2);
});

test("placeOrder SELL (full) closes the position", async () => {
  await withMockedQuote(20, async () => {
    await portfolioEngineService.placeOrder({ symbol: "PLTR", side: "BUY", quantity: 5 });
  });
  await withMockedQuote(25, async () => {
    await portfolioEngineService.placeOrder({ symbol: "PLTR", side: "SELL", quantity: 5 });
  });

  const summary = await portfolioEngineService.getPortfolioSummary();
  assert.equal(summary.positions.find((item) => item.symbol === "PLTR"), undefined, "closed positions are not open positions");
  assert.equal(summary.realizedPnl, 25); // (25-20) * 5
  assert.equal(summary.cashBalance, 100000 - 100 + 125); // buy 5*20, sell 5*25
});

test("openPaperPosition SHORT persists a negative position and profits when price falls", async () => {
  await withMockedQuote(100, async () => {
    const result = await portfolioEngineService.openPaperPosition({ symbol: "ORCL", direction: "SHORT", quantity: 10 });
    assert.equal(result.paperTrading, true);
    assert.equal(Number(result.position.quantity), -10);
  });

  const summary = await withMockedQuote(80, () => portfolioEngineService.getPortfolioSummary());
  const position = summary.positions.find((item) => item.symbol === "ORCL");
  assert.equal(position.direction, "SHORT");
  assert.equal(position.quantity, -10);
  assert.equal(position.unrealizedPnl, 200);
  assert.equal(position.unrealizedPnlPct, 20);
  assert.equal(summary.totalValue, 100200);
});

test("openPaperPosition blocks a LONG while a SHORT for the same symbol is open", async () => {
  await withMockedQuote(100, async () => {
    await portfolioEngineService.openPaperPosition({ symbol: "ORCL", direction: "SHORT", quantity: 2 });
    await assert.rejects(
      () => portfolioEngineService.openPaperPosition({ symbol: "ORCL", direction: "LONG", quantity: 2 }),
      /Close the existing ORCL short position/
    );
  });
});

test("closePaperPosition covers a SHORT and realizes profit", async () => {
  await withMockedQuote(100, () => portfolioEngineService.openPaperPosition({ symbol: "ORCL", direction: "SHORT", quantity: 10 }));
  const result = await withMockedQuote(80, () => portfolioEngineService.closePaperPosition({ symbol: "ORCL" }));
  assert.equal(result.closed, true);
  assert.equal(Number(result.trade.realizedPnl), 200);
  const summary = await withMockedQuote(80, () => portfolioEngineService.getPortfolioSummary());
  assert.equal(summary.positions.find((item) => item.symbol === "ORCL"), undefined);
  assert.equal(summary.totalValue, 100200);
});

test("capturePerformanceSnapshot and getPerformanceTimeline record a point-in-time snapshot", async () => {
  await withMockedQuote(100, async () => {
    await portfolioEngineService.placeOrder({ symbol: "AMZN", side: "BUY", quantity: 5 });
    await portfolioEngineService.capturePerformanceSnapshot();
  });

  const timeline = await portfolioEngineService.getPerformanceTimeline();
  assert.equal(timeline.length, 1);
  assert.equal(timeline[0].totalValue, 100000);
  assert.equal(timeline[0].cashBalance, 99500);
  assert.equal(timeline[0].benchmarkReturnPct, null);
});

test("getPerformanceDelta reports hasComparison: false when no prior-day snapshot exists", async () => {
  const delta = await portfolioEngineService.getPerformanceDelta();
  assert.equal(delta.hasComparison, false);
  assert.equal(delta.changes.length, 0);
});

test("getPerformanceDelta computes a real value change against yesterday's snapshot", async () => {
  const portfolio = await portfolioEngineService.getOrCreateDefaultPortfolio();
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  await portfolioRepository.createPerformanceSnapshot({
    portfolioId: portfolio.id,
    capturedAt: yesterday,
    totalValue: 100000,
    cashBalance: 100000,
    positionsValue: 0,
    realizedPnl: 0,
    unrealizedPnl: 0,
    totalReturnPct: 0,
    benchmarkReturnPct: null,
  });

  // Phase X7-RC — root-caused a long-standing, repeatedly-documented flake
  // here (see ROOT_CAUSE_ANALYSIS.md #9): getPerformanceDelta() itself
  // calls getPortfolioSummary(), which marks AMZN to market with its own
  // real, live Finnhub quote — previously unmocked, so this assertion
  // drifted whenever the real market moved between order placement and
  // this read. The mocked quote must stay in scope for both calls.
  const delta = await withMockedQuote(200, async () => {
    await portfolioEngineService.placeOrder({ symbol: "AMZN", side: "BUY", quantity: 10 });
    return portfolioEngineService.getPerformanceDelta();
  });
  assert.equal(delta.hasComparison, true);
  assert.equal(delta.totalValue, 100000);
  assert.ok(Array.isArray(delta.changes));
});

test("getPerformanceDelta stays quiet (no changes) when the value move is below the meaningful threshold", async () => {
  const portfolio = await portfolioEngineService.getOrCreateDefaultPortfolio();
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  await portfolioRepository.createPerformanceSnapshot({
    portfolioId: portfolio.id,
    capturedAt: yesterday,
    totalValue: 100000,
    cashBalance: 100000,
    positionsValue: 0,
    realizedPnl: 0,
    unrealizedPnl: 0,
    totalReturnPct: 0,
    benchmarkReturnPct: null,
  });

  const delta = await portfolioEngineService.getPerformanceDelta();
  assert.equal(delta.hasComparison, true);
  assert.equal(delta.changes.length, 0, "an unchanged $100k portfolio should report zero meaningful changes");
  assert.match(delta.summary, /No meaningful change/);
});

test("resetPortfolio clears positions, trades, and ledger back to $100k", async () => {
  await withMockedQuote(10, async () => {
    await portfolioEngineService.placeOrder({ symbol: "F", side: "BUY", quantity: 100 });
  });

  const summary = await portfolioEngineService.resetPortfolio();
  assert.equal(summary.cashBalance, 100000);
  assert.equal(summary.positions.length, 0);

  const trades = await portfolioEngineService.getTradeHistory();
  const log = await portfolioEngineService.getTransactionLog();
  assert.equal(trades.length, 0);
  assert.equal(log.length, 0);
});

test("getPortfolioSummary computes dailyPnl from each position's live day % change", async () => {
  await withMockedQuote(100, async () => {
    await portfolioEngineService.placeOrder({ symbol: "MSFT", side: "BUY", quantity: 10 });
  });

  // Re-mark at the same $100 price but with a +2% day change.
  const summary = await withMockedQuote(
    100,
    () => portfolioEngineService.getPortfolioSummary(),
    2
  );

  const position = summary.positions.find((item) => item.symbol === "MSFT");
  assert.equal(position.dayChangePercent, 2);
  assert.equal(position.dailyPnl, 20); // $1000 market value * 2%
  assert.equal(summary.dailyPnl, 20);
  assert.equal(summary.dailyPnlPct, 0.02); // 20 / 100000 * 100
});
