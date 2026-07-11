require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const autonomousMarketService = require("./autonomousMarketService");
const portfolioEngineService = require("./portfolioEngineService");
const autonomousRecommendationRepository = require("./autonomousRecommendationRepository");
const autonomousRecommendationEngine = require("./autonomousRecommendationEngine");

// A neutral, "Wait"-tier ranking entry (conviction ~60) so filler symbols in
// the universe never generate a recommendation of their own and don't
// pollute count-based assertions.
function neutralRanking(symbol) {
  return { symbol, opportunityScore: 55, riskScore: 45, overallAiScore: 58, primaryDriver: "No dominant event", explanation: `${symbol} is range-bound.` };
}

function buildPortfolioSummary({ positions = [], bySector = [], totalValue = 100000, positionsValue = 0 } = {}) {
  return {
    portfolioId: "test-portfolio",
    totalValue,
    positionsValue,
    positions,
    allocation: { bySector, byAssetType: [] },
  };
}

function withMocks({ rankings, feed = [], macroRegime = { recessionRisk: "low", inflationPressure: "low" }, portfolioSummary }, run) {
  const originalOverview = autonomousMarketService.getAutonomousOverview;
  const originalSummary = portfolioEngineService.getPortfolioSummary;
  const originalPlaceOrder = portfolioEngineService.placeOrder;

  let placeOrderCalls = 0;
  portfolioEngineService.placeOrder = async () => {
    placeOrderCalls += 1;
    throw new Error("placeOrder must never be called by the recommendation engine");
  };

  autonomousMarketService.getAutonomousOverview = async () => ({
    feed,
    watchlistRankings: rankings,
    globalMap: { macroRegime },
  });
  portfolioEngineService.getPortfolioSummary = async () => portfolioSummary;

  return Promise.resolve(run(() => placeOrderCalls))
    .finally(() => {
      autonomousMarketService.getAutonomousOverview = originalOverview;
      portfolioEngineService.getPortfolioSummary = originalSummary;
      portfolioEngineService.placeOrder = originalPlaceOrder;
    });
}

test.beforeEach(async () => {
  await truncateAll();
});

test("runOnce generates a BUY recommendation for a strong non-held signal", async () => {
  await withMocks(
    {
      rankings: [
        { symbol: "NVDA", opportunityScore: 90, riskScore: 30, overallAiScore: 88, primaryDriver: "AI capex surge", explanation: "Strong AI capex tailwind." },
        neutralRanking("AAPL"),
        neutralRanking("TSLA"),
      ],
      feed: [{ headline: "AI capex surge", importanceScore: 80, whyItMatters: "Hyperscaler spend accelerating.", relatedTickers: ["NVDA"], affectedAssets: [] }],
      portfolioSummary: buildPortfolioSummary({}),
    },
    async (getPlaceOrderCalls) => {
      const result = await autonomousRecommendationEngine.runOnce();
      assert.equal(result.errors.length, 0);

      const active = await autonomousRecommendationRepository.listActive();
      const nvda = active.find((item) => item.symbol === "NVDA");
      assert.ok(nvda, "expected a recommendation for NVDA");
      assert.equal(nvda.action, "BUY");
      assert.equal(Number(nvda.confidenceScore), 100);
      assert.equal(nvda.portfolioContext, null);
      assert.match(nvda.reasoning, /AI capex/);
      assert.equal(nvda.evidence.matchedEvents.length, 1);
      assert.equal(nvda.evidence.symbolSource, "market-scan", "not held and not on any passed watchlist");
      assert.equal(getPlaceOrderCalls(), 0, "the engine must never place a trade");
    }
  );
});

