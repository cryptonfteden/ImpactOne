require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const autonomousMarketService = require("./autonomousMarketService");
const portfolioEngineService = require("./portfolioEngineService");
const autonomousRecommendationRepository = require("./autonomousRecommendationRepository");
const worldMemoryRepository = require("./worldMemoryRepository");
const investorProfileRepository = require("./investorProfileRepository");
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

test("Sprint 28 — classifyTimelineSection buckets every event into one of the five sections using real timeBucket/timeHorizon fields", () => {
  assert.equal(homeSummaryService.classifyTimelineSection({ timeBucket: "overnight" }), "overnight");
  assert.equal(homeSummaryService.classifyTimelineSection({ timeBucket: "since-open" }), "openingBell");
  assert.equal(homeSummaryService.classifyTimelineSection({ timeBucket: "last-hour", timeHorizon: "2-4 weeks" }), "thisWeek");
  assert.equal(homeSummaryService.classifyTimelineSection({ timeBucket: "last-hour", timeHorizon: "6-12 months" }), "longTerm");
  assert.equal(homeSummaryService.classifyTimelineSection({ timeBucket: "last-hour", timeHorizon: "1-3 months" }), "today");
});

test("Sprint 28 — buildIntelligenceTimeline places every feed item into exactly one section, none dropped", () => {
  const feed = [
    { headline: "A", timeBucket: "overnight" },
    { headline: "B", timeBucket: "since-open" },
    { headline: "C", timeBucket: "last-hour", timeHorizon: "2-4 weeks" },
    { headline: "D", timeBucket: "last-hour", timeHorizon: "12 month" },
    { headline: "E", timeBucket: "last-hour", timeHorizon: "1-3 months" },
  ];
  const timeline = homeSummaryService.buildIntelligenceTimeline(feed);
  const totalPlaced = Object.values(timeline).reduce((sum, section) => sum + section.length, 0);
  assert.equal(totalPlaced, feed.length);
  assert.equal(timeline.overnight[0].headline, "A");
  assert.equal(timeline.openingBell[0].headline, "B");
  assert.equal(timeline.thisWeek[0].headline, "C");
  assert.equal(timeline.longTerm[0].headline, "D");
  assert.equal(timeline.today[0].headline, "E");
});

test("Sprint 28 — describePriorityReason names the real signal that ranked an item, not a generic label", () => {
  const heldReason = homeSummaryService.describePriorityReason({ relatedTickers: ["NVDA"], affectedAssets: [] }, null, ["NVDA"], []);
  assert.match(heldReason, /you hold a position/i);

  const watchlistReason = homeSummaryService.describePriorityReason({ relatedTickers: ["TSLA"], affectedAssets: [] }, null, [], ["TSLA"]);
  assert.match(watchlistReason, /watchlist/i);

  const riskProfileReason = homeSummaryService.describePriorityReason(
    { relatedTickers: [], affectedAssets: [], impactType: "opportunity" },
    { riskTolerance: "HIGH" },
    [],
    []
  );
  assert.match(riskProfileReason, /risk tolerance/i);

  const fallbackReason = homeSummaryService.describePriorityReason({ relatedTickers: [], affectedAssets: [] }, null, [], []);
  assert.match(fallbackReason, /overall market importance/i);
});

test("Sprint 28 — buildPortfolioMorningSummary surfaces the highest-quality BUY as the opportunity and highest-risk EXIT/REDUCE as the risk, no fabricated alerts", () => {
  const topRecommendations = [
    { symbol: "NVDA", action: "BUY", qualityScore: 90, riskScore: 20 },
    { symbol: "TSLA", action: "BUY", qualityScore: 60, riskScore: 40 },
    { symbol: "META", action: "EXIT", qualityScore: 50, riskScore: 85 },
  ];
  const result = homeSummaryService.buildPortfolioMorningSummary({ topRecommendations, feed: [], heldSymbols: [] });
  assert.equal(result.biggestOpportunity.symbol, "NVDA");
  assert.equal(result.biggestRisk.symbol, "META");
  assert.equal(result.canWaitCount, 0);
});

test("Sprint 28 — buildPortfolioMorningSummary is honest about no opportunity/risk when nothing qualifies", () => {
  const result = homeSummaryService.buildPortfolioMorningSummary({ topRecommendations: [], feed: [], heldSymbols: [] });
  assert.equal(result.biggestOpportunity, null);
  assert.equal(result.biggestRisk, null);
});

test("Sprint 28 — buildHomeSummary's Morning Brief merges topRecommendations, portfolioSnapshot, intelligenceTimeline, todayForYou, and portfolioMorningSummary into one response", async () => {
  const originalListActive = autonomousRecommendationRepository.listActive;
  const originalFindProfile = investorProfileRepository.findDefaultInvestorProfile;
  autonomousRecommendationRepository.listActive = async () => [];
  investorProfileRepository.findDefaultInvestorProfile = async () => null;

  await withMocks(
    {
      feed: [{ headline: "Macro update", whyItMatters: "General context.", relatedTickers: [], affectedAssets: [], timeBucket: "last-hour", timeHorizon: "1-3 months" }],
      portfolioSummary: buildPortfolioSummary({ positions: [{ symbol: "AAPL", marketValue: 5000 }], totalValue: 105000 }),
    },
    async () => {
      const summary = await homeSummaryService.buildHomeSummary({});
      assert.ok(Array.isArray(summary.topRecommendations));
      assert.equal(summary.portfolioSnapshot.totalValue, 105000);
      assert.equal(summary.portfolioSnapshot.positionCount, 1);
      assert.ok(summary.intelligenceTimeline.today.length >= 1);
      assert.ok(Array.isArray(summary.todayForYou));
      assert.ok("biggestOpportunity" in summary.portfolioMorningSummary);
    }
  ).finally(() => {
    autonomousRecommendationRepository.listActive = originalListActive;
    investorProfileRepository.findDefaultInvestorProfile = originalFindProfile;
  });
});
