require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { computeQualityScore, QUALITY_WEIGHTS } = require("./autonomousRecommendationEngine");

function matchedEvent(overrides = {}) {
  return {
    sourceName: "Reuters",
    publishedAt: new Date().toISOString(),
    sourceUrl: "https://news.example.com/a",
    ...overrides,
  };
}

test("QUALITY_WEIGHTS sum to 1 (a transparent, fully-allocated rollup)", () => {
  const total = Object.values(QUALITY_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  assert.ok(Math.abs(total - 1) < 1e-9, `weights should sum to 1, got ${total}`);
});

test("computeQualityScore returns all six named components, the Phase X11 outcome-feedback component, plus a bounded rollup", () => {
  const { qualityScore, qualityComponents } = computeQualityScore({
    matchedEvents: [matchedEvent()],
    symbolSource: "portfolio",
    positionWeightPct: 10,
    convictionScore: 80,
    rankingItem: { currentPrice: 100 },
    macroRegime: { recessionRisk: "low" },
    supportingCount: 2,
    opposingCount: 0,
  });

  assert.ok(qualityScore >= 0 && qualityScore <= 100);
  assert.deepEqual(Object.keys(qualityComponents).sort(), [
    "dataCompleteness",
    "evidenceAgreement",
    "evidenceFreshness",
    "modelConfidence",
    "outcomeFeedbackAdjustment",
    "portfolioRelevance",
    "sourceQuality",
  ]);
  // Phase X11 — Part 1. No adjustment was passed in this call, so the
  // component is honestly null, not a fabricated zero-with-no-explanation.
  assert.equal(qualityComponents.outcomeFeedbackAdjustment, null);
});

test("modelConfidence always equals the passed convictionScore directly", () => {
  const { qualityComponents } = computeQualityScore({
    matchedEvents: [],
    symbolSource: "market-scan",
    positionWeightPct: 0,
    convictionScore: 67,
    rankingItem: {},
    macroRegime: null,
    supportingCount: 0,
    opposingCount: 0,
  });

  assert.equal(qualityComponents.modelConfidence, 67);
});

test("portfolioRelevance ranks portfolio > watchlist > market-scan for otherwise identical inputs", () => {
  const base = { matchedEvents: [], convictionScore: 50, rankingItem: {}, macroRegime: null, supportingCount: 0, opposingCount: 0 };

  const portfolio = computeQualityScore({ ...base, symbolSource: "portfolio", positionWeightPct: 0 });
  const watchlist = computeQualityScore({ ...base, symbolSource: "watchlist", positionWeightPct: 0 });
  const marketScan = computeQualityScore({ ...base, symbolSource: "market-scan", positionWeightPct: 0 });

  assert.ok(portfolio.qualityComponents.portfolioRelevance > watchlist.qualityComponents.portfolioRelevance);
  assert.ok(watchlist.qualityComponents.portfolioRelevance > marketScan.qualityComponents.portfolioRelevance);
});

test("a larger held position weight increases portfolioRelevance, capped at 100", () => {
  const base = { matchedEvents: [], symbolSource: "portfolio", convictionScore: 50, rankingItem: {}, macroRegime: null, supportingCount: 0, opposingCount: 0 };

  const small = computeQualityScore({ ...base, positionWeightPct: 2 });
  const large = computeQualityScore({ ...base, positionWeightPct: 50 });

  assert.ok(large.qualityComponents.portfolioRelevance >= small.qualityComponents.portfolioRelevance);
  assert.ok(large.qualityComponents.portfolioRelevance <= 100);
});

test("evidenceAgreement is 100 when all directional evidence supports the recommendation", () => {
  const { qualityComponents } = computeQualityScore({
    matchedEvents: [],
    symbolSource: "market-scan",
    positionWeightPct: 0,
    convictionScore: 50,
    rankingItem: {},
    macroRegime: null,
    supportingCount: 3,
    opposingCount: 0,
  });

  assert.equal(qualityComponents.evidenceAgreement, 100);
});

test("evidenceAgreement is 50 (neutral default) when there is no directional evidence at all", () => {
  const { qualityComponents } = computeQualityScore({
    matchedEvents: [],
    symbolSource: "market-scan",
    positionWeightPct: 0,
    convictionScore: 50,
    rankingItem: {},
    macroRegime: null,
    supportingCount: 0,
    opposingCount: 0,
  });

  assert.equal(qualityComponents.evidenceAgreement, 50);
});

test("dataCompleteness accumulates 25 points per present signal, out of 100", () => {
  const none = computeQualityScore({
    matchedEvents: [],
    symbolSource: "market-scan",
    positionWeightPct: 0,
    convictionScore: 50,
    rankingItem: {},
    macroRegime: null,
    supportingCount: 0,
    opposingCount: 0,
  });
  assert.equal(none.qualityComponents.dataCompleteness, 0);

  const all = computeQualityScore({
    matchedEvents: [matchedEvent()],
    symbolSource: "market-scan",
    positionWeightPct: 0,
    convictionScore: 50,
    rankingItem: { currentPrice: 100 },
    macroRegime: { recessionRisk: "low" },
    supportingCount: 0,
    opposingCount: 0,
  });
  assert.equal(all.qualityComponents.dataCompleteness, 100);
});

test("computeQualityScore doesn't crash with no matched events and gracefully degrades", () => {
  const { qualityScore, qualityComponents } = computeQualityScore({
    matchedEvents: [],
    symbolSource: "market-scan",
    positionWeightPct: 0,
    convictionScore: 50,
    rankingItem: {},
    macroRegime: null,
    supportingCount: 0,
    opposingCount: 0,
  });

  assert.ok(Number.isFinite(qualityScore));
  assert.equal(qualityComponents.sourceQuality, 50, "default source quality with no matched events");
  assert.equal(qualityComponents.evidenceFreshness, 40, "default freshness with no matched events");
});
