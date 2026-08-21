const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { buildTimeframeFibonacci } = require("./fibonacciStrategy");
const { assessTimeframeCoverage } = require("./timeframeCoverage");
const { auditChartBars } = require("./chartDataIntegrity");

const app = express();
const port = Number(process.env.MISSION_CONTROL_PORT || 5175);
const backendUrl = process.env.IMPACTONE_API_URL || "http://127.0.0.1:5000";
const tradingViewLibraryPath = String(process.env.TRADINGVIEW_CHART_LIBRARY_PATH || "").trim();
const markets = [
  { label: "Dollar Index", symbol: "DXY", providerSymbol: "DX-Y.NYB", displayUnit: "points" },
  { label: "Bitcoin", symbol: "BTC", providerSymbol: "BTC-USD", displayUnit: "usd" },
  { label: "USDT Dominance", symbol: "USDT.D", providerSymbol: null, kind: "usdt-dominance" },
  { label: "Gold Futures", symbol: "GOLD", providerSymbol: "GC=F", displayUnit: "usd" },
  { label: "Nasdaq Futures", symbol: "NQ", providerSymbol: "NQ=F", displayUnit: "points" },
  { label: "S&P Futures", symbol: "ES", providerSymbol: "ES=F", displayUnit: "points" },
  { label: "US 10Y Yield", symbol: "US10Y", providerSymbol: "^TNX", displayUnit: "percent" },
  { label: "Volatility", symbol: "VIX", providerSymbol: "^VIX", displayUnit: "points" },
];
const strategyWatchlistPath = path.resolve(__dirname, "..", ".cache", "mission-strategy-watchlist.json");
const DASHBOARD_CACHE_TTL_MS = 30 * 1000;
let dashboardCache = null;
let dashboardRefreshPromise = null;

