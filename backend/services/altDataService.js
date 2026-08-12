const axios = require("axios");
const { OPENAI_API_KEY, SEC_EDGAR_USER_AGENT } = require("../config/env");
const { getCached, setCached } = require("./altDataCache");

const SEC_USER_AGENT = SEC_EDGAR_USER_AGENT;

const SECTOR_TICKER_MAP = {
  technology: ["AAPL", "MSFT", "NVDA", "TSLA"],
  energy: ["XOM", "CVX", "SLB"],
  crypto: ["COIN", "MSTR", "RIOT"],
  rates: ["JPM", "TLT"],
};

const SYMBOL_SECTOR_MAP = {
  AAPL: "technology",
  NVDA: "technology",
  TSLA: "technology",
  BTC: "crypto",
  COIN: "crypto",
  MSTR: "crypto",
  XOM: "energy",
  CVX: "energy",
  CL: "energy",
};

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function classifyPositioning(net, weeklyChange) {
  if (net > 10000 && weeklyChange > 0) return "Bullish buildup";
  if (net > 0) return "Mild long";
  if (net < -10000 && weeklyChange < 0) return "Bearish buildup";
  if (net < 0) return "Mild short";
  return "Neutral";
}

function inferSectorFromSymbol(symbol = "") {
  return SYMBOL_SECTOR_MAP[String(symbol || "").toUpperCase()] || "technology";
}

function inferAssetFromSymbol(symbol = "") {
  const normalized = String(symbol || "").toUpperCase();
  if (["BTC", "ETH", "COIN", "MSTR", "RIOT"].includes(normalized)) return "crypto";
  if (["XOM", "CVX", "SLB", "CL"].includes(normalized)) return "energy";
  return "equities";
}

function unavailableCot(symbol = "AAPL") {
  return {
    asset: inferAssetFromSymbol(symbol),
    market: null,
    commercialLong: null,
    commercialShort: null,
    nonCommercialLong: null,
    nonCommercialShort: null,
    netPositioning: null,
    weeklyChange: null,
    signal: null,
    source: "unavailable",
    unavailable: true,
    reason: "CFTC COT data could not be retrieved.",
  };
}

async function getCotData({ symbol = "AAPL" } = {}) {
  const cacheKey = `cot:${symbol.toUpperCase()}`;
  const cached = getCached("alt", cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const asset = inferAssetFromSymbol(symbol);
    const marketHint = asset === "energy" ? "CRUDE" : asset === "crypto" ? "BITCOIN" : "S&P";
    // TFF (Traders in Financial Futures) is the CFTC report that covers
    // equity-index and financial futures. The prior disaggregated report
    // covers physical commodities, which made an S&P proxy unreliable.
    const response = await axios.get("https://publicreporting.cftc.gov/resource/gpe5-46if.json", {
      params: {
        $limit: 300,
        $order: "report_date_as_yyyy_mm_dd desc",
      },
      timeout: 12000,
    });

    const rows = Array.isArray(response.data) ? response.data : [];
    const picked = rows.find((row) => String(row.market_and_exchange_names || "").toUpperCase().includes(marketHint)) || rows[0];
    if (!picked) {
      throw new Error("COT dataset returned no rows");
    }

    const nonCommercialLong = toNumber(picked.lev_money_positions_long_all || picked.lev_money_positions_long);
    const nonCommercialShort = toNumber(picked.lev_money_positions_short_all || picked.lev_money_positions_short);
    const commercialLong = toNumber(picked.dealer_positions_long_all || picked.dealer_positions_long);
    const commercialShort = toNumber(picked.dealer_positions_short_all || picked.dealer_positions_short);
    const netPositioning = nonCommercialLong - nonCommercialShort;
    const weeklyChange = toNumber(picked.change_in_lev_money_long_all || 0) - toNumber(picked.change_in_lev_money_short_all || 0);

    const normalized = {
      asset,
      market: picked.market_and_exchange_names || null,
      commercialLong,
      commercialShort,
      nonCommercialLong,
      nonCommercialShort,
      netPositioning,
      weeklyChange,
      signal: classifyPositioning(netPositioning, weeklyChange),
      source: "cftc",
    };

    setCached("alt", cacheKey, normalized, 6 * 60 * 60 * 1000);
    return normalized;
  } catch (error) {
    return unavailableCot(symbol);
  }
}

