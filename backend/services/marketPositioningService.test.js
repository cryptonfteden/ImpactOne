require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const marketPositioningService = require("./marketPositioningService");
const finnhubService = require("./finnhubService");
const priceHistoryProvider = require("./intelligence/priceHistoryProvider");

function mockFor(symbol, { marketCap, price, todayVolume, bars }) {
  const originalGetQuote = finnhubService.getQuote;
  const originalGetDailyBars = priceHistoryProvider.getDailyBars;
  finnhubService.getQuote = async (requestedSymbol) => {
    if (requestedSymbol !== symbol) return originalGetQuote(requestedSymbol);
    return { quote: { marketCap, price, volume: todayVolume } };
  };
  priceHistoryProvider.getDailyBars = async (requestedSymbol) => {
    if (requestedSymbol !== symbol) return originalGetDailyBars(requestedSymbol);
    return bars;
  };
  return () => {
    finnhubService.getQuote = originalGetQuote;
    priceHistoryProvider.getDailyBars = originalGetDailyBars;
  };
}

function makeBars(count, { startClose = 100, dailyChangePct = 0, volume = 1_000_000 } = {}) {
  const bars = [];
  let close = startClose;
  for (let i = 0; i < count; i += 1) {
    bars.push({ date: `2026-01-${String(i + 1).padStart(2, "0")}`, open: close, high: close, low: close, close, volume });
    close *= 1 + dailyChangePct / 100;
  }
  return bars;
}

test("getMarketPositioning requires a symbol universe", async () => {
  await assert.rejects(() => marketPositioningService.getMarketPositioning({ symbols: [] }), (error) => error.statusCode === 400);
});

test("filters out a company below the configured market cap floor — never scored, honestly excluded", async () => {
  const restore = mockFor("TINY", {
    marketCap: 100_000_000, // below MIN_MARKET_CAP_USD
    price: 10,
    todayVolume: 500_000,
    bars: makeBars(20, { volume: 500_000 }),
  });
  try {
    const result = await marketPositioningService.getMarketPositioning({ symbols: ["TINY"] });
    assert.equal(result.longPressure.length, 0);
    assert.equal(result.shortPressure.length, 0);
    assert.equal(result.excludedFromUniverse.length, 1);
    assert.equal(result.excludedFromUniverse[0].symbol, "TINY");
    assert.match(result.excludedFromUniverse[0].reason, /Market cap below/);
  } finally {
    restore();
  }
});

test("a real large-cap with strong positive momentum and elevated volume ranks in LONG_PRESSURE", async () => {
  const restore = mockFor("BIGCO", {
    marketCap: 500_000_000_000,
    price: 200,
    todayVolume: 30_000_000, // well above the 10M avg below -> high relative volume
    bars: makeBars(20, { startClose: 180, dailyChangePct: 0.6, volume: 10_000_000 }), // rising momentum
  });
  try {
    const result = await marketPositioningService.getMarketPositioning({ symbols: ["BIGCO"] });
    assert.equal(result.excludedFromUniverse.length, 0);
    assert.equal(result.longPressure.length, 1);
    assert.equal(result.longPressure[0].symbol, "BIGCO");
    assert.equal(result.longPressure[0].direction, "LONG_PRESSURE");
  } finally {
    restore();
  }
});

test("a real large-cap with strong negative momentum ranks in SHORT_PRESSURE", async () => {
  const restore = mockFor("FALLCO", {
    marketCap: 500_000_000_000,
    price: 50,
    todayVolume: 12_000_000,
    bars: makeBars(20, { startClose: 70, dailyChangePct: -0.9, volume: 10_000_000 }),
  });
  try {
    const result = await marketPositioningService.getMarketPositioning({ symbols: ["FALLCO"] });
    assert.equal(result.shortPressure.length, 1);
    assert.equal(result.shortPressure[0].symbol, "FALLCO");
    assert.equal(result.shortPressure[0].direction, "SHORT_PRESSURE");
  } finally {
    restore();
  }
});

test("never fabricates short interest / long interest / float — always explicitly listed as unavailable", async () => {
  const factorNames = marketPositioningService.UNAVAILABLE_FACTORS.map((entry) => entry.factor);
  assert.deepEqual(factorNames.sort(), ["float", "longInterest", "shortInterest"].sort());

  const restore = mockFor("AAPL", { marketCap: 3_000_000_000_000, price: 300, todayVolume: 20_000_000, bars: makeBars(20, { volume: 15_000_000 }) });
  try {
    const result = await marketPositioningService.getMarketPositioning({ symbols: ["AAPL"] });
    assert.deepEqual(result.unavailableFactors.map((entry) => entry.factor).sort(), ["float", "longInterest", "shortInterest"].sort());
  } finally {
    restore();
  }
});

test("computePressureScore returns null direction when no real signal is available at all", () => {
  const result = marketPositioningService.computePressureScore({ momentumPct: null, relativeVolume: null, avgDailyDollarVolume: null });
  assert.equal(result.pressureScore, null);
  assert.equal(result.direction, null);
  assert.deepEqual(result.componentsUsed, []);
});