function readStrategyWatchlist() {
  try {
    const value = JSON.parse(fs.readFileSync(strategyWatchlistPath, "utf8"));
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function writeStrategyWatchlist(items) {
  fs.mkdirSync(path.dirname(strategyWatchlistPath), { recursive: true });
  fs.writeFileSync(strategyWatchlistPath, JSON.stringify(items, null, 2));
}

app.use(express.json({ limit: "256kb" }));

app.get("/api/company-logo/:symbol", async (req, res) => {
  const symbol = String(req.params.symbol || "").trim().toUpperCase();
  if (!/^[A-Z0-9.\-]{1,15}$/.test(symbol)) return res.status(400).end();
  try {
    const payload = await readApi("/api/quote", { params: { symbol }, timeout: 12000 });
    const logoUrl = String(payload?.quote?.companyLogo || "").trim();
    res.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    return res.redirect(302, /^https:\/\//i.test(logoUrl) ? logoUrl : `https://images.financialmodelingprep.com/symbol/${encodeURIComponent(symbol)}.png`);
  } catch {
    res.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    return res.redirect(302, `https://images.financialmodelingprep.com/symbol/${encodeURIComponent(symbol)}.png`);
  }
});

app.get("/api/tradingview/status", async (_req, res) => {
  const status = await readApi("/api/v2/integrations/tradingview/status");
  if (!status) return res.status(503).json({ error: "TradingView integration status is unavailable." });
  return res.json(status);
});

app.get("/api/source-status", async (_req, res) => {
  const payload = await readApi("/api/v2/system-health", { timeout: 20000 });
  if (!payload) return res.status(503).json({ error: "Live source status is unavailable." });
  return res.json(payload);
});

app.get("/api/tradingview/signals", async (req, res) => {
  const payload = await readApi("/api/v2/integrations/tradingview/signals", { params: { limit: req.query.limit || 6 }, timeout: 12000 });
  if (!payload) return res.status(503).json({ error: "TradingView signals are unavailable." });
  return res.json(payload);
});

app.get("/api/v2/integrations/tradingview/datafeed/:endpoint", async (req, res) => {
  const allowed = new Set(["config", "time", "search", "symbols", "history"]);
  if (!allowed.has(req.params.endpoint)) return res.status(404).json({ error: "Unknown TradingView datafeed endpoint." });
  const payload = await readApi(`/api/v2/integrations/tradingview/datafeed/${req.params.endpoint}`, { params: req.query, timeout: 20000 });
  if (payload == null) return res.status(503).json({ error: "TradingView datafeed is unavailable." });
  if (req.params.endpoint === "time") return res.type("text/plain").send(String(payload));
  return res.json(payload);
});

function pickQuote(payload) {
  const source = payload?.quote || payload?.data?.quote || payload;
  const price = source?.price ?? source?.current ?? source?.c;
  const change = source?.changePercent ?? source?.percentChange ?? source?.dp ?? source?.change;
  return Number.isFinite(Number(price)) ? { price: Number(price), change: Number(change), volume: source?.volume || null } : null;
}

async function readApi(pathname, options = {}) {
  return axios.get(`${backendUrl}${pathname}`, { timeout: options.timeout || 9000, params: options.params }).then((result) => result.data).catch(() => null);
}

async function buildWeeklyWatch(symbol, previous = {}) {
  const normalized = String(symbol || "").trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, "").slice(0, 12);
  if (!normalized) throw Object.assign(new Error("Enter a valid US-listed symbol."), { statusCode: 400 });
  const [quotePayload, chart] = await Promise.all([
    readApi("/api/quote", { params: { symbol: normalized }, timeout: 15000 }),
    readVerifiedTimeframe(normalized, "1w"),
  ]);
  const bars = auditChartBars(chart?.bars || [], "1w", { regularUsSession: isRegularUsEquity(normalized) });
  const quotePrice = Number(quotePayload?.quote?.price);
  const currentPrice = Number.isFinite(quotePrice) && quotePrice > 0 ? quotePrice : Number(bars.bars?.at(-1)?.close);
  if (!quotePayload?.quote && !bars.bars?.length) throw Object.assign(new Error(`No verified market data is available for ${normalized}.`), { statusCode: 404 });
  const fibonacci = bars.valid ? buildTimeframeFibonacci(bars.bars, { range: "1w", candleTimeframe: "weekly candles", source: chart?.source || null, lookbackBars: 52 }) : null;
  const target = Number(fibonacci?.levels?.find((level) => Number(level.ratio) === 0.886)?.price);
  if (!(target > 0) || !(currentPrice > 0)) {
    return { symbol: normalized, company: quotePayload?.company?.name || normalized, logo: quotePayload?.quote?.companyLogo || null, currentPrice: Number.isFinite(currentPrice) ? currentPrice : null, dataAvailable: false, status: "NOT ENOUGH WEEKLY DATA", reason: bars.reason || "A chronological weekly low-to-later-high swing is not available.", source: chart?.source || null, updatedAt: new Date().toISOString(), createdAt: previous.createdAt || new Date().toISOString() };
  }
  const upperPrice = target * 1.05;
  const lowerPrice = target * 0.95;
  const distancePct = (currentPrice - target) / target * 100;
  const inEntryZone = currentPrice >= lowerPrice && currentPrice <= upperPrice;
  const status = inEntryZone ? "ENTRY ZONE" : currentPrice > upperPrice ? "WATCHING ABOVE 0.886" : "BELOW ENTRY ZONE";
  return {
    symbol: normalized,
    company: quotePayload?.company?.name || normalized,
    logo: quotePayload?.quote?.companyLogo || null,
    currentPrice,
    dataAvailable: true,
    status,
    targetPrice: target,
    upperPrice,
    lowerPrice,
    distancePct,
    weeklyBars: bars.bars.length,
    fibonacci: { swingLow: fibonacci.swingLow, swingHigh: fibonacci.swingHigh, swingLowDate: fibonacci.swingLowDate, swingHighDate: fibonacci.swingHighDate },
    source: chart?.source || null,
    triggeredAt: inEntryZone ? (previous.triggeredAt || new Date().toISOString()) : previous.triggeredAt || null,
    updatedAt: new Date().toISOString(),
    createdAt: previous.createdAt || new Date().toISOString(),
  };
}

async function refreshStrategyWatchlist({ force = false } = {}) {
  const items = readStrategyWatchlist();
  const now = Date.now();
  const refreshed = await Promise.all(items.map(async (item) => {
    const fresh = now - new Date(item.updatedAt || 0).getTime() < 5 * 60 * 1000;
    if (!force && fresh) return item;
    try { return await buildWeeklyWatch(item.symbol, item); }
    catch (error) { return { ...item, status: "DATA CHECK FAILED", reason: error.message, updatedAt: new Date().toISOString() }; }
  }));
  writeStrategyWatchlist(refreshed);
  return refreshed;
}

function nasdaqNumber(value) {
  const number = Number(String(value ?? "").replace(/[$,%x,]/gi, "").trim());
  return Number.isFinite(number) ? number : null;
}

async function readNasdaqResearch(symbol, latestPrice = null) {
  if (!/^[A-Z]{1,6}(?:\.[A-Z])?$/.test(symbol)) return null;
  const headers = { "User-Agent": "Mozilla/5.0 (compatible; ImpactOne/1.0)", Accept: "application/json" };
  try {
    const [summaryResult, infoResult, newsResult] = await Promise.allSettled([
      axios.get("https://api.nasdaq.com/api/quote/" + encodeURIComponent(symbol) + "/summary", { params: { assetclass: "stocks" }, headers, timeout: 15000 }),
      axios.get("https://api.nasdaq.com/api/quote/" + encodeURIComponent(symbol) + "/info", { params: { assetclass: "stocks" }, headers, timeout: 15000 }),
      axios.get("https://api.nasdaq.com/api/news/topic/articlebysymbol", { params: { q: symbol + "|stocks", offset: 0, limit: 12 }, headers, timeout: 15000 }),
    ]);
    const summary = summaryResult.status === "fulfilled" ? summaryResult.value.data?.data?.summaryData || {} : {};
    const info = infoResult.status === "fulfilled" ? infoResult.value.data?.data || {} : {};
    const newsRows = newsResult.status === "fulfilled" ? newsResult.value.data?.data?.rows || [] : [];
    const price = Number(latestPrice) || nasdaqNumber(info?.primaryData?.lastSalePrice) || nasdaqNumber(summary.PreviousClose?.value);
    const targetMean = nasdaqNumber(summary.OneYrTarget?.value), averageVolume = nasdaqNumber(summary.AverageVolume?.value), volume = nasdaqNumber(summary.ShareVolume?.value);
    const companyName = info.companyName || info.symbol || symbol;
    if (!companyName && !newsRows.length) return null;
    return {
      quote: { symbol, price, change: nasdaqNumber(info?.primaryData?.percentageChange), changePercent: nasdaqNumber(info?.primaryData?.percentageChange), marketCap: summary.MarketCap?.value || "—", pe: "—", volume: Number.isFinite(volume) ? volume.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 }) : "—", volumeActivity: Number.isFinite(volume) && Number.isFinite(averageVolume) && averageVolume > 0 ? { available: true, averageVolume, ratio: volume / averageVolume, state: volume / averageVolume >= 1.35 ? "Unusually high" : volume / averageVolume <= .7 ? "Below normal" : "Normal" } : { available: false } },
      company: { name: companyName, exchange: summary.Exchange?.value || "US market", industry: summary.Industry?.value || "Unknown", country: "US", currency: "USD", website: "", marketCap: summary.MarketCap?.value || "—" },
      recommendation: { label: "Monitor", reason: "Analyst consensus is unavailable from the active fallback source.", counts: null },
      fundamentals: { valuation: { peTtm: null, forwardPe: null, priceToSales: null, priceToBook: null, targetMean, targetUpsidePct: price && targetMean ? ((targetMean - price) / price) * 100 : null }, growth: { revenueGrowthYoy: null, epsGrowthYoy: null }, quality: { grossMargin: null, operatingMargin: null, roe: null, currentRatio: null, debtToEquity: null }, market: { beta: null, rsi14: null, averageVolume10d: averageVolume, performanceWeek: null, performanceMonth: null, performanceYtd: null, performanceYear: null }, source: "Nasdaq public company summary · live fallback" },
      snapshotSignals: {},
      news: newsRows.map((item) => ({ headline: item.title, summary: item.description, url: item.url?.startsWith("http") ? item.url : "https://www.nasdaq.com" + (item.url || ""), datetime: Date.parse(item.created || "") / 1000, source: item.publisher || "Nasdaq", category: item.primarytopic || null })).filter((item) => item.headline && item.url),
    };
  } catch { return null; }
}

