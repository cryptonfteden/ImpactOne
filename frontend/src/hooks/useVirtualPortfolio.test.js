import { describe, expect, it } from "vitest";
import { recomputeState } from "./useVirtualPortfolio";

// Regression test for a bug flagged in code review: dailyReturn was computed
// from quote.change (Finnhub's absolute dollar move) divided by 100, instead
// of quote.changePercent (the real day % change). Sprint 15 added
// changePercent to the quote payload; this locks in that the legacy
// portfolio engine actually uses it.
describe("useVirtualPortfolio recomputeState", () => {
  it("computes dailyReturn from each position's real day % change, not the absolute dollar change", () => {
    const state = {
      cashBalance: 90000,
      realizedPnL: 0,
      positions: [
        { symbol: "MSFT", quantity: 10, averageEntryPrice: 250, sector: "Technology", assetType: "Equity" },
      ],
      trades: [],
      benchmark: { symbol: "SPY", baselinePrice: null, currentPrice: null, returnPct: 0 },
      rules: {},
    };

    // Absolute dollar move ($5) deliberately differs from the real percent
    // move (2%) so the assertion can tell which field was actually used.
    const quotesMap = {
      MSFT: { quote: { price: 250, change: 5, changePercent: 2 } },
    };

    const result = recomputeState(state, quotesMap, null);

    // marketValue = 10 * $250 = $2500; correct dailyReturn = $2500 * 2% = $50.
    // The old bug would have produced $2500 * (5/100) = $125.
    expect(result.dailyReturn).toBe(50);
  });
});