function inferPolymarketTickers(event = "") {
  const text = String(event || "").toLowerCase();
  if (text.includes("bitcoin") || text.includes("crypto")) return ["BTC", "COIN", "MSTR"];
  if (text.includes("oil") || text.includes("opec") || text.includes("energy")) return ["XOM", "CVX"];
  if (text.includes("fed") || text.includes("rate")) return ["JPM", "TLT"];
  return ["AAPL", "NVDA", "SPY"];
}

function inferPolymarketSectors(event = "") {
  const tickers = inferPolymarketTickers(event);
  const sectors = new Set();
  tickers.forEach((ticker) => sectors.add(inferSectorFromSymbol(ticker)));
  return Array.from(sectors);
}

async function getPolymarketData({ symbol = "AAPL" } = {}) {
  const cacheKey = `polymarket:${symbol.toUpperCase()}`;
  const cached = getCached("alt", cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await axios.get("https://gamma-api.polymarket.com/markets", {
      params: { limit: 50, active: true, closed: false },
      timeout: 12000,
    });

    const rows = Array.isArray(response.data) ? response.data : [];
    const normalized = rows.slice(0, 5).map((row) => {
      const event = row.question || row.title || "Unnamed event";
      const probability = toNumber(row.probability || row.lastTradePrice || row.price || 0.5, 0.5);
      const volume = toNumber(row.volumeNum || row.volume || 0);
      const liquidity = toNumber(row.liquidityNum || row.liquidity || 0);
      const trend = toNumber(row.oneDayPriceChange || row.priceChange || 0) >= 0 ? "Up" : "Down";

      return {
        event,
        category: row.category || row.groupItemTitle || "General",
        probability: Math.max(0, Math.min(1, probability)),
        volume,
        liquidity,
        trend,
        relatedSectors: inferPolymarketSectors(event),
        relatedTickers: inferPolymarketTickers(event),
        source: "polymarket",
      };
    });

    const result = normalized;
    setCached("alt", cacheKey, result, 20 * 60 * 1000);
    return result;
  } catch (error) {
    return [];
  }
}

function parseFredCsv(text = "") {
  const lines = String(text || "").trim().split(/\r?\n/);
  if (lines.length < 2) {
    return [];
  }

  const data = [];
  for (let i = 1; i < lines.length; i += 1) {
    const [date, rawValue] = lines[i].split(",");
    const value = toNumber(rawValue, NaN);
    if (!Number.isFinite(value)) {
      continue;
    }
    data.push({ date, value });
  }

  return data;
}

