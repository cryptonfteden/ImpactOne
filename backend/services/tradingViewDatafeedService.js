const priceHistoryProvider = require("./intelligence/priceHistoryProvider");
const { getUsEquityUniverse } = require("./usEquityUniverseService");

const RESOLUTION_TO_RANGE = Object.freeze({
  "1": "15m",
  "5": "4h",
  "30": "1w",
  "1D": "3mo",
  D: "3mo",
  "1W": "1y",
  W: "1y",
});

function normalizeSymbol(value) {
  const raw = String(value || "").trim().toUpperCase();
  const symbol = raw.includes(":") ? raw.split(":").at(-1) : raw;
  return /^[A-Z0-9][A-Z0-9.\-]{0,14}$/.test(symbol) ? symbol : null;
}

function normalizeResolution(value) {
  const raw = String(value || "").trim().toUpperCase();
  return RESOLUTION_TO_RANGE[raw] ? raw : null;
}

function config() {
  return {
    supported_resolutions: ["1", "5", "30", "1D", "1W"],
    supports_group_request: false,
    supports_marks: false,
    supports_search: true,
    supports_timescale_marks: false,
  };
}

async function search(query, limit = 30) {
  const needle = String(query || "").trim().toUpperCase();
  if (!needle) return [];
  const universe = await getUsEquityUniverse();
  return universe.securities
    .filter((item) => item.symbol.includes(needle) || String(item.name || "").toUpperCase().includes(needle))
    .slice(0, Math.min(Math.max(Number(limit) || 30, 1), 100))
    .map((item) => ({ symbol: item.symbol, full_name: `${item.exchange}:${item.symbol}`, description: item.name, exchange: item.exchange, ticker: item.symbol, type: "stock" }));
}

async function resolve(symbolInput) {
  const symbol = normalizeSymbol(symbolInput);
  if (!symbol) return null;
  const universe = await getUsEquityUniverse();
  const security = universe.securities.find((item) => item.symbol === symbol);
  return {
    name: symbol,
    ticker: symbol,
    description: security?.name || symbol,
    type: "stock",
    session: "0930-1600",
    timezone: "America/New_York",
    exchange: security?.exchange || "US",
    minmov: 1,
    pricescale: 100,
    has_intraday: true,
    has_daily: true,
    has_weekly_and_monthly: true,
    supported_resolutions: config().supported_resolutions,
    volume_precision: 0,
    data_status: "streaming",
  };
}

async function history({ symbol: symbolInput, resolution: resolutionInput, from, to }) {
  const symbol = normalizeSymbol(symbolInput);
  const resolution = normalizeResolution(resolutionInput);
  if (!symbol) return { s: "error", errmsg: "Invalid symbol." };
  if (!resolution) return { s: "error", errmsg: "Unsupported resolution. ImpactOne will not synthesize missing candle intervals." };
  const range = RESOLUTION_TO_RANGE[resolution];
  const bars = await priceHistoryProvider.getChartBars(symbol, { range });
  const lower = Number(from) || 0;
  const upper = Number(to) || Number.MAX_SAFE_INTEGER;
  const selected = bars.map((bar) => ({ ...bar, epoch: Math.floor(new Date(bar.date).getTime() / 1000) }))
    .filter((bar) => Number.isFinite(bar.epoch) && bar.epoch >= lower && bar.epoch <= upper);
  const source = priceHistoryProvider.getChartSource(symbol, range);
  if (!selected.length) return { s: "no_data", source: source.source, sourceRole: source.sourceRole, range };
  return {
    s: "ok",
    t: selected.map((bar) => bar.epoch),
    o: selected.map((bar) => bar.open),
    h: selected.map((bar) => bar.high),
    l: selected.map((bar) => bar.low),
    c: selected.map((bar) => bar.close),
    v: selected.map((bar) => Number(bar.volume) || 0),
    source: source.source,
    sourceRole: source.sourceRole,
    range,
    retrievedAt: new Date().toISOString(),
  };
}

module.exports = { RESOLUTION_TO_RANGE, normalizeSymbol, normalizeResolution, config, search, resolve, history };
