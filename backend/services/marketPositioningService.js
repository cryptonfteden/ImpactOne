// Phase X2 — Market Positioning. Ranks a symbol universe into LONG
// PRESSURE / SHORT PRESSURE using only real, already-available data
// (finnhubService quotes, priceHistoryProvider daily bars). Short
// interest, long interest, and float are genuinely unavailable anywhere
// in this codebase's provider set (confirmed by direct research before
// writing this file) — they are represented as explicit `unavailable`
// entries in every response, never fabricated, never silently zeroed.
const finnhubService = require("./finnhubService");
const priceHistoryProvider = require("./intelligence/priceHistoryProvider");

// Phase X2 — exposed configuration constants (mission's explicit
// requirement). Change these to retune the ranking without touching the
// scoring logic itself.
const CONFIG = {
  // Very small companies filtered out entirely, per mission requirement.
  MIN_MARKET_CAP_USD: 2_000_000_000, // $2B — excludes micro/small caps
  MIN_AVG_DAILY_DOLLAR_VOLUME: 5_000_000, // $5M/day — excludes illiquid names
  AVG_VOLUME_LOOKBACK_DAYS: 20,
  RELATIVE_VOLUME_HIGH_THRESHOLD: 1.5, // today's volume >= 1.5x the 20-day average counts as "elevated"
  MOMENTUM_LOOKBACK_DAYS: 10,
  // Ranking weights — real, available signals only (see UNAVAILABLE_FACTORS
  // below for what's deliberately excluded and why).
  WEIGHTS: {
    momentum: 0.45,
    relativeVolume: 0.35,
    liquidity: 0.2,
  },
};

// Phase X2 — factors the mission names that have no real data source in
// this codebase today. Never fabricated; always surfaced honestly.
const UNAVAILABLE_FACTORS = [
  { factor: "shortInterest", reason: "No provider in this codebase publishes short interest (a FINRA/exchange biweekly figure typically sourced from a specialized vendor — none is configured)." },
  { factor: "longInterest", reason: "Not a standard published metric and no raw input exists to derive it." },
  { factor: "float", reason: "Only total shares outstanding exists (buried, unexposed, in the Finnhub profile payload) — float-adjusted share count is never fetched." },
];

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

async function computeSymbolMetrics(symbol) {
  const [quotePayload, bars] = await Promise.all([
    finnhubService.getQuote(symbol).catch(() => null),
    priceHistoryProvider.getDailyBars(symbol, { range: "3mo" }).catch(() => []),
  ]);

  const marketCap = Number(quotePayload?.quote?.marketCap);
  const price = Number(quotePayload?.quote?.price);
  const todayVolume = Number(quotePayload?.quote?.volume);

  const recentBars = bars.slice(-CONFIG.AVG_VOLUME_LOOKBACK_DAYS);
  const volumes = recentBars.map((bar) => Number(bar.volume)).filter((value) => Number.isFinite(value) && value > 0);
  const avgDailyVolume = volumes.length ? volumes.reduce((sum, value) => sum + value, 0) / volumes.length : null;

  const relativeVolume = Number.isFinite(todayVolume) && avgDailyVolume ? todayVolume / avgDailyVolume : null;

  // Liquidity proxy — real, computed, average dollar volume. Never a
  // stand-in for true liquidity (bid/ask spread, book depth), which is
  // genuinely unavailable; documented as a proxy, not claimed as the
  // real thing.
  const avgDailyDollarVolume = avgDailyVolume && Number.isFinite(price) ? avgDailyVolume * price : null;

  // Momentum — real % price change over a real historical window.
  const momentumBars = bars.slice(-CONFIG.MOMENTUM_LOOKBACK_DAYS);
  let momentumPct = null;
  if (momentumBars.length >= 2) {
    const first = Number(momentumBars[0].close);
    const last = Number(momentumBars[momentumBars.length - 1].close);
    if (Number.isFinite(first) && first > 0 && Number.isFinite(last)) {
      momentumPct = ((last - first) / first) * 100;
    }
  }

  return {
    symbol,
    marketCap: Number.isFinite(marketCap) ? marketCap : null,
    price: Number.isFinite(price) ? price : null,
    avgDailyVolume,
    todayVolume: Number.isFinite(todayVolume) ? todayVolume : null,
    relativeVolume,
    avgDailyDollarVolume,
    momentumPct,
  };
}

// Passes only when the mission's "filter out very small companies" and
// "availability of real market data" requirements are both genuinely
// met — a symbol failing this is excluded from ranking, not scored zero.
function passesUniverseFilter(metrics) {
  if (!Number.isFinite(metrics.marketCap) || metrics.marketCap < CONFIG.MIN_MARKET_CAP_USD) return false;
  if (!Number.isFinite(metrics.avgDailyDollarVolume) || metrics.avgDailyDollarVolume < CONFIG.MIN_AVG_DAILY_DOLLAR_VOLUME) return false;
  return true;
}

