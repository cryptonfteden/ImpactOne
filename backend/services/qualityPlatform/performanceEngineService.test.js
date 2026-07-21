require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const priceHistoryProvider = require("../intelligence/priceHistoryProvider");
const performanceEngineService = require("./performanceEngineService");

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

test("computePerformanceMetrics computes real absolute return, drawdown, gain, and volatility from a real price series", async () => {
  const bars = [
    { date: isoDaysAgo(4), open: 100, high: 101, low: 99, close: 100, volume: 1 },
    { date: isoDaysAgo(3), open: 100, high: 96, low: 94, close: 95, volume: 1 }, // drawdown from entry
    { date: isoDaysAgo(2), open: 95, high: 106, low: 94, close: 105, volume: 1 },
    { date: isoDaysAgo(1), open: 105, high: 112, low: 104, close: 110, volume: 1 }, // max gain point
    { date: isoDaysAgo(0), open: 110, high: 111, low: 107, close: 108, volume: 1 },
  ];
  const originalGetDailyBars = priceHistoryProvider.getDailyBars;
  priceHistoryProvider.getDailyBars = async (symbol) => (symbol === "NVDA" ? bars : []);

  try {
    const result = await performanceEngineService.computePerformanceMetrics({
      symbol: "NVDA",
      entryPrice: 100,
      startDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      sector: null,
      expectedUpside: "10%",
      expectedDownside: "-5%",
    });

    assert.ok(result);
    assert.equal(result.absoluteReturnPct, 8, "last close 108 vs entry 100 = +8%");
    assert.equal(result.maxGainPct, 10, "peak close 110 vs entry 100 = +10%");
    assert.ok(result.maxDrawdownPct < 0, "a real drawdown occurred (95 after 100) and must be reported as negative");
    assert.ok(Number.isFinite(result.volatilityPct));
    assert.equal(result.sectorEtfSymbol, null, "no sector was given — never guess one");
    assert.equal(result.sectorEtfReturnPct, null);
  } finally {
    priceHistoryProvider.getDailyBars = originalGetDailyBars;
  }
});

test("computePerformanceMetrics computes time to target and time to failure from real crossing days, never invented ones", async () => {
  const bars = [
    { date: isoDaysAgo(2), open: 100, high: 101, low: 99, close: 100, volume: 1 },
    { date: isoDaysAgo(1), open: 100, high: 112, low: 100, close: 111, volume: 1 }, // crosses +10% target on day 1
    { date: isoDaysAgo(0), open: 111, high: 112, low: 108, close: 109, volume: 1 },
  ];
  const originalGetDailyBars = priceHistoryProvider.getDailyBars;
  priceHistoryProvider.getDailyBars = async (symbol) => (symbol === "NVDA" ? bars : []);

  try {
    const result = await performanceEngineService.computePerformanceMetrics({
      symbol: "NVDA",
      entryPrice: 100,
      startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      expectedUpside: "10%",
      expectedDownside: "-30%", // never crossed in this fixture
    });

    assert.equal(result.timeToTargetDays, 1);
    assert.equal(result.timeToFailureDays, null, "a target never crossed must be honestly null, never fabricated");
  } finally {
    priceHistoryProvider.getDailyBars = originalGetDailyBars;
  }
});

test("computePerformanceMetrics uses the real sector ETF and computes returnVsSectorPct only when a real sector is known", async () => {
  const symbolBars = [
    { date: isoDaysAgo(1), open: 100, high: 101, low: 99, close: 100, volume: 1 },
    { date: isoDaysAgo(0), open: 100, high: 112, low: 99, close: 110, volume: 1 },
  ];
  const spyBars = [
    { date: isoDaysAgo(1), open: 500, high: 501, low: 499, close: 500, volume: 1 },
    { date: isoDaysAgo(0), open: 500, high: 505, low: 499, close: 505, volume: 1 },
  ];
  const xlkBars = [
    { date: isoDaysAgo(1), open: 200, high: 201, low: 199, close: 200, volume: 1 },
    { date: isoDaysAgo(0), open: 200, high: 203, low: 199, close: 202, volume: 1 },
  ];
  const originalGetDailyBars = priceHistoryProvider.getDailyBars;
  priceHistoryProvider.getDailyBars = async (symbol) => {
    if (symbol === "NVDA") return symbolBars;
    if (symbol === "SPY") return spyBars;
    if (symbol === "XLK") return xlkBars;
    return [];
  };

  try {
    const result = await performanceEngineService.computePerformanceMetrics({
      symbol: "NVDA",
      entryPrice: 100,
      startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      sector: "Technology",
    });

    assert.equal(result.sectorEtfSymbol, "XLK");
    assert.ok(Number.isFinite(result.sectorEtfReturnPct));
    assert.ok(Number.isFinite(result.returnVsSectorPct));
    assert.ok(Number.isFinite(result.returnVsSpyPct));
  } finally {
    priceHistoryProvider.getDailyBars = originalGetDailyBars;
  }
});

test("computePerformanceMetrics returns null (never a fabricated result) when no real entry price or price history exists", async () => {
  const originalGetDailyBars = priceHistoryProvider.getDailyBars;
  priceHistoryProvider.getDailyBars = async () => [];
  try {
    assert.equal(await performanceEngineService.computePerformanceMetrics({ symbol: "NVDA", entryPrice: 100, startDate: new Date() }), null);
    assert.equal(await performanceEngineService.computePerformanceMetrics({ symbol: "NVDA", entryPrice: NaN, startDate: new Date() }), null);
  } finally {
    priceHistoryProvider.getDailyBars = originalGetDailyBars;
  }
});

test("extractTargetPct reads the first real number out of a target string, never a fabricated default", () => {
  assert.equal(performanceEngineService.extractTargetPct("10-15%"), 10);
  assert.equal(performanceEngineService.extractTargetPct("-8% tactical stop"), -8);
  assert.equal(performanceEngineService.extractTargetPct(null), null);
  assert.equal(performanceEngineService.extractTargetPct(""), null);
});
