require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const autonomousMarketService = require("./autonomousMarketService");
const portfolioEngineService = require("./portfolioEngineService");
const autonomousRecommendationRepository = require("./autonomousRecommendationRepository");
const worldMemoryRepository = require("./worldMemoryRepository");
const homeSummaryService = require("./homeSummaryService");

function recommendationData(overrides = {}) {
  return {
    symbol: "NVDA",
    action: "BUY",
    confidenceScore: 88,
    expectedUpside: "15-22%",
    expectedDownside: "-7%",
    riskScore: 30,
    riskLabel: "Low",
    positionSizeSuggestion: "4-6%",
    reasoning: "Strong AI capex tailwind.",
    evidence: {},
    portfolioContext: null,
    timeHorizon: "1-3 months",
    explanation: { thesis: "Buy NVDA.", supportingEvidence: [], opposingEvidence: [], keyRisks: [], invalidationConditions: [], timeHorizon: "1-3 months", affectedPositions: [], affectedWatchlistSymbols: [], confidenceDrivers: [], confidenceReducers: [] },
    scenarios: [],
    qualityScore: 82,
    qualityComponents: {},
    ...overrides,
  };
}

function withMocks({ feed = [], portfolioSummary }, run) {
  const originalOverview = autonomousMarketService.getAutonomousOverview;
  const originalSummary = portfolioEngineService.getPortfolioSummary;

  autonomousMarketService.getAutonomousOverview = async () => ({ feed, globalMap: {} });
  portfolioEngineService.getPortfolioSummary = async () => portfolioSummary;

  return Promise.resolve(run()).finally(() => {
    autonomousMarketService.getAutonomousOverview = originalOverview;
    portfolioEngineService.getPortfolioSummary = originalSummary;
  });
}

function buildPortfolioSummary({ positions = [], totalValue = 100000 } = {}) {
  return { portfolioId: "test-portfolio", totalValue, positionsValue: 0, positions, allocation: { bySector: [], byAssetType: [] } };
}

test.beforeEach(async () => {
  await truncateAll();
});

test("prefers a portfolio-relevant event over a generic top-of-feed event", async () => {
  await withMocks(
    {
      feed: [
        { headline: "Generic market headline", whyItMatters: "General context.", relatedTickers: [], affectedAssets: [] },
        { headline: "NVDA supply deal", whyItMatters: "Expands NVDA capacity.", relatedTickers: ["NVDA"], affectedAssets: [] },
      ],
      portfolioSummary: buildPortfolioSummary({ positions: [{ symbol: "NVDA", marketValue: 20000 }] }),
    },
    async () => {
      const summary = await homeSummaryService.buildHomeSummary({});
      assert.equal(summary.whatHappened.headline, "NVDA supply deal");
      assert.match(summary.howDoesItAffectMe, /Directly affects NVDA/);
    }
  );
});

test("falls back to the top event and an honest 'doesn't affect you' line when nothing is personally relevant", async () => {
  await withMocks(
    {
      feed: [{ headline: "Generic market headline", whyItMatters: "General context.", relatedTickers: [], affectedAssets: [] }],
      portfolioSummary: buildPortfolioSummary({}),
    },
    async () => {
      const summary = await homeSummaryService.buildHomeSummary({});
      assert.equal(summary.whatHappened.headline, "Generic market headline");
      assert.match(summary.howDoesItAffectMe, /doesn't directly affect/);
    }
  );
});

test("says 'no action needed today' (hasAction: false) when there is no active recommendation", async () => {
  await withMocks({ feed: [], portfolioSummary: buildPortfolioSummary({}) }, async () => {
    const summary = await homeSummaryService.buildHomeSummary({});
    assert.equal(summary.shouldIDoAnythingToday.hasAction, false);
    assert.equal(summary.shouldIDoAnythingToday.action, null);
  });
});

test("surfaces the real canonical action when an active recommendation exists for the relevant symbol", async () => {
  const created = await autonomousRecommendationRepository.createRecommendation(recommendationData({ symbol: "NVDA" }));

  await withMocks(
    {
      feed: [{ headline: "NVDA news", whyItMatters: "Matters.", relatedTickers: ["NVDA"], affectedAssets: [] }],
      portfolioSummary: buildPortfolioSummary({ positions: [{ symbol: "NVDA", marketValue: 20000 }] }),
    },
    async () => {
      const summary = await homeSummaryService.buildHomeSummary({});
      assert.equal(summary.shouldIDoAnythingToday.hasAction, true);
      assert.equal(summary.shouldIDoAnythingToday.action, "BUY");
      assert.equal(summary.shouldIDoAnythingToday.recommendationId, created.id);
    }
  );
});

test("whatChangedForMyPortfolio and whatChangedSinceYesterday are always present, honest-empty when there's no prior data", async () => {
  await withMocks({ feed: [], portfolioSummary: buildPortfolioSummary({}) }, async () => {
    const summary = await homeSummaryService.buildHomeSummary({});
    assert.equal(summary.whatChangedForMyPortfolio.hasComparison, false);
    assert.ok(Array.isArray(summary.whatChangedSinceYesterday));
  });
});

test("whatChangedInBeliefs is an honest empty array when no thesis has changed", async () => {
  await withMocks({ feed: [], portfolioSummary: buildPortfolioSummary({}) }, async () => {
    const summary = await homeSummaryService.buildHomeSummary({});
    assert.deepEqual(summary.whatChangedInBeliefs, []);
  });
});

test("whatChangedInBeliefs surfaces a real recent WorldMemoryThesisRevision", async () => {
  await worldMemoryRepository.appendThesisRevision({ themeKey: "ai", newThesis: "AI capex accelerating." });

  await withMocks({ feed: [], portfolioSummary: buildPortfolioSummary({}) }, async () => {
    const summary = await homeSummaryService.buildHomeSummary({});
    assert.equal(summary.whatChangedInBeliefs.length, 1);
    assert.equal(summary.whatChangedInBeliefs[0].themeKey, "ai");
    assert.equal(summary.whatChangedInBeliefs[0].themeLabel, "AI");
  });
});

test("never fabricates a second verdict — the action always comes from canonicalVerdict.buildCanonicalVerdictView", async () => {
  await autonomousRecommendationRepository.createRecommendation(recommendationData({ symbol: "AAPL", action: "EXIT" }));

  await withMocks(
    { feed: [], portfolioSummary: buildPortfolioSummary({ positions: [{ symbol: "AAPL", marketValue: 5000 }] }) },
    async () => {
      const summary = await homeSummaryService.buildHomeSummary({});
      assert.equal(summary.shouldIDoAnythingToday.action, "EXIT");
    }
  );
});