async function fetchFredSeries(seriesId) {
  const response = await axios.get(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`, {
    timeout: 12000,
  });

  const parsed = parseFredCsv(response.data);
  if (!parsed.length) {
    throw new Error(`No data for ${seriesId}`);
  }

  const latest = parsed[parsed.length - 1];
  const prev = parsed[Math.max(0, parsed.length - 2)] || latest;
  return {
    id: seriesId,
    latest: latest.value,
    previous: prev.value,
    change: latest.value - prev.value,
    asOf: latest.date,
  };
}

function unavailableMacroRegime() {
  return {
    rates: null,
    cpi: null,
    unemployment: null,
    m2: null,
    tenYearYield: null,
    regime: null,
    source: "unavailable",
    unavailable: true,
    reason: "FRED macro data could not be retrieved.",
  };
}

function deriveMacroRegime({ rates, cpi, unemployment, m2, tenYearYield }) {
  const inflationPressure = cpi.change > 0.4 || tenYearYield.latest > 4.5 ? "high" : cpi.change > 0.15 ? "moderate" : "low";
  const recessionRisk = unemployment.latest >= 4.5 && rates.latest > 4 ? "high" : unemployment.latest >= 4 ? "medium" : "low";
  const liquidityTrend = m2.change > 0 ? "improving" : "tightening";
  const riskMode = (inflationPressure === "low" || inflationPressure === "moderate") && recessionRisk !== "high" ? "risk-on" : "risk-off";

  return {
    riskMode,
    inflationPressure,
    recessionRisk,
    liquidityTrend,
  };
}

async function getMacroData() {
  const cacheKey = "macro:all";
  const cached = getCached("alt", cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const [rates, cpi, unemployment, m2, tenYearYield] = await Promise.all([
      fetchFredSeries("FEDFUNDS"),
      fetchFredSeries("CPIAUCSL"),
      fetchFredSeries("UNRATE"),
      fetchFredSeries("M2SL"),
      fetchFredSeries("DGS10"),
    ]);

    const result = {
      rates,
      cpi,
      unemployment,
      m2,
      tenYearYield,
      regime: deriveMacroRegime({ rates, cpi, unemployment, m2, tenYearYield }),
      source: "fred",
    };

    setCached("alt", cacheKey, result, 12 * 60 * 60 * 1000);
    return result;
  } catch (error) {
    return unavailableMacroRegime();
  }
}

async function getSecTickerMap() {
  const cacheKey = "sec:tickerMap";
  const cached = getCached("alt", cacheKey);
  if (cached) {
    return cached;
  }

  const response = await axios.get("https://www.sec.gov/files/company_tickers.json", {
    timeout: 12000,
    headers: {
      "User-Agent": SEC_USER_AGENT,
      Accept: "application/json",
    },
  });

  const body = response.data || {};
  const map = new Map();
  Object.values(body).forEach((item) => {
    if (item?.ticker && item?.cik_str) {
      map.set(String(item.ticker).toUpperCase(), String(item.cik_str).padStart(10, "0"));
    }
  });

  setCached("alt", cacheKey, map, 7 * 24 * 60 * 60 * 1000);
  return map;
}

function unavailableSecData(symbol = "AAPL") {
  return {
    symbol,
    filings: [],
    signal: null,
    source: "unavailable",
    unavailable: true,
    reason: `SEC filings could not be retrieved for ${symbol}.`,
  };
}

async function summarizeFilingsWithAi(symbol, filings) {
  if (!OPENAI_API_KEY) {
    const has8k = filings.some((f) => String(f.form).toUpperCase() === "8-K");
    if (has8k) {
      return `${symbol} has a recent 8-K filing. Treat this as a potential event-risk signal and review disclosures.`;
    }
    return `${symbol} has routine periodic filings with no immediate red-flag classification from fallback rules.`;
  }

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a financial filings analyst. Summarize filing risk in 1 sentence.",
          },
          {
            role: "user",
            content: `Symbol: ${symbol}. Filings: ${JSON.stringify(filings.slice(0, 6))}`,
          },
        ],
        temperature: 0.2,
      },
      {
        timeout: 15000,
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data?.choices?.[0]?.message?.content || `${symbol} filings reviewed.`;
  } catch (error) {
    return `${symbol} filings available but AI summarization is temporarily unavailable.`;
  }
}

async function getSecData({ symbol = "AAPL" } = {}) {
  const normalized = String(symbol || "AAPL").toUpperCase();
  const cacheKey = `sec:${normalized}`;
  const cached = getCached("alt", cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const tickerMap = await getSecTickerMap();
    const cik = tickerMap.get(normalized);
    if (!cik) {
      throw new Error(`No SEC CIK mapping found for ${normalized}`);
    }

    const response = await axios.get(`https://data.sec.gov/submissions/CIK${cik}.json`, {
      timeout: 12000,
      headers: {
        "User-Agent": SEC_USER_AGENT,
        Accept: "application/json",
      },
    });

    const recent = response.data?.filings?.recent || {};
    const forms = recent.form || [];
    const filed = recent.filingDate || [];
    const accession = recent.accessionNumber || [];
    const primaryDocs = recent.primaryDocument || [];

    const filings = [];
    for (let i = 0; i < Math.min(forms.length, 20); i += 1) {
      const form = String(forms[i] || "").toUpperCase();
      if (!["10-K", "10-Q", "8-K", "4"].includes(form)) {
        continue;
      }

      filings.push({
        form,
        filedAt: filed[i] || "",
        accessionNumber: accession[i] || "",
        primaryDocument: primaryDocs[i] || "",
      });

      if (filings.length >= 8) {
        break;
      }
    }

    const signal = await summarizeFilingsWithAi(normalized, filings);
    const result = {
      symbol: normalized,
      filings,
      signal,
      source: "sec",
    };

    setCached("alt", cacheKey, result, 4 * 60 * 60 * 1000);
    return result;
  } catch (error) {
    return unavailableSecData(normalized);
  }
}