// 0-1 normalization for a directional score component. Missing inputs
// return null (excluded from the weighted sum, weights renormalized
// across whatever real signals are actually present) — never a
// fabricated neutral 0.5.
function normalizeMomentum(momentumPct) {
  if (!Number.isFinite(momentumPct)) return null;
  return Math.max(-1, Math.min(1, momentumPct / 15)); // +/-15% treated as a strong move
}

function normalizeRelativeVolume(relativeVolume) {
  if (!Number.isFinite(relativeVolume)) return null;
  return Math.max(0, Math.min(1, (relativeVolume - 1) / 2)); // 1x = 0, 3x = 1
}

function normalizeLiquidity(avgDailyDollarVolume) {
  if (!Number.isFinite(avgDailyDollarVolume)) return null;
  return Math.max(0, Math.min(1, Math.log10(avgDailyDollarVolume / CONFIG.MIN_AVG_DAILY_DOLLAR_VOLUME) / 2));
}

// Direction can only ever come from a real, signed price-momentum signal
// — relative volume and liquidity are inherently non-directional (high
// volume or high liquidity says nothing about *which way* pressure runs
// on their own), so they only ever scale the *magnitude/confidence* of
// whatever direction momentum already established. Treating them as
// directional inputs was an earlier design bug: a highly liquid stock
// with strong elevated volume could outweigh genuine negative momentum
// and get mis-ranked LONG_PRESSURE — caught by this file's own test
// suite before shipping.
function computePressureScore(metrics) {
  const momentumNorm = normalizeMomentum(metrics.momentumPct);
  if (momentumNorm === null || momentumNorm === 0) {
    return { pressureScore: null, direction: null, componentsUsed: [] };
  }

  const magnitudeComponents = {
    momentum: Math.abs(momentumNorm),
    relativeVolume: normalizeRelativeVolume(metrics.relativeVolume),
    liquidity: normalizeLiquidity(metrics.avgDailyDollarVolume),
  };

  const usedFactors = Object.entries(magnitudeComponents).filter(([, value]) => value !== null);
  const totalWeight = usedFactors.reduce((sum, [key]) => sum + CONFIG.WEIGHTS[key], 0);
  const weightedMagnitude = usedFactors.reduce((sum, [key, value]) => sum + value * CONFIG.WEIGHTS[key], 0) / totalWeight;
  // Renormalized honestly across only the factors actually available —
  // documented explicitly, never silently treating a missing factor as 0.
  const pressureScore = weightedMagnitude * Math.sign(momentumNorm);

  return {
    pressureScore,
    direction: pressureScore >= 0 ? "LONG_PRESSURE" : "SHORT_PRESSURE",
    componentsUsed: usedFactors.map(([key]) => key),
  };
}

async function getMarketPositioning({ symbols } = {}) {
  const universe = Array.isArray(symbols) && symbols.length ? symbols : [];
  if (!universe.length) {
    throw badRequest("A symbol universe is required (symbols[]).");
  }

  const normalizedUniverse = Array.from(new Set(universe.map((symbol) => String(symbol).trim().toUpperCase()).filter(Boolean)));

  const metricsResults = await Promise.all(
    normalizedUniverse.map(async (symbol) => {
      try {
        return await computeSymbolMetrics(symbol);
      } catch {
        return { symbol, marketCap: null, price: null, avgDailyVolume: null, todayVolume: null, relativeVolume: null, avgDailyDollarVolume: null, momentumPct: null };
      }
    })
  );

  const excluded = [];
  const eligible = [];

  for (const metrics of metricsResults) {
    if (!passesUniverseFilter(metrics)) {
      excluded.push({
        symbol: metrics.symbol,
        reason: !Number.isFinite(metrics.marketCap)
          ? "Market cap unavailable — real quote data could not be retrieved."
          : metrics.marketCap < CONFIG.MIN_MARKET_CAP_USD
            ? `Market cap below the configured floor ($${(CONFIG.MIN_MARKET_CAP_USD / 1e9).toFixed(1)}B).`
            : "Average daily dollar volume unavailable or below the configured liquidity floor.",
      });
      continue;
    }
    const scoreResult = computePressureScore(metrics);
    eligible.push({ ...metrics, ...scoreResult });
  }

  const scored = eligible.filter((entry) => entry.pressureScore !== null);
  const unscored = eligible.filter((entry) => entry.pressureScore === null);

  const longPressure = scored
    .filter((entry) => entry.direction === "LONG_PRESSURE")
    .sort((a, b) => b.pressureScore - a.pressureScore);
  const shortPressure = scored
    .filter((entry) => entry.direction === "SHORT_PRESSURE")
    .sort((a, b) => a.pressureScore - b.pressureScore);

  return {
    generatedAt: new Date().toISOString(),
    config: CONFIG,
    unavailableFactors: UNAVAILABLE_FACTORS,
    longPressure,
    shortPressure,
    // Real data-availability failures, named per symbol — never silently
    // dropped from the response.
    excludedFromUniverse: excluded,
    scoredButUndirected: unscored, // eligible on liquidity/market-cap but no directional signal could be computed
  };
}

module.exports = { getMarketPositioning, computeSymbolMetrics, computePressureScore, CONFIG, UNAVAILABLE_FACTORS };