async function readUsdtDominance() {
  try {
    const payload = await axios.get("https://api.coingecko.com/api/v3/global", { timeout: 12000, headers: { "User-Agent": "ImpactOne/1.0" } }).then((result) => result.data);
    const price = Number(payload?.data?.market_cap_percentage?.usdt);
    return Number.isFinite(price) ? { price, change: null, unit: "%", source: "CoinGecko global market data" } : null;
  } catch { return null; }
}

let weeklyCotCache = null;
async function readDxyCot() {
  if (weeklyCotCache && Date.now() - weeklyCotCache.cachedAt < 7 * 24 * 60 * 60 * 1000) return weeklyCotCache.value;
  try {
    const report = await axios.get("https://www.cftc.gov/dea/futures/deanybtsf.htm", { timeout: 15000, headers: { "User-Agent": "ImpactOne/1.0 (local research dashboard)" } }).then((result) => String(result.data || ""));
    const start = report.indexOf("USD INDEX - ICE FUTURES U.S.");
    if (start < 0) return null;
    const block = report.slice(start, start + 2400);
    const reportDate = block.match(/POSITIONS AS OF\s+(\d{2}\/\d{2}\/\d{2})/i)?.[1] || null;
    const commitments = block.match(/COMMITMENTS\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)/i);
    if (!commitments) return null;
    const nonCommercialLong = Number(commitments[1].replace(/,/g, ""));
    const nonCommercialShort = Number(commitments[2].replace(/,/g, ""));
    if (!(nonCommercialLong > 0) || !(nonCommercialShort > 0)) return null;
    const value = { available: true, kind: "cftc-cot", longVolume: nonCommercialLong, shortVolume: nonCommercialShort, totalVolume: nonCommercialLong + nonCommercialShort, market: "USD INDEX · ICE FUTURES U.S.", reportDate, signal: nonCommercialLong > nonCommercialShort ? "Net long" : "Net short", source: "CFTC Commitments of Traders · Futures Only", refreshCadence: "weekly" };
    weeklyCotCache = { cachedAt: Date.now(), value };
    return value;
  } catch { return weeklyCotCache?.value || null; }
}