test("runOnce threads a caller-provided watchlist into the evaluation universe and marks its symbols as watchlist-sourced", async () => {
  await withMocks(
    {
      rankings: [
        { symbol: "PLTRX", opportunityScore: 92, riskScore: 25, overallAiScore: 90, primaryDriver: "Government contract win", explanation: "Large new contract announced." },
        neutralRanking("AAPL"),
        neutralRanking("NVDA"),
        neutralRanking("TSLA"),
      ],
      portfolioSummary: buildPortfolioSummary({}),
    },
    async () => {
      const result = await autonomousRecommendationEngine.runOnce({ watchlist: ["pltrx"] });
      assert.equal(result.symbolsEvaluated, 4, "default universe (3) plus the one watchlist symbol");

      const active = await autonomousRecommendationRepository.listActive();
      const pltrx = active.find((item) => item.symbol === "PLTRX");
      assert.ok(pltrx, "expected a recommendation for the watchlist-only symbol");
      assert.equal(pltrx.action, "BUY");
      assert.equal(pltrx.evidence.symbolSource, "watchlist");
    }
  );
});

test("runOnce threads a matched event's live news sourceUrl into evidence", async () => {
  await withMocks(
    {
      rankings: [
        { symbol: "NVDA", opportunityScore: 90, riskScore: 30, overallAiScore: 88, primaryDriver: "AI capex surge", explanation: "Strong AI capex tailwind." },
        neutralRanking("AAPL"),
        neutralRanking("TSLA"),
      ],
      feed: [
        { headline: "AI capex surge", importanceScore: 80, whyItMatters: "Hyperscaler spend accelerating.", relatedTickers: ["NVDA"], affectedAssets: [], sourceUrl: "https://news.example.com/ai-capex", sourceName: "Reuters", confidence: 82, reliability: "high" },
        { headline: "Synthetic scenario event", importanceScore: 50, whyItMatters: "Placeholder.", relatedTickers: ["NVDA"], affectedAssets: [], sourceUrl: null, sourceName: null },
      ],
      portfolioSummary: buildPortfolioSummary({}),
    },
    async () => {
      await autonomousRecommendationEngine.runOnce();
      const active = await autonomousRecommendationRepository.listActive();
      const nvda = active.find((item) => item.symbol === "NVDA");
      const liveMatch = nvda.evidence.matchedEvents.find((item) => item.headline === "AI capex surge");
      const syntheticMatch = nvda.evidence.matchedEvents.find((item) => item.headline === "Synthetic scenario event");
      assert.equal(liveMatch.sourceUrl, "https://news.example.com/ai-capex");
      assert.equal(liveMatch.sourceName, "Reuters");
      assert.equal(liveMatch.confidence, 82);
      assert.equal(liveMatch.reliability, "high");
      assert.equal(liveMatch.personalRelevance, "NVDA is part of today's broader market scan.");
      assert.equal(syntheticMatch.sourceUrl, null);
      assert.equal(syntheticMatch.sourceName, null);
    }
  );
});

test("runOnce personalizes matchedEvents' relevance line for a held position vs. a watchlist-only symbol", async () => {
  await withMocks(
    {
      rankings: [
        { symbol: "TSLA", opportunityScore: 20, riskScore: 85, overallAiScore: 25, primaryDriver: "Demand miss", explanation: "Deliveries below estimate." },
        { symbol: "PLTRX", opportunityScore: 92, riskScore: 25, overallAiScore: 90, primaryDriver: "Contract win", explanation: "Large new contract announced." },
        neutralRanking("AAPL"),
        neutralRanking("NVDA"),
      ],
      feed: [
        { headline: "Deliveries below estimate", importanceScore: 70, whyItMatters: "Miss vs. consensus.", relatedTickers: ["TSLA"], affectedAssets: [] },
        { headline: "Contract win", importanceScore: 75, whyItMatters: "New revenue stream.", relatedTickers: ["PLTRX"], affectedAssets: [] },
      ],
      portfolioSummary: buildPortfolioSummary({
        positions: [{ symbol: "TSLA", sector: "Automotive", marketValue: 12000, quantity: 20, unrealizedPnlPct: -8 }],
        bySector: [{ name: "Automotive", pct: 12 }],
        totalValue: 100000,
        positionsValue: 12000,
      }),
    },
    async () => {
      await autonomousRecommendationEngine.runOnce({ watchlist: ["PLTRX"] });
      const active = await autonomousRecommendationRepository.listActive();

      const tsla = active.find((item) => item.symbol === "TSLA");
      const tslaEvent = tsla.evidence.matchedEvents.find((item) => item.headline === "Deliveries below estimate");
      assert.equal(tslaEvent.personalRelevance, "Directly affects TSLA — 12% of your portfolio.");

      const pltrx = active.find((item) => item.symbol === "PLTRX");
      const pltrxEvent = pltrx.evidence.matchedEvents.find((item) => item.headline === "Contract win");
      assert.equal(pltrxEvent.personalRelevance, "PLTRX is on your watchlist.");
    }
  );
});