function normalizeCongressTrade(raw = {}) {
  const ticker = String(raw.ticker || raw.symbol || raw.asset_description || "").split(" ")[0].toUpperCase();
  return {
    politician: raw.representative || raw.politician || raw.senator || "Unknown",
    asset: raw.asset_description || raw.asset || "Unknown asset",
    ticker,
    sector: inferSectorFromSymbol(ticker),
    transactionType: raw.type || raw.transaction || "Unknown",
    amount: raw.amount || raw.amount_range || "Unknown",
    date: raw.transaction_date || raw.disclosure_date || raw.date || "",
  };
}

async function getCongressData({ symbol = "AAPL" } = {}) {
  const normalized = String(symbol || "AAPL").toUpperCase();
  const cacheKey = `congress:${normalized}`;
  const cached = getCached("alt", cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await axios.get("https://house-stock-watcher-data.s3-us-west-2.amazonaws.com/data/all_transactions.json", {
      timeout: 15000,
    });

    const rows = Array.isArray(response.data) ? response.data : [];
    const mapped = rows
      .map(normalizeCongressTrade)
      .filter((item) => item.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const focused = mapped.filter((item) => item.ticker === normalized).slice(0, 6);
    const result = {
      symbol: normalized,
      trades: focused.length ? focused : mapped.slice(0, 6),
      signal: focused.length
        ? `${focused.length} recent disclosed congress trades mention ${normalized}.`
        : "No recent direct ticker match; showing latest broad congressional disclosures.",
      source: "house-stock-watcher",
    };

    setCached("alt", cacheKey, result, 6 * 60 * 60 * 1000);
    return result;
  } catch (error) {
    const fallback = {
      symbol: normalized,
      trades: [],
      signal: "Congress trading feed unavailable. Monitoring remains active.",
      source: "unavailable",
      unavailable: true,
    };
    setCached("alt", cacheKey, fallback, 45 * 60 * 1000);
    return fallback;
  }
}

async function getEconomicEvents({ symbol = "AAPL" } = {}) {
  const normalized = String(symbol || "AAPL").toUpperCase();
  const cacheKey = `events:${normalized}`;
  const cached = getCached("alt", cacheKey);
  if (cached) {
    return cached;
  }

  const from = new Date();
  const to = new Date(from.getTime() + 14 * 24 * 60 * 60 * 1000);
  const dateFrom = from.toISOString().slice(0, 10);
  const dateTo = to.toISOString().slice(0, 10);

  try {
    const [macroResponse, earningsResponse] = await Promise.allSettled([
      axios.get("https://financialmodelingprep.com/api/v3/economic_calendar", {
        params: { from: dateFrom, to: dateTo, apikey: "demo" },
        timeout: 12000,
      }),
      axios.get("https://financialmodelingprep.com/api/v3/earning_calendar", {
        params: { from: dateFrom, to: dateTo, apikey: "demo" },
        timeout: 12000,
      }),
    ]);

    const macroRows = macroResponse.status === "fulfilled" && Array.isArray(macroResponse.value.data)
      ? macroResponse.value.data
      : [];

    const earningsRows = earningsResponse.status === "fulfilled" && Array.isArray(earningsResponse.value.data)
      ? earningsResponse.value.data
      : [];

    const macroEvents = macroRows.slice(0, 8).map((item) => ({
      date: item.date || item.eventDate || "",
      event: item.event || item.name || "Macro event",
      category: "Macro",
      importance: String(item.importance || "Medium"),
      relatedTickers: [normalized, "SPY"],
      relatedSectors: [inferSectorFromSymbol(normalized)],
      source: "fmp",
    }));

    const earningsEvents = earningsRows
      .filter((item) => String(item.symbol || "").toUpperCase() === normalized)
      .slice(0, 4)
      .map((item) => ({
        date: item.date || "",
        event: `${String(item.symbol || normalized).toUpperCase()} earnings`,
        category: "Earnings",
        importance: "High",
        relatedTickers: [String(item.symbol || normalized).toUpperCase()],
        relatedSectors: [inferSectorFromSymbol(item.symbol || normalized)],
        source: "fmp",
      }));

    const result = [...macroEvents, ...earningsEvents].slice(0, 10);
    const normalizedResult = result;
    setCached("alt", cacheKey, normalizedResult, 2 * 60 * 60 * 1000);
    return normalizedResult;
  } catch (error) {
    return [];
  }
}

function buildOptionsPlaceholder() {
  return {
    status: "not_connected",
    provider: "pending",
    message: "Options flow provider is not connected yet.",
  };
}

function buildOnChainPlaceholder() {
  return {
    status: "not_connected",
    provider: "pending",
    message: "On-chain provider is not connected yet.",
  };
}

function unique(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function computeConfidenceScore({ cot, polymarket, macro, sec, congress, events }) {
  let score = 0;
  if (cot?.source === "cftc") score += 20;
  if ((polymarket || []).some((item) => item.source === "polymarket")) score += 20;
  if (macro?.source === "fred") score += 20;
  if (sec?.source === "sec") score += 15;
  if (congress?.source === "house-stock-watcher") score += 10;
  if ((events || []).some((item) => item.source === "fmp")) score += 15;
  return Math.max(0, Math.min(100, score));
}

function normalizeSummary({ symbol, cot, polymarket, macro, sec, congress, events }) {
  const topPrediction = (polymarket || [])[0] || null;
  const impactedSectors = unique([
    ...(topPrediction?.relatedSectors || []),
    inferSectorFromSymbol(symbol),
    ...(congress?.trades || []).map((trade) => trade.sector),
  ]);

  const relatedTickers = unique([
    symbol,
    ...(topPrediction?.relatedTickers || []),
    ...(congress?.trades || []).map((trade) => trade.ticker),
    ...((events || []).flatMap((event) => event.relatedTickers || [])),
  ]).slice(0, 12);

  const upcomingHighRisk = (events || []).filter((event) => String(event.importance || "").toLowerCase() === "high").slice(0, 3);

  return {
    symbol,
    smartMoneyPositioning: {
      netPositioning: cot?.netPositioning ?? null,
      weeklyChange: cot?.weeklyChange ?? null,
      signal: cot?.signal ?? null,
      market: cot?.market ?? null,
    },
    predictionMarketProbabilities: topPrediction
      ? {
        event: topPrediction.event,
        category: topPrediction.category,
        probability: topPrediction.probability,
        trend: topPrediction.trend,
        volume: topPrediction.volume,
        liquidity: topPrediction.liquidity,
      }
      : null,
    macroRegime: macro?.regime ?? null,
    secFilingSignal: sec?.signal ?? null,
    politicalTradingSignal: congress?.signal ?? null,
    optionsStatus: buildOptionsPlaceholder(),
    onChainStatus: buildOnChainPlaceholder(),
    upcomingEventRisk: upcomingHighRisk,
    impactedSectors,
    relatedTickers,
    confidenceScore: computeConfidenceScore({ cot, polymarket, macro, sec, congress, events }),
  };
}

async function getAltDataSummary({ symbol = "AAPL" } = {}) {
  const normalized = String(symbol || "AAPL").toUpperCase();
  const cacheKey = `summary:${normalized}`;
  const cached = getCached("alt", cacheKey);
  if (cached) {
    return cached;
  }

  const [cot, polymarket, macro, sec, congress, events] = await Promise.all([
    getCotData({ symbol: normalized }),
    getPolymarketData({ symbol: normalized }),
    getMacroData(),
    getSecData({ symbol: normalized }),
    getCongressData({ symbol: normalized }),
    getEconomicEvents({ symbol: normalized }),
  ]);

  const summary = {
    symbol: normalized,
    cot,
    polymarket,
    macro,
    sec,
    congress,
    events,
    placeholders: {
      optionsFlow: buildOptionsPlaceholder(),
      onChain: buildOnChainPlaceholder(),
    },
    signals: normalizeSummary({ symbol: normalized, cot, polymarket, macro, sec, congress, events }),
  };

  setCached("alt", cacheKey, summary, 10 * 60 * 1000);
  return summary;
}

module.exports = {
  getCotData,
  getPolymarketData,
  getMacroData,
  getSecData,
  getCongressData,
  getEconomicEvents,
  getAltDataSummary,
};
