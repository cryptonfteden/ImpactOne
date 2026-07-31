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

// Phase PROVIDER-ABSTRACTION-002 — per-provider (registry `providerId`)
// TTL overrides for `createUnifiedProvider()`. Deliberately empty by
// default: caching is opt-in per provider (0 = disabled, the exact
// pre-existing, uncached behavior), never a silent default applied to
// every provider — a live news/COT feed is not the same kind of
// "deterministic, read-only response" a daily price bar is, and
// caching one without deliberately choosing to would risk delaying
// real event ingestion, a genuine (if subtle) change in behavior. Add
// a real entry here only when a specific provider's own real data has
// a genuinely disclosed, understood refresh cadence.
const PROVIDER_TTL_MS_BY_ID = {};

/**
 * @param {string} providerId
 * @returns {number} that provider's own disclosed TTL override, or 0 (caching disabled) when not named above
 */
function getTtlMsForProvider(providerId) {
  return PROVIDER_TTL_MS_BY_ID[providerId] ?? 0;
}

module.exports = { TTL_MS_BY_NAMESPACE, getTtlMsForNamespace, PROVIDER_TTL_MS_BY_ID, getTtlMsForProvider };
