// Phase X2 — Opportunity Score. An internal MARKET POSITIONING score, not
// an AI recommendation (distinct from autonomousRecommendationEngine.js
// by design — this file never generates a BUY/REDUCE/EXIT action and is
// never consulted by that engine). 0-100, fully explainable: every
// contributing factor is returned with its own real value and
// contribution, and any factor with no real data source is explicitly
// marked unavailable and excluded from the weighted total — never
// fabricated, never zero-filled.
const marketPositioningService = require("./marketPositioningService");
const autonomousRecommendationRepository = require("./autonomousRecommendationRepository");

// Phase X2 — exposed configuration constants.
const CONFIG = {
  WEIGHTS: {
    momentum: 20,
    relativeVolume: 20,
    liquidity: 15,
    marketCap: 10,
    recentNews: 15,
    aiConfidence: 20,
  },
};

const UNAVAILABLE_INPUTS = [
  { factor: "shortInterest", reason: "No real data source exists in this codebase (see MARKET_POSITIONING_SPEC.md)." },
  { factor: "longInterest", reason: "Not a standard published metric; no raw input exists to derive it." },
];

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

// Each factor function returns { value: 0-1 or null, real } — real is the
// actual underlying number shown to the user for transparency (e.g. the
// real momentum %, not just its normalized score).
function scoreMomentum(momentumPct) {
  if (!Number.isFinite(momentumPct)) return { value: null, real: null };
  // Momentum can be positive or negative for the *symbol's own move*, but
  // "opportunity" here treats a strong move in either direction as more
  // noteworthy than no move — magnitude-based, not directional.
  return { value: clamp01(Math.abs(momentumPct) / 15), real: momentumPct };
}

function scoreRelativeVolume(relativeVolume) {
  if (!Number.isFinite(relativeVolume)) return { value: null, real: null };
  return { value: clamp01((relativeVolume - 0.5) / 2.5), real: relativeVolume };
}

function scoreLiquidity(avgDailyDollarVolume) {
  if (!Number.isFinite(avgDailyDollarVolume) || avgDailyDollarVolume <= 0) return { value: null, real: avgDailyDollarVolume ?? null };
  return { value: clamp01(Math.log10(avgDailyDollarVolume / 1_000_000) / 3), real: avgDailyDollarVolume };
}

function scoreMarketCap(marketCap) {
  if (!Number.isFinite(marketCap) || marketCap <= 0) return { value: null, real: null };
  // Larger, more established companies score modestly higher on this
  // single factor (a stability signal, not a growth signal) — capped so
  // mega-caps don't dominate the composite.
  return { value: clamp01(Math.log10(marketCap / 1_000_000_000) / 4), real: marketCap };
}

function scoreRecentNews(newsCount) {
  if (!Number.isFinite(newsCount)) return { value: null, real: null };
  return { value: clamp01(newsCount / 5), real: newsCount };
}

function scoreAiConfidence(qualityScore) {
  if (!Number.isFinite(qualityScore)) return { value: null, real: null };
  return { value: clamp01(qualityScore / 100), real: qualityScore };
}

/**
 * Computes the real, explainable 0-100 Opportunity Score for one symbol.
 * `newsCount` is passed in by the caller (already-fetched quote payload)
 * rather than re-fetched here, so this function stays a pure scorer over
 * real inputs — no hidden network call.
 */
function computeOpportunityScore({ symbol, momentumPct, relativeVolume, avgDailyDollarVolume, marketCap, newsCount, aiQualityScore }) {
  const factors = {
    momentum: scoreMomentum(momentumPct),
    relativeVolume: scoreRelativeVolume(relativeVolume),
    liquidity: scoreLiquidity(avgDailyDollarVolume),
    marketCap: scoreMarketCap(marketCap),
    recentNews: scoreRecentNews(newsCount),
    aiConfidence: scoreAiConfidence(aiQualityScore),
  };

  const usedEntries = Object.entries(factors).filter(([, result]) => result.value !== null);
  const totalWeight = usedEntries.reduce((sum, [key]) => sum + CONFIG.WEIGHTS[key], 0);

  const score = totalWeight > 0
    ? Math.round((usedEntries.reduce((sum, [key, result]) => sum + result.value * CONFIG.WEIGHTS[key], 0) / totalWeight) * 100)
    : null;

  const explanation = Object.entries(factors).map(([factor, result]) => ({
    factor,
    weight: CONFIG.WEIGHTS[factor],
    available: result.value !== null,
    realValue: result.real,
    normalizedContribution: result.value === null ? null : Math.round(result.value * 100),
  }));

  return {
    symbol,
    score, // null when no real factor was available at all — never a fabricated default
    explanation,
    unavailableInputs: UNAVAILABLE_INPUTS,
    generatedAt: new Date().toISOString(),
  };
}

async function getOpportunityScore(symbol) {
  const normalized = String(symbol || "").trim().toUpperCase();
  if (!normalized) {
    const error = new Error("A symbol is required.");
    error.statusCode = 400;
    throw error;
  }

  const [metrics, activeRecommendation] = await Promise.all([
    marketPositioningService.computeSymbolMetrics(normalized),
    autonomousRecommendationRepository.getActiveForSymbol(normalized).catch(() => null),
  ]);

  const finnhubService = require("./finnhubService");
  const quotePayload = await finnhubService.getQuote(normalized).catch(() => null);
  const newsCount = Array.isArray(quotePayload?.news) ? quotePayload.news.length : null;

  return computeOpportunityScore({
    symbol: normalized,
    momentumPct: metrics.momentumPct,
    relativeVolume: metrics.relativeVolume,
    avgDailyDollarVolume: metrics.avgDailyDollarVolume,
    marketCap: metrics.marketCap,
    newsCount,
    aiQualityScore: activeRecommendation ? Number(activeRecommendation.qualityScore) : null,
  });
}

module.exports = { getOpportunityScore, computeOpportunityScore, CONFIG, UNAVAILABLE_INPUTS };
