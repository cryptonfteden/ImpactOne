// Sprint 32 — Investor Memory (Priority 1). "The system should gradually
// understand the investor. Learn: favorite sectors, favorite themes,
// reading depth, holding behavior, reaction patterns, learning progress.
// Everything append-only. Never overwrite history."
//
// This is a synthesis layer, not a new data store: every dimension below
// reuses an append-only source this engagement already built rather than
// inventing a competing one — UserMemoryEvent (Sprint 30) for sectors/
// themes/reading depth, real Trade history for holding behavior,
// RecommendationFeedback (Sprint 29, via learningLoopService's existing
// aggregator) for reaction patterns, and personalProgressService (Sprint
// 31) for learning progress. Nothing here writes anything; it only reads
// and combines.
const userMemoryRepository = require("./userMemoryRepository");
const autonomousRecommendationRepository = require("./autonomousRecommendationRepository");
const portfolioEngineService = require("./portfolioEngineService");
const learningLoopService = require("./learningLoopService");
const personalProgressService = require("./personalProgressService");

const MIN_SAMPLE = 3;

/**
 * "Reading depth": what fraction of viewed recommendations the investor
 * went on to give feedback about — a real, already-recorded signal of
 * engaging deeply enough to form a reaction, vs. just skimming the list.
 */
async function computeReadingDepth() {
  const [viewCounts, feedbackRows] = await Promise.all([
    userMemoryRepository.getRecommendationViewCounts(),
    autonomousRecommendationRepository.listAllFeedback(),
  ]);

  const totalViews = Array.from(viewCounts.values()).reduce((sum, count) => sum + count, 0);
  if (totalViews < MIN_SAMPLE) {
    return { hasEnoughData: false, message: `More reading activity needed to measure depth (${totalViews} views so far, need at least ${MIN_SAMPLE}).` };
  }

  const symbolsWithFeedback = new Set(feedbackRows.map((row) => row.recommendation?.symbol).filter(Boolean));
  const viewedSymbolsWithFeedback = Array.from(viewCounts.keys()).filter((symbol) => symbolsWithFeedback.has(symbol)).length;
  const depthRatioPct = Math.round((viewedSymbolsWithFeedback / viewCounts.size) * 100);

  return {
    hasEnoughData: true,
    totalViews,
    viewedSymbolsWithFeedbackCount: viewedSymbolsWithFeedback,
    depthRatioPct,
    label: depthRatioPct >= 50 ? "deep reader" : depthRatioPct >= 20 ? "selective reader" : "skimmer",
  };
}

/**
 * "Holding behavior": pairs each symbol's BUY trades with its next SELL
 * (simple FIFO by execution time) to compute a real average holding
 * period. Never a fabricated trading-style label beyond what the actual
 * paired trades support.
 */
async function computeHoldingBehavior() {
  const trades = await portfolioEngineService.getTradeHistory({});
  const bySymbol = new Map();
  for (const trade of trades.slice().sort((a, b) => new Date(a.executedAt) - new Date(b.executedAt))) {
    if (!bySymbol.has(trade.symbol)) bySymbol.set(trade.symbol, []);
    bySymbol.get(trade.symbol).push(trade);
  }

  const holdingDurationsDays = [];
  for (const symbolTrades of bySymbol.values()) {
    const buys = symbolTrades.filter((t) => t.side === "BUY").slice();
    const sells = symbolTrades.filter((t) => t.side === "SELL").slice();
    const pairCount = Math.min(buys.length, sells.length);
    for (let i = 0; i < pairCount; i += 1) {
      const days = (new Date(sells[i].executedAt).getTime() - new Date(buys[i].executedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (days >= 0) holdingDurationsDays.push(days);
    }
  }

  if (holdingDurationsDays.length < MIN_SAMPLE) {
    return { hasEnoughData: false, message: `More completed trades needed to measure holding behavior (${holdingDurationsDays.length} closed round-trips so far, need at least ${MIN_SAMPLE}).` };
  }

  const avgHoldingDays = Math.round((holdingDurationsDays.reduce((sum, d) => sum + d, 0) / holdingDurationsDays.length) * 10) / 10;
  return {
    hasEnoughData: true,
    closedRoundTrips: holdingDurationsDays.length,
    avgHoldingDays,
    label: avgHoldingDays <= 7 ? "short-term trader" : avgHoldingDays <= 60 ? "swing holder" : "long-term holder",
  };
}

async function getInvestorMemory() {
  const [sectorSummary, themeSummary, readingDepth, holdingBehavior, feedbackRows, understanding] = await Promise.all([
    userMemoryRepository.getSectorInterestSummary(),
    userMemoryRepository.getThemeInterestSummary(),
    computeReadingDepth(),
    computeHoldingBehavior(),
    autonomousRecommendationRepository.listAllFeedback(),
    personalProgressService.computeUnderstandingProgress(),
  ]);

  return {
    favoriteSectors: sectorSummary.favoriteSectors,
    favoriteThemes: themeSummary.favoriteThemes,
    readingDepth,
    holdingBehavior,
    reactionPatterns: learningLoopService.aggregateFeedbackSignals(feedbackRows),
    learningProgress: understanding,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  getInvestorMemory,
  computeReadingDepth,
  computeHoldingBehavior,
};
