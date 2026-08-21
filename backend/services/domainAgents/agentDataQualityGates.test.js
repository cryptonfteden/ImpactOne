const test = require("node:test");
const assert = require("node:assert/strict");

const technical = require("./technicalAgent/technicalAgent");
const shortInterest = require("./shortInterestAgent/shortInterestAgent");
const options = require("./optionsFlowAgent/optionsFlowAgent");
const analyst = require("./analystConsensusAgent/analystConsensusAgent");
const etf = require("./etfFlowAgent/etfFlowAgent");
const sentiment = require("./sentimentAgent/sentimentAgent");

function finraDate(daysAgo = 0) {
  const date = new Date(Date.now() - daysAgo * 86400000);
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

test("technical decisions require enough fresh verified bars", () => {
  assert.equal(technical.assessDataQuality({ dataAvailable: true, enoughDataStatus: "SUFFICIENT", barsUsed: 90, freshness: { ageDays: 1 } }).signalEligible, true);
  assert.equal(technical.assessDataQuality({ dataAvailable: true, enoughDataStatus: "SUFFICIENT", barsUsed: 90, freshness: { ageDays: 12 } }).signalEligible, false);
});

test("short-flow decisions require several recent FINRA sessions", () => {
  const freshRows = Array.from({ length: 5 }, (_, index) => ({ date: finraDate(4 - index) }));
  assert.equal(shortInterest.assessDataQuality({ dataAvailable: true, dailyShortVolume: freshRows }, 5).signalEligible, true);
  assert.equal(shortInterest.assessDataQuality({ dailyShortVolume: [{ date: finraDate(0) }] }, 5).signalEligible, false);
});

test("OCC end-of-day data is never labelled unusual real-time flow", () => {
  const quality = options.assessDataQuality({
    dataAvailable: true,
    sourceProvider: "OCC Volume Query",
    sourceUrl: "https://www.theocc.com/market-data/market-data-reports/volume-and-open-interest/volume-query",
    dataFreshness: "end-of-day",
    optionVolume: { total: 1000 },
    unusualContracts: [{ optionType: "CALL" }],
  });
  // An ordinary OCC end-of-day total is useful context, but it is not a
  // verified anomaly and has no directional confidence. It must not vote in
  // the committee until the historical anomaly and confidence gates pass.
  assert.equal(quality.signalEligible, false);
  assert.equal(quality.unusualFlowEligible, false);
  assert.equal(quality.eodAnomalyEligible, false);
});

test("analyst consensus requires breadth, history and confidence", () => {
  const periods = [{ period: "2026-08" }, { period: "2026-07" }];
  assert.equal(analyst.assessDataQuality({ dataAvailable: true, periods }, { totalAnalysts: 8, confidence: 60 }).signalEligible, true);
  assert.equal(analyst.assessDataQuality({ periods }, { totalAnalysts: 2, confidence: 60 }).signalEligible, false);
});

test("ETF flow stays a disclosed price-volume proxy and needs adequate history", () => {
  const metrics = { dataAvailable: true, targetEtf: "XLK", sector: "Technology", etfBars: Array.from({ length: 50 }, () => ({})) };
  const quality = etf.assessDataQuality(metrics, 60);
  assert.equal(quality.signalEligible, true);
  assert.match(quality.limitation, /not fund creation\/redemption/i);
  assert.equal(etf.assessDataQuality({ ...metrics, etfBars: [{}] }, 60).signalEligible, false);
});

test("symbol sentiment requires multiple articles and independent sources", () => {
  const metrics = { dataAvailable: true, articles: [{}, {}, {}], sourceProvider: "verified news", priceBars: [{}] };
  assert.equal(sentiment.assessDataQuality(metrics, { distinctSourceCount: 2, tier1ArticleCount: 1 }, 60).signalEligible, true);
  assert.equal(sentiment.assessDataQuality(metrics, { distinctSourceCount: 1, tier1ArticleCount: 1 }, 60).signalEligible, false);
});