function timeframeConfig(timeframe) {
  return {
    "15m": { range: "1mo", interval: "15m", takeLast: 260, label: "15M", candleLabel: "15-minute candles" },
    "4h": { range: "6mo", interval: "1h", aggregate: "4h", takeLast: 260, label: "4H", candleLabel: "4-hour candles" },
    "1d": { range: "5y", interval: "1d", takeLast: 520, label: "1D", candleLabel: "daily candles" },
    "1w": { range: "10y", interval: "1wk", takeLast: 520, fibonacciLookbackBars: 52, label: "1W", candleLabel: "weekly candles" },
    "1mo": { range: "max", interval: "1mo", takeLast: 360, label: "1M", candleLabel: "monthly candles" },
    "3mo": { range: "max", interval: "1mo", aggregate: "3mo", takeLast: 240, label: "3M", candleLabel: "quarterly candles" },
    // Yahoo exposes quarterly history for the full life of the security. We
    // aggregate those verified rows into real calendar-year OHLCV candles.
    "1y": { range: "max", interval: "3mo", aggregate: "1y", takeLast: 120, label: "1Y", candleLabel: "yearly candles" },
  }[timeframe] || { range: "5y", interval: "1d", label: "1D", candleLabel: "daily candles" };
}

function aggregateBars(bars, size) {
  if (size <= 1) return bars;
  const result = [];
  for (let index = 0; index < bars.length; index += size) {
    const group = bars.slice(index, index + size);
    if (!group.length) continue;
    result.push({ date: group[0].date, open: group[0].open, high: Math.max(...group.map((bar) => bar.high)), low: Math.min(...group.map((bar) => bar.low)), close: group.at(-1).close, volume: group.reduce((total, bar) => total + Number(bar.volume || 0), 0) });
  }
  return result;
}

function aggregateTimeframeBars(bars, timeframe) {
  if (!Array.isArray(bars) || !bars.length) return [];
  if (timeframe === "1y") {
    const groups = new Map();
    for (const bar of bars) {
      const year = new Date(bar.date).getUTCFullYear();
      if (!Number.isFinite(year)) continue;
      const group = groups.get(year);
      if (!group) groups.set(year, { ...bar, date: `${year}-01-01T00:00:00.000Z` });
      else { group.high = Math.max(group.high, bar.high); group.low = Math.min(group.low, bar.low); group.close = bar.close; group.volume += Number(bar.volume || 0); }
    }
    return [...groups.values()];
  }
  if (timeframe === "3mo") {
    const groups = new Map();
    for (const bar of bars) {
      const date = new Date(bar.date);
      const year = date.getUTCFullYear(), quarter = Math.floor(date.getUTCMonth() / 3);
      if (!Number.isFinite(year)) continue;
      const key = `${year}-Q${quarter + 1}`;
      const group = groups.get(key);
      if (!group) groups.set(key, { ...bar, date: new Date(Date.UTC(year, quarter * 3, 1)).toISOString() });
      else { group.high = Math.max(group.high, bar.high); group.low = Math.min(group.low, bar.low); group.close = bar.close; group.volume += Number(bar.volume || 0); }
    }
    return [...groups.values()];
  }
  if (timeframe === "4h") {
    const groups = new Map();
    for (const bar of bars) {
      const date = new Date(bar.date);
      const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(date);
      const read = (type) => parts.find((part) => part.type === type)?.value;
      const hour = Number(read("hour"));
      const sessionHour = Math.max(0, hour - 9);
      const bucket = Math.floor(sessionHour / 4);
      const key = `${read("year")}-${read("month")}-${read("day")}-${bucket}`;
      const group = groups.get(key);
      if (!group) groups.set(key, { ...bar });
      else { group.high = Math.max(group.high, bar.high); group.low = Math.min(group.low, bar.low); group.close = bar.close; group.volume += Number(bar.volume || 0); }
    }
    return [...groups.values()];
  }
  return bars;
}