test("runOnce threads live quote data into evidence and reasoning when available", async () => {
  await withMocks(
    {
      rankings: [
        { symbol: "NVDA", opportunityScore: 90, riskScore: 30, overallAiScore: 88, primaryDriver: "AI capex surge", explanation: "Strong AI capex tailwind.", currentPrice: 192.5, dayChangePercent: 1.25 },
        neutralRanking("AAPL"),
        neutralRanking("TSLA"),
      ],
      portfolioSummary: buildPortfolioSummary({}),
    },
    async () => {
      await autonomousRecommendationEngine.runOnce();
      const active = await autonomousRecommendationRepository.listActive();
      const nvda = active.find((item) => item.symbol === "NVDA");
      assert.equal(nvda.evidence.currentPrice, 192.5);
      assert.equal(nvda.evidence.dayChangePercent, 1.25);
      assert.match(nvda.reasoning, /\$192\.50, \+1\.25% today/);
    }
  );
});

test("runOnce omits live price from reasoning when no quote was available", async () => {
  await withMocks(
    {
      rankings: [
        { symbol: "NVDA", opportunityScore: 90, riskScore: 30, overallAiScore: 88, primaryDriver: "AI capex surge", explanation: "Strong AI capex tailwind.", currentPrice: null, dayChangePercent: null },
        neutralRanking("AAPL"),
        neutralRanking("TSLA"),
      ],
      portfolioSummary: buildPortfolioSummary({}),
    },
    async () => {
      await autonomousRecommendationEngine.runOnce();
      const active = await autonomousRecommendationRepository.listActive();
      const nvda = active.find((item) => item.symbol === "NVDA");
      assert.equal(nvda.evidence.currentPrice, null);
      assert.doesNotMatch(nvda.reasoning, /Currently trading/);
    }
  );
});

test("runOnce generates an EXIT recommendation for a held position with a negative signal", async () => {
  await withMocks(
    {
      rankings: [
        { symbol: "TSLA", opportunityScore: 20, riskScore: 85, overallAiScore: 25, primaryDriver: "Demand miss", explanation: "Deliveries below estimate." },
        neutralRanking("AAPL"),
        neutralRanking("NVDA"),
      ],
      portfolioSummary: buildPortfolioSummary({
        positions: [{ symbol: "TSLA", sector: "Automotive", marketValue: 5000, quantity: 20, unrealizedPnlPct: -8 }],
        bySector: [{ name: "Automotive", pct: 5 }],
        totalValue: 100000,
        positionsValue: 5000,
      }),
    },
    async () => {
      await autonomousRecommendationEngine.runOnce();
      const active = await autonomousRecommendationRepository.listActive();
      const tsla = active.find((item) => item.symbol === "TSLA");
      assert.ok(tsla, "expected a recommendation for TSLA");
      assert.equal(tsla.action, "EXIT");
      assert.equal(tsla.portfolioContext.sector, "Automotive");
      assert.equal(tsla.evidence.symbolSource, "portfolio");
    }
  );
});

