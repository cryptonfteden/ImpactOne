// Phase AI-ENGINE-002.1 — Market Sentiment Engine foundation. The
// canonical, platform-level sentiment service (mission §1) — every
// current and future screen/engine that needs "what does the market
// feel like right now" should call this, never recompute its own
// per-screen sentiment. Handles all real I/O (each source independently
// try/caught — one provider failing never blocks the others, mission
// §8's "provider failure" requirement) and composes the final output
// exactly per mission §1's required shape:
//   market, score, trend, confidence, contributors, missingInputs,
//   lastUpdated, dataFreshness, provenance
const autonomousMarketService = require("./../autonomousMarketService");
const autonomousRecommendationRepository = require("./../autonomousRecommendationRepository");
const altDataService = require("./../altDataService");
const cotIntelligenceService = require("./../intelligence/cotIntelligenceService");
const technicalIntelligenceService = require("./../intelligence/technicalIntelligenceService");

const { MARKET_REGISTRY, METHODOLOGY_VERSION, isValidMarket } = require("./marketSentimentDimensions");
const { computeMarketSentiment } = require("./marketSentimentEngine");
const { computeTrend } = require("./marketSentimentRollup");
const { sanitizeSentimentReading } = require("./marketSentimentGovernance");
const repository = require("./marketSentimentRepository");

// Same discipline as altDataService.js's own provider calls: a failed
// fetch degrades honestly to a fallback value (which the scorers then
// correctly report as unavailable/lower-confidence) rather than
// crashing the whole reading — mission §8's "provider failure" case.
async function safeFetch(_label, fetcher, fallbackValue) {
  try {
    return await fetcher();
  } catch {
    return fallbackValue;
  }
}

/**
 * Fetches every real data source this market's registered dimensions
 * might need. Each fetch is independently guarded — a single provider
 * failure degrades only the dimension(s) that depended on it (handled
 * honestly downstream by the scorers reporting `unavailable`), never the
 * whole reading.
 */
async function fetchDimensionInputs(market) {
  const marketDef = MARKET_REGISTRY[market];

  const [feedOverview, recommendations, macroData, polymarketData, cotResult, analyses] = await Promise.all([
    safeFetch("autonomousMarketService.getAutonomousOverview", () => autonomousMarketService.getAutonomousOverview({}), null),
    marketDef.recommendationEligible ? safeFetch("autonomousRecommendationRepository.listActive", () => autonomousRecommendationRepository.listActive({ limit: 200 }), []) : Promise.resolve([]),
    marketDef.macroRelevant ? safeFetch("altDataService.getMacroData", () => altDataService.getMacroData(), null) : Promise.resolve(null),
    marketDef.macroRelevant ? safeFetch("altDataService.getPolymarketData", () => altDataService.getPolymarketData({}), []) : Promise.resolve([]),
    marketDef.macroRelevant && marketDef.cotMarketQuery ? safeFetch("cotIntelligenceService.getCotIntelligence", () => cotIntelligenceService.getCotIntelligence(marketDef.cotMarketQuery), null) : Promise.resolve(null),
    Promise.all(
      marketDef.proxySymbols.map((symbol) => safeFetch(`technicalIntelligenceService.analyzeSymbol(${symbol})`, () => technicalIntelligenceService.analyzeSymbol(symbol), { symbol, enoughDataStatus: "INSUFFICIENT", signals: {} }))
    ),
  ]);

  return {
    feed: feedOverview?.feed || [],
    recommendations,
    macroData,
    polymarketData,
    cotResult,
    analyses,
  };
}

function buildDataFreshness(dimensionReadings, now) {
  const freshnessEntries = dimensionReadings
    .flatMap((reading) => reading.contributors || [])
    .map((contributor) => ({ source: contributor.source, ...(contributor.freshness || {}) }));
  const ages = freshnessEntries.map((entry) => entry.ageMs).filter((ageMs) => Number.isFinite(ageMs));

  if (!ages.length) {
    return { oldestInputAgeMs: null, newestInputAgeMs: null, isStale: true, reason: "No timestamped real inputs were available to evaluate freshness against." };
  }

  const oldestInputAgeMs = Math.max(...ages);
  const newestInputAgeMs = Math.min(...ages);
  const staleSources = freshnessEntries.filter((entry) => entry.isStale === true).map((entry) => entry.source);
  return {
    oldestInputAgeMs,
    newestInputAgeMs,
    isStale: staleSources.length > 0,
    staleSources,
    reason: staleSources.length ? `${staleSources.length} source(s) exceeded their disclosed update cadence.` : null,
    asOfNow: now.toISOString(),
  };
}

function buildProvenance(dimensionReadings) {
  const sources = new Set();
  for (const reading of dimensionReadings) {
    for (const contributor of reading.contributors || []) {
      sources.add(contributor.source);
    }
  }
  return { sources: [...sources].sort(), methodologyVersion: METHODOLOGY_VERSION };
}

function todayDateString(now) {
  return now.toISOString().slice(0, 10);
}

/**
 * The canonical read — mission §1's required output shape, always.
 */
async function getMarketSentiment(market, { now = new Date() } = {}) {
  if (!isValidMarket(market)) {
    const error = new Error(`Unknown market: ${market}`);
    error.statusCode = 400;
    throw error;
  }

  const dimensionInputs = await fetchDimensionInputs(market);
  const computed = computeMarketSentiment({ market, dimensionInputs, now });

  const overallHistory = await repository.listSnapshotHistory({ market, dimension: "OVERALL", limit: 10 });
  const trend = computeTrend(computed.score, overallHistory);

  const reading = sanitizeSentimentReading({
    market,
    score: computed.score,
    trend,
    confidence: computed.confidence,
    contributors: computed.contributors,
    missingInputs: computed.missingInputs,
    lastUpdated: now.toISOString(),
    dataFreshness: buildDataFreshness(computed.dimensionReadings, now),
    provenance: buildProvenance(computed.dimensionReadings),
    methodologyVersion: METHODOLOGY_VERSION,
  });

  return { ...reading, _dimensionReadings: computed.dimensionReadings.map((dimensionReading) => sanitizeSentimentReading(dimensionReading)) };
}

/**
 * Captures today's snapshot for one market: the OVERALL row plus one row
 * per dimension (including the 3 permanently-unavailable ones, so a
 * day's full picture — including what was missing — is always in the
 * historical record). Append-only: calling this twice for the same
 * market+day will fail on the real @@unique constraint, by design.
 */
async function captureSnapshot(market, { now = new Date() } = {}) {
  const reading = await getMarketSentiment(market, { now });
  const snapshotDate = todayDateString(now);

  const overallRow = await repository.createSnapshot({
    market,
    dimension: "OVERALL",
    snapshotDate,
    score: reading.score,
    confidence: reading.confidence,
    contributors: reading.contributors,
    missingInputs: reading.missingInputs,
    methodologyVersion: METHODOLOGY_VERSION,
  });

  const dimensionRows = [];
  for (const dimensionReading of reading._dimensionReadings) {
    // eslint-disable-next-line no-await-in-loop
    const row = await repository.createSnapshot({
      market,
      dimension: dimensionReading.dimension,
      snapshotDate,
      score: dimensionReading.score,
      confidence: dimensionReading.confidence,
      contributors: dimensionReading.contributors,
      missingInputs: dimensionReading.missingInputs,
      methodologyVersion: METHODOLOGY_VERSION,
    });
    dimensionRows.push(row);
  }

  return { overall: overallRow, dimensions: dimensionRows };
}

module.exports = {
  getMarketSentiment,
  captureSnapshot,
  fetchDimensionInputs,
};
