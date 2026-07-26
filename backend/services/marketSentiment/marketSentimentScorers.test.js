require("../../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const scorers = require("./marketSentimentScorers");

const NOW = new Date("2026-07-26T20:00:00.000Z");

function feedItem({ impactType, importanceScore, affectedRegions = [], publishedAt = "2026-07-26T18:00:00.000Z" }) {
  return { impactType, importanceScore, affectedRegions, publishedAt };
}

test("News Sentiment: all real inputs available produces a real score/confidence and real contributors", () => {
  const feed = [
    feedItem({ impactType: "opportunity", importanceScore: 70 }),
    feedItem({ impactType: "opportunity", importanceScore: 60 }),
    feedItem({ impactType: "risk", importanceScore: 40 }),
  ];
  const reading = scorers.scoreNewsSentiment({ feed, market: "US", now: NOW });
  assert.equal(reading.unavailable, false);
  assert.ok(Number.isFinite(reading.score));
  assert.ok(Number.isFinite(reading.confidence));
  assert.equal(reading.contributors.length, 2);
  for (const contributor of reading.contributors) {
    assert.ok("source" in contributor);
    assert.ok("rawValue" in contributor);
    assert.ok("normalizedValue" in contributor);
    assert.ok("weight" in contributor);
    assert.ok("confidence" in contributor);
    assert.ok("freshness" in contributor);
    assert.ok("contributionToScore" in contributor);
  }
});

test("News Sentiment: no matching feed items for a market is honestly unavailable, not a guessed neutral score", () => {
  const feed = [feedItem({ impactType: "opportunity", importanceScore: 70, affectedRegions: ["Japan"] })];
  const reading = scorers.scoreNewsSentiment({ feed, market: "EUROPE", now: NOW });
  assert.equal(reading.unavailable, true);
  assert.equal(reading.score, null);
  assert.equal(reading.confidence, null);
  assert.match(reading.reason, /No feed items are tagged/);
});

test("News Sentiment: market isolation — Europe-tagged items never leak into a US reading and vice versa", () => {
  const feed = [feedItem({ impactType: "risk", importanceScore: 80, affectedRegions: ["Europe"] })];
  const usReading = scorers.scoreNewsSentiment({ feed, market: "US", now: NOW });
  const euReading = scorers.scoreNewsSentiment({ feed, market: "EUROPE", now: NOW });
  assert.equal(usReading.unavailable, true); // no untagged/US-tagged item exists in this feed
  assert.equal(euReading.unavailable, false);
});

test("AI Recommendation Distribution: real BUY/REDUCE/EXIT tally produces a real net-tilt score", () => {
  const recommendations = [
    { action: "BUY", createdAt: "2026-07-26T10:00:00.000Z" },
    { action: "BUY", createdAt: "2026-07-26T11:00:00.000Z" },
    { action: "EXIT", createdAt: "2026-07-26T12:00:00.000Z" },
  ];
  const reading = scorers.scoreAiRecommendationDistribution({ recommendations, market: "US", now: NOW });
  assert.equal(reading.unavailable, false);
  assert.ok(reading.score > 50); // net bullish tilt (2 buy vs 1 exit)
  assert.equal(reading.contributors[0].rawValue.total, 3);
});

test("AI Recommendation Distribution: honestly unavailable for a market the recommendation engine doesn't cover", () => {
  const reading = scorers.scoreAiRecommendationDistribution({ recommendations: [{ action: "BUY" }], market: "JAPAN", now: NOW });
  assert.equal(reading.unavailable, true);
  assert.match(reading.reason, /US equities only/);
});

test("AI Recommendation Distribution: no active recommendations is honestly unavailable, never a fabricated neutral score", () => {
  const reading = scorers.scoreAiRecommendationDistribution({ recommendations: [], market: "US", now: NOW });
  assert.equal(reading.unavailable, true);
  assert.match(reading.reason, /No active recommendations/);
});

test("Fear & Greed: real macro regime + real polymarket trend composite", () => {
  const macroData = { source: "fred", regime: { riskMode: "risk-on" }, rates: { asOf: "2026-07-25" } };
  const polymarketData = [{ trend: "Up", source: "polymarket" }];
  const reading = scorers.scoreFearGreed({ macroData, polymarketData, market: "US", now: NOW });
  assert.equal(reading.unavailable, false);
  assert.ok(reading.score > 50);
  assert.equal(reading.contributors.length, 2);
});

test("Fear & Greed: honestly unavailable for a market with no real macro data source", () => {
  const reading = scorers.scoreFearGreed({ macroData: { source: "fred", regime: { riskMode: "risk-on" } }, polymarketData: [], market: "CHINA", now: NOW });
  assert.equal(reading.unavailable, true);
  assert.match(reading.reason, /No macro data source exists for this market region/);
});

test("Fear & Greed: fallback macro data (not live FRED) still computes, but with visibly lower confidence than live data", () => {
  const liveReading = scorers.scoreFearGreed({ macroData: { source: "fred", regime: { riskMode: "risk-on" } }, polymarketData: [], market: "US", now: NOW });
  const fallbackReading = scorers.scoreFearGreed({ macroData: { source: "fallback", regime: { riskMode: "risk-on" } }, polymarketData: [], market: "US", now: NOW });
  assert.ok(fallbackReading.confidence < liveReading.confidence);
});

test("Volatility: real per-symbol volatility regimes aggregate into one score", () => {
  const analyses = [
    { symbol: "SPY", signals: { volatilityRegime: { enoughData: true, signal: "LOW_VOLATILITY", calculationInputs: { percentile: 10 }, freshness: { lastBarDate: "2026-07-25" } } } },
    { symbol: "QQQ", signals: { volatilityRegime: { enoughData: true, signal: "HIGH_VOLATILITY", calculationInputs: { percentile: 90 }, freshness: { lastBarDate: "2026-07-25" } } } },
  ];
  const reading = scorers.scoreVolatility({ analyses, market: "US", now: NOW });
  assert.equal(reading.unavailable, false);
  assert.equal(reading.contributors.length, 2);
});

test("Volatility: honestly unavailable when no proxy symbol has enough real price history", () => {
  const analyses = [{ symbol: "SPY", signals: { volatilityRegime: { enoughData: false } } }];
  const reading = scorers.scoreVolatility({ analyses, market: "US", now: NOW });
  assert.equal(reading.unavailable, true);
  assert.match(reading.reason, /sufficient real price history/);
});

test("Macro Events: real regime + real COT data compose, and the event-calendar gap is always disclosed", () => {
  const macroData = { source: "fred", regime: { inflationPressure: "low", recessionRisk: "low" }, cpi: { asOf: "2026-07-01" } };
  const cotResult = { status: "LIVE", errorState: null, netPositionChangePct: 5, asOf: "2026-07-20" };
  const reading = scorers.scoreMacroEvents({ macroData, cotResult, market: "COMMODITIES", now: NOW });
  assert.equal(reading.unavailable, false);
  assert.equal(reading.contributors.length, 2);
  assert.equal(reading.missingInputs.length, 1);
  assert.match(reading.missingInputs[0], /Fed\/ECB\/FOMC\/Treasury/);
});

test("Macro Events: honestly unavailable for a market with no real macro data source", () => {
  const reading = scorers.scoreMacroEvents({ macroData: { source: "fred", regime: {} }, cotResult: null, market: "INDIA", now: NOW });
  assert.equal(reading.unavailable, true);
});

test("Macro Events: still computes from macro regime alone when COT data isn't available for this market", () => {
  const macroData = { source: "fred", regime: { inflationPressure: "moderate", recessionRisk: "medium" }, cpi: { asOf: "2026-07-01" } };
  const reading = scorers.scoreMacroEvents({ macroData, cotResult: null, market: "US", now: NOW });
  assert.equal(reading.unavailable, false);
  assert.equal(reading.contributors.length, 1);
});