async function readYahooBars(symbol, config) {
  try {
    const payload = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`, { params: { range: config.range, interval: config.interval, events: "history" }, timeout: 15000, headers: { "User-Agent": "Mozilla/5.0 (compatible; ImpactOne/1.0)" } }).then((result) => result.data);
    const source = payload?.chart?.result?.[0], quote = source?.indicators?.quote?.[0] || {};
    const bars = (source?.timestamp || []).flatMap((timestamp, index) => {
      const raw = [quote.open?.[index], quote.high?.[index], quote.low?.[index], quote.close?.[index]];
      if (raw.some((value) => value === null || value === undefined || value === "" || !Number.isFinite(Number(value)))) return [];
      const [open, high, low, close] = raw.map(Number);
      if (open <= 0 || high <= 0 || low <= 0 || close <= 0 || high < low) return [];
      return [{ date: new Date(Number(timestamp) * 1000).toISOString(), open, high, low, close, volume: Number(quote.volume?.[index]) || 0 }];
    });
    return bars;
  } catch { return []; }
}

function isRegularUsEquity(symbol) {
  return /^[A-Z]{1,6}(?:\.[A-Z])?$/.test(symbol);
}

function isRegularMarketBar(bar) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(bar.date));
  const read = (type) => parts.find((part) => part.type === type)?.value;
  const weekday = read("weekday"), minutes = Number(read("hour")) * 60 + Number(read("minute"));
  return !["Sat", "Sun"].includes(weekday) && minutes >= 570 && minutes < 960;
}

async function readYahooTimeframe(symbol, timeframe) {
  const config = timeframeConfig(timeframe);
  let bars = await readYahooBars(symbol, config);
  const regularUsSession = isRegularUsEquity(symbol);
  if (regularUsSession && ["15m", "4h"].includes(timeframe)) bars = bars.filter(isRegularMarketBar);
  bars = aggregateTimeframeBars(bars, timeframe);
  return config.takeLast ? bars.slice(-config.takeLast) : bars;
}

async function readVerifiedTimeframe(symbol, timeframe) {
  // These selectors are candle resolutions, not lookback ranges. The older
  // backend route used range semantics and could therefore return a visually
  // plausible but materially different chart. Never mix those contracts.
  const yahooBars = await readYahooTimeframe(symbol, timeframe);
  return yahooBars.length
    ? { bars: yahooBars, source: "Yahoo Finance chart API", sourceRole: "verified-public-source", providerTimeframe: null }
    : { bars: [], source: null, sourceRole: "unavailable", providerTimeframe: null };
}

function localAssistantAnswer(question, context = {}) {
  const portfolio = context.portfolio || {};
  const positions = Array.isArray(portfolio.positions) ? portfolio.positions : [];
  const recommendations = Array.isArray(context.recommendations) ? context.recommendations : [];
  const signals = Array.isArray(context.topSignals) ? context.topSignals : [];
  const riskDecision = [...recommendations].sort((a, b) => Number(b.riskScore || 0) - Number(a.riskScore || 0))[0];
  const largestPosition = [...positions].sort((a, b) => Number(b.marketValue || 0) - Number(a.marketValue || 0))[0];
  const topSignal = [...signals].sort((a, b) => Number(b.score || 0) - Number(a.score || 0))[0];
  const lower = question.toLowerCase();
  if (lower.includes("risk") || lower.includes("סיכון")) {
    if (riskDecision) return `The highest current committee risk is ${riskDecision.symbol}: ${riskDecision.action} with risk ${Math.round(Number(riskDecision.riskScore || 0))}/100. ${riskDecision.reasoning || "Review this position before adding exposure."}`;
    if (largestPosition) return `${largestPosition.symbol} is your largest position at ${moneyValue(largestPosition.marketValue)} and is therefore your main concentration to monitor. No higher-confidence committee warning is active.`;
  }
  if (lower.includes("portfolio") || lower.includes("תיק")) return `Your portfolio is ${moneyValue(portfolio.totalValue)}, with ${positions.length} open positions and ${moneyValue(portfolio.cashBalance)} in cash. Total return is ${Number(portfolio.totalReturnPct || 0).toFixed(2)}%, while today's P/L is ${moneyValue(portfolio.dailyPnl)}.`;
  if (lower.includes("attention") || lower.includes("today") || lower.includes("היום")) return topSignal ? `Your highest-priority verified signal is “${topSignal.title}” at ${Math.round(Number(topSignal.score || 0))}/100. ${topSignal.detail || "Open the signal for the affected assets and supporting evidence."}` : "No verified high-priority signal is active right now.";
  return topSignal ? `Live ImpactOne summary: ${positions.length} positions, portfolio value ${moneyValue(portfolio.totalValue)}, and the leading verified signal is “${topSignal.title}” (${Math.round(Number(topSignal.score || 0))}/100). Ask specifically about portfolio risk, today's priority, or a symbol for a more focused answer.` : `Live ImpactOne summary: ${positions.length} positions and portfolio value ${moneyValue(portfolio.totalValue)}. No high-priority verified signal is active right now.`;
}

function moneyValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `$${number.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "unavailable";
}

async function enrichPortfolioLogos(portfolio) {
  const positions = Array.isArray(portfolio?.positions) ? portfolio.positions : [];
  const symbols = [...new Set(positions
    .filter((position) => String(position.assetType || "Equity").toLowerCase() === "equity")
    .map((position) => String(position.symbol || "").trim().toUpperCase())
    .filter(Boolean))];
  const logoEntries = await Promise.all(symbols.map(async (symbol) => {
    try {
      const payload = await readApi("/api/quote", { params: { symbol }, timeout: 8000 });
      return [symbol, String(payload?.quote?.companyLogo || "")];
    } catch {
      return [symbol, ""];
    }
  }));
  const logoBySymbol = new Map(logoEntries);
  return {
    ...portfolio,
    positions: positions.map((position) => ({
      ...position,
      companyLogo: logoBySymbol.get(String(position.symbol || "").trim().toUpperCase()) || "",
    })),
  };
}

async function buildDashboardPayload() {
  // Portfolio state is user-owned and must never silently fall back to an
  // empty demo account when the backend is busy serving the market ribbon.
  // Read it before the fan-out, then retry once if the first request failed.
  const portfolioRequest = readApi("/api/v2/portfolio", { timeout: 30000 }).then((value) => value || readApi("/api/v2/portfolio", { timeout: 30000 }));
  const [portfolio, quotes, sentiment, weeklyCot, intelligence, brief, feed, recommendations, watchlist, homeSummary] = await Promise.all([
    portfolioRequest,
    Promise.all(markets.map(async ({ label, symbol, providerSymbol, kind, displayUnit }) => {
      try {
        if (kind === "usdt-dominance") return { label, symbol, providerSymbol: null, displayUnit: "percent", quote: await readUsdtDominance() };
        const result = await readApi("/api/quote", { params: { symbol: providerSymbol }, timeout: 12000 });
        let quote = pickQuote(result);
        if (!quote) {
          // The chart engine already has a verified public-source fallback.
          // Reuse it for the ribbon instead of turning a provider outage into
          // eight empty cards and a misleading zero market score.
          const bars = await readYahooTimeframe(providerSymbol, "1d");
          const latest = bars.at(-1);
          const previous = bars.at(-2);
          if (latest && previous) {
            const change = ((Number(latest.close) - Number(previous.close)) / Number(previous.close)) * 100;
            quote = { price: Number(latest.close), change, volume: latest.volume || null, source: "Yahoo Finance chart API" };
          }
        }
        return { label, symbol, providerSymbol, displayUnit, quote };
      } catch {
        return { label, symbol, providerSymbol, displayUnit, quote: null };
      }
    })),
    readApi("/api/v2/market-sentiment/overview", { params: { market: "US" } }),
    readDxyCot(),
    readApi("/api/v2/agent-orchestrator/SPY", { timeout: 15000 }),
    readApi("/api/v2/morning-brief/today"),
    readApi("/api/intelligence/live-feed", { timeout: 15000 }),
    readApi("/api/v2/recommendations", { timeout: 15000 }),
    readApi("/api/watchlist", { timeout: 15000 }),
    readApi("/api/v2/home-summary", { timeout: 15000 }),
  ]);

  const portfolioWithLogos = await enrichPortfolioLogos(portfolio);

  const payload = {
    updatedAt: new Date().toISOString(),
    quotes,
    sentiment,
    weeklyCot,
    intelligence: intelligence?.summary || null,
    brief: Array.isArray(brief?.items) ? brief.items.slice(0, 3) : [],
    portfolio: portfolioWithLogos,
    feed: Array.isArray(feed?.feed) ? feed.feed
      .filter((item) => Number(item.attentionScore ?? item.importanceScore ?? 0) >= 70)
      .sort((left, right) => Number(right.attentionScore ?? right.importanceScore ?? 0) - Number(left.attentionScore ?? left.importanceScore ?? 0))
      .slice(0, 8) : [],
    recommendations: Array.isArray(recommendations?.recommendations) ? recommendations.recommendations.slice(0, 4) : [],
    watchlist: Array.isArray(watchlist?.watchlist) ? watchlist.watchlist : [],
    homeSummary,
  };
  return payload;
}

function refreshDashboardCache() {
  if (!dashboardRefreshPromise) {
    dashboardRefreshPromise = buildDashboardPayload()
      .then((value) => {
        dashboardCache = { cachedAt: Date.now(), value };
        return value;
      })
      .finally(() => {
        dashboardRefreshPromise = null;
      });
  }
  return dashboardRefreshPromise;
}

app.get("/api/dashboard", async (_request, response) => {
  if (dashboardCache) {
    const isFresh = Date.now() - dashboardCache.cachedAt < DASHBOARD_CACHE_TTL_MS;
    response.set("X-ImpactOne-Cache", isFresh ? "HIT" : "STALE");
    response.set("X-ImpactOne-Generated-At", dashboardCache.value.updatedAt);
    if (!isFresh) refreshDashboardCache().catch(() => {});
    return response.json(dashboardCache.value);
  }

  const payload = await refreshDashboardCache();
  response.set("X-ImpactOne-Cache", "MISS");
  response.set("X-ImpactOne-Generated-At", payload.updatedAt);
  return response.json(payload);
});

app.get("/api/insider-opportunities", async (request, response) => {
    try {
      const symbols = String(request.query.symbols || "").trim();
      const refresh = String(request.query.refresh || "").toLowerCase() === "true";
      const params = {};
      if (symbols) params.symbols = symbols;
      if (refresh) params.refresh = "true";
      const payload = await readApi("/api/v2/insider-opportunities", {
        params: Object.keys(params).length ? params : undefined,
        timeout: 180000,
      });
    response.json(payload);
  } catch (error) {
    response.status(error.response?.status || 503).json({ error: error.response?.data?.error || "The daily insider scan is unavailable right now." });
  }
});

app.get("/api/weekly-fibonacci-opportunities", async (request, response) => {
  try {
    const symbols = String(request.query.symbols || "").trim();
    const refresh = String(request.query.refresh || "").toLowerCase() === "true";
    const params = {};
    if (symbols) params.symbols = symbols;
    if (refresh) params.refresh = "true";
    const payload = await readApi("/api/v2/weekly-fibonacci-opportunities", {
      params: Object.keys(params).length ? params : undefined,
      timeout: 180000,
    });
    response.json(payload);
  } catch (error) {
    response.status(error.response?.status || 503).json({ error: error.response?.data?.error || "The weekly Fibonacci scan is unavailable right now." });
  }
});

app.get("/api/strategy-watchlist", async (request, response) => {
  try { response.json({ items: await refreshStrategyWatchlist({ force: String(request.query.refresh).toLowerCase() === "true" }), strategy: "Weekly low → later high · 0.886 · automatic ±5% entry-zone alert" }); }
  catch (error) { response.status(503).json({ error: error.message || "The strategy watchlist is unavailable." }); }
});

app.post("/api/strategy-watchlist", async (request, response) => {
  try {
    const symbol = String(request.body?.symbol || "").trim().toUpperCase();
    const existing = readStrategyWatchlist();
    if (existing.some((item) => item.symbol === symbol)) return response.status(409).json({ error: `${symbol} is already monitored.` });
    const item = await buildWeeklyWatch(symbol);
    writeStrategyWatchlist([item, ...existing]);
    response.status(201).json(item);
  } catch (error) { response.status(error.statusCode || 503).json({ error: error.message || "The symbol could not be added." }); }
});

app.delete("/api/strategy-watchlist/:symbol", (request, response) => {
  const symbol = String(request.params.symbol || "").trim().toUpperCase();
  writeStrategyWatchlist(readStrategyWatchlist().filter((item) => item.symbol !== symbol));
  response.status(204).end();
});

app.get("/api/daily-agent-picks", async (request, response) => {
  try {
    const refresh = String(request.query.refresh || "").toLowerCase() === "true";
    const payload = await readApi("/api/v2/daily-agent-picks", {
      params: refresh ? { refresh: "true" } : undefined,
      timeout: 180000,
    });
    response.json(payload);
  } catch (error) {
    response.status(error.response?.status || 503).json({ error: error.response?.data?.error || "The daily agent board is unavailable right now." });
  }
});

app.get("/api/strategy-lab", async (request, response) => {
  try { response.json(await readApi("/api/v2/strategy-lab", { timeout: 30000 })); }
  catch (error) { response.status(error.response?.status || 503).json({ error: error.response?.data?.error || "Strategy Lab is unavailable right now." }); }
});

app.get("/api/symbol/:symbol", async (request, response) => {
  const symbol = String(request.params.symbol || "").trim().toUpperCase().replace(/[^A-Z0-9.^=\-]/g, "").slice(0, 18);
  if (!symbol) return response.status(400).json({ error: "A valid symbol is required." });
  const range = String(request.query.range || "1mo");
  const shortSessions = { "15m": 5, "4h": 5, "1d": 20, "1w": 60, "1mo": 252, "3mo": 252, "1y": 252 }[range] || 20;
  const finraEligible = /^[A-Z]{1,6}(?:\.[A-Z])?$/.test(symbol);
  const cotProxySymbol = { "DX-Y.NYB": "DXY" }[symbol] || null;
  const [quote, chart, intelligence, recommendations, finraPositioning, cotPayload] = await Promise.all([
    readApi("/api/quote", { params: { symbol }, timeout: 15000 }),
    readVerifiedTimeframe(symbol, range),
    readApi(`/api/v2/agent-orchestrator/${encodeURIComponent(symbol)}`, { timeout: 15000 }),
    readApi("/api/v2/recommendations", { timeout: 15000 }),
    finraEligible ? readApi("/api/quote/short-volume", { params: { symbol, sessions: shortSessions }, timeout: 25000 }) : null,
    cotProxySymbol ? readDxyCot() : null,
  ]);
  const latestChartPrice = Number(chart?.bars?.at(-1)?.close);
  const fallbackResearch = (!quote?.company?.name || !quote?.fundamentals || !(quote?.news || []).length) ? await readNasdaqResearch(symbol, latestChartPrice) : null;
  const researchQuote = quote?.company?.name ? { ...quote, fundamentals: quote.fundamentals || fallbackResearch?.fundamentals, news: (quote.news || []).length ? quote.news : (fallbackResearch?.news || []) } : fallbackResearch;
  if (!researchQuote?.quote && !chart?.bars?.length) return response.status(404).json({ error: `No live data is available for ${symbol}.` });
  const chartAudit = auditChartBars(chart?.bars || [], range, { regularUsSession: isRegularUsEquity(symbol) });
  const fibonacci = chartAudit.valid ? buildTimeframeFibonacci(chartAudit.bars, {
    range,
    candleTimeframe: timeframeConfig(range).candleLabel || range,
    source: chart?.source || null,
    lookbackBars: timeframeConfig(range).fibonacciLookbackBars,
  }) : null;
  const coverage = chart?.providerTimeframe
    ? { ...chart.providerTimeframe, requested: range, requestedLabel: chart.providerTimeframe.label }
    : assessTimeframeCoverage(chartAudit.bars, range);
  if (!chartAudit.valid) { coverage.complete = false; coverage.reason = chartAudit.reason; }
  response.json({
    symbol,
    quote: researchQuote,
    chart: chartAudit.valid ? chartAudit.bars : [],
    timeframe: { requested: range, label: timeframeConfig(range).label || range, candleLabel: timeframeConfig(range).candleLabel || "daily candles", bars: chartAudit.valid ? chartAudit.bars.length : 0, marketHours: isRegularUsEquity(symbol) ? "NYSE regular session" : "continuous/provider session", source: chart?.source || null, sourceRole: chart?.sourceRole || "unavailable", coverage, integrity: { valid: chartAudit.valid, invalidRows: chartAudit.invalidRows, continuity: chartAudit.continuity, reason: chartAudit.reason } },
    fibonacci,
    intelligence,
    recommendations: (recommendations?.recommendations || []).filter((item) => item.symbol === symbol),
    positioning: finraPositioning?.available ? { ...finraPositioning, kind: "finra" } : cotPayload?.available ? cotPayload : finraPositioning,
    updatedAt: new Date().toISOString(),
  });
});

app.post("/api/assistant", async (request, response) => {
  const question = String(request.body?.question || "").trim().slice(0, 600);
  if (!question) return response.status(400).json({ error: "A question is required." });
  try {
    const result = await axios.post(`${backendUrl}/api/chat/ask`, {
      question,
      context: request.body?.context || {},
    }, { timeout: 25000 });
    const payload = result.data || {};
    response.json(payload.source === "openai" ? payload : {
      question,
      answer: localAssistantAnswer(question, request.body?.context || {}),
      source: "impactone-live-context",
      providerNotice: "Generated locally from the current live ImpactOne workspace.",
    });
  } catch (error) {
    response.status(error.response?.status || 503).json({ error: error.response?.data?.error || "ImpactOne assistant is unavailable." });
  }
});

app.post("/api/paper-position", async (request, response) => {
  try {
    const result = await axios.post(`${backendUrl}/api/v2/portfolio/positions`, request.body || {}, { timeout: 25000 });
    response.status(201).json(result.data);
  } catch (error) {
    response.status(error.response?.status || 503).json({ error: error.response?.data?.error || "Paper position could not be opened." });
  }
});
app.post("/api/paper-position/close", async (request, response) => {
  try { const result = await axios.post(`${backendUrl}/api/v2/portfolio/positions/close`, request.body || {}, { timeout: 25000 }); response.json(result.data); }
  catch (error) { response.status(error.response?.status || 503).json({ error: error.response?.data?.error || "Paper position could not be closed." }); }
});

app.use(express.static(path.join(__dirname, "public")));
if (tradingViewLibraryPath && fs.existsSync(tradingViewLibraryPath)) {
  app.use("/charting_library", express.static(path.resolve(tradingViewLibraryPath)));
}
app.use("/brand", express.static(path.join(__dirname, "..", "frontend", "public", "brand")));
app.get("*", (_request, response) => response.sendFile(path.join(__dirname, "public", "index.html")));

const strategyWatchTimer = setInterval(() => refreshStrategyWatchlist({ force: true }).catch(() => {}), 5 * 60 * 1000);
strategyWatchTimer.unref();
app.listen(port, "0.0.0.0", () => console.log(`Mission Control site: http://0.0.0.0:${port}`));
