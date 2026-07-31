// Phase REDIS-CACHE-001 — "TTL per provider." A disclosed, hand-set map
// of cache-namespace → TTL, same `envNumber`-driven, disclosed-constant
// convention `agentScheduler/schedulerConfig.js` already established.
// Every TTL here reflects that namespace's own real, deterministic
// data-refresh cadence — never a single one-size-fits-all number.
const env = require("../../config/env");

function envNumber(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const TTL_MS_BY_NAMESPACE = {
  // Real daily OHLC bars (priceHistoryProvider.getDailyBars) — a real
  // trading day's bars don't change once the market session settles;
  // 15 minutes balances real intraday staleness against still avoiding
  // hammering Yahoo Finance on every single agent call within a run.
  priceHistory: envNumber("REDIS_CACHE_PRICE_HISTORY_TTL_MS", 15 * 60 * 1000),
};

/**
 * @param {string} namespace
 * @returns {number} that namespace's own real, disclosed TTL, or the global default when not named above
 */
function getTtlMsForNamespace(namespace) {
  return TTL_MS_BY_NAMESPACE[namespace] ?? env.REDIS_CACHE_DEFAULT_TTL_MS;
}

module.exports = { TTL_MS_BY_NAMESPACE, getTtlMsForNamespace };