test("runOnce skips a Wait-tier signal for a symbol that isn't held", async () => {
  await withMocks(
    {
      rankings: [neutralRanking("AAPL"), neutralRanking("NVDA"), neutralRanking("TSLA")],
      portfolioSummary: buildPortfolioSummary({}),
    },
    async () => {
      const result = await autonomousRecommendationEngine.runOnce();
      assert.equal(result.recommendationsGenerated, 0);
      const active = await autonomousRecommendationRepository.listActive();
      assert.equal(active.length, 0);
    }
  );
});

test("runOnce forces a REDUCE for a held position over-concentrated by sector, even at a Wait-tier score", async () => {
  await withMocks(
    {
      rankings: [neutralRanking("XOM"), neutralRanking("AAPL"), neutralRanking("NVDA"), neutralRanking("TSLA")],
      portfolioSummary: buildPortfolioSummary({
        positions: [{ symbol: "XOM", sector: "Energy", marketValue: 42000, quantity: 400, unrealizedPnlPct: 12 }],
        bySector: [{ name: "Energy", pct: 42 }],
        totalValue: 100000,
        positionsValue: 42000,
      }),
    },
    async () => {
      await autonomousRecommendationEngine.runOnce();
      const active = await autonomousRecommendationRepository.listActive();
      const xom = active.find((item) => item.symbol === "XOM");
      assert.ok(xom, "expected a concentration-driven recommendation for XOM");
      assert.equal(xom.action, "REDUCE");
      assert.equal(xom.evidence.concentrationTriggered, true);
      assert.match(xom.reasoning, /concentration threshold/);
    }
  );
});

test("a second run supersedes the prior ACTIVE recommendation for the same symbol", async () => {
  const scenario = {
    rankings: [
      { symbol: "NVDA", opportunityScore: 90, riskScore: 30, overallAiScore: 88, primaryDriver: "AI capex surge", explanation: "Strong AI capex tailwind." },
      neutralRanking("AAPL"),
      neutralRanking("TSLA"),
    ],
    portfolioSummary: buildPortfolioSummary({}),
  };

  const firstId = await withMocks(scenario, async () => {
    await autonomousRecommendationEngine.runOnce();
    const active = await autonomousRecommendationRepository.listActive();
    return active.find((item) => item.symbol === "NVDA").id;
  });

  const secondId = await withMocks(scenario, async () => {
    await autonomousRecommendationEngine.runOnce();
    const active = await autonomousRecommendationRepository.listActive();
    return active.find((item) => item.symbol === "NVDA").id;
  });

  assert.notEqual(firstId, secondId);
  const superseded = await autonomousRecommendationRepository.getById(firstId);
  assert.equal(superseded.status, "SUPERSEDED");
  assert.equal(superseded.supersededById, secondId);

  const active = await autonomousRecommendationRepository.listActive();
  assert.equal(active.filter((item) => item.symbol === "NVDA").length, 1, "only one ACTIVE recommendation per symbol");
});

test("runOnce writes exactly one AutonomousRunLog row per run with symbol/recommendation counts", async () => {
  await withMocks(
    {
      rankings: [
        { symbol: "NVDA", opportunityScore: 90, riskScore: 30, overallAiScore: 88, primaryDriver: "AI capex surge", explanation: "Strong AI capex tailwind." },
        neutralRanking("AAPL"),
        neutralRanking("TSLA"),
      ],
      portfolioSummary: buildPortfolioSummary({}),
    },
    async () => {
      const result = await autonomousRecommendationEngine.runOnce();
      assert.equal(result.symbolsEvaluated, 3); // NVDA, AAPL, TSLA (default watchlist, none held)
      assert.equal(result.recommendationsGenerated, 1);

      const runLog = await autonomousRecommendationRepository.getLatestRunLog();
      assert.equal(runLog.symbolsEvaluated, 3);
      assert.equal(runLog.recommendationsGenerated, 1);
    }
  );
});
