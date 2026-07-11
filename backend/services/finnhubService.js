const axios = require("axios");
const { FINNHUB_API_KEY } = require("../config/env");
const { getCachedQuote, setCachedQuote } = require("./finnhubCache");

function buildError(message, statusCode = 502) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function formatMarketCap(value) {
  if (!value && value !== 0) {
    return "--";
  }

  const billions = value / 1000;
  if (billions >= 1000) {
    return `${(billions / 1000).toFixed(1)}T`;
  }
  return `${billions.toFixed(0)}B`;
}

function formatVolume(value) {
  if (!value && value !== 0) {
    return "--";
  }

  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return `${value}`;
}

function resolveRecommendation(data, quotePayload) {
  const buy = Number(data?.buy || 0);
  const hold = Number(data?.hold || 0);
  const sell = Number(data?.sell || 0);

  let label = "Hold";
  if (buy > hold && buy > sell) {
    label = buy >= hold + sell ? "Strong Buy" : "Buy";
  } else if (sell > buy && sell > hold) {
    label = "Sell";
  }

  let reason = `${data?.symbol || "The company"} is showing ${quotePayload.change >= 0 ? "positive" : "negative"} momentum today.`;
  if (label === "Strong Buy") {
    reason = `Analyst consensus is notably constructive with ${buy} buy ratings versus ${sell} sell ratings, and the stock is trading with positive momentum.`;
  } else if (label === "Buy") {
    reason = `The balance of analyst ratings leans positive, supported by a ${quotePayload.change >= 0 ? "positive" : "negative"} daily move.`;
  } else if (label === "Sell") {
    reason = `Analyst sentiment is leaning cautious, and the recent move is not supportive of a bullish stance.`;
  } else {
    reason = `The current setup is balanced, with mixed signals from analysts and a ${quotePayload.change >= 0 ? "positive" : "negative"} but not decisive daily move.`;
  }

  return {
    label,
    reason,
    details: data ? `${buy} Buy / ${hold} Hold / ${sell} Sell` : "Recommendation data unavailable",
  };
}

function buildRecommendationTrend(series = []) {
  if (!Array.isArray(series) || !series.length) {
    return {
      direction: "Flat",
      summary: "Recommendation trend data unavailable.",
      latest: null,
      previous: null,
    };
  }

  const sorted = [...series].sort((a, b) => new Date(b.period || 0) - new Date(a.period || 0));
  const latest = sorted[0];
  const previous = sorted[1] || null;

  const latestBuy = Number(latest?.buy || 0);
  const previousBuy = Number(previous?.buy || 0);
  const latestSell = Number(latest?.sell || 0);
  const previousSell = Number(previous?.sell || 0);

  let direction = "Flat";
  if (latestBuy > previousBuy || latestSell < previousSell) {
    direction = "Improving";
  } else if (latestBuy < previousBuy || latestSell > previousSell) {
    direction = "Weakening";
  }

  return {
    direction,
    summary: `Latest: ${latestBuy} Buy / ${Number(latest?.hold || 0)} Hold / ${latestSell} Sell${
      previous ? ` vs prior ${previousBuy} Buy / ${Number(previous?.hold || 0)} Hold / ${previousSell} Sell.` : "."
    }`,
    latest: latest?.period || null,
    previous: previous?.period || null,
  };
}

async function getPeerSymbols(symbol, count = 2) {
  const normalizedSymbol = (symbol || "NVDA").toUpperCase();
  const fallbackMap = {
    NVDA: ["AMD", "AVGO", "ASML"],
    AAPL: ["MSFT", "GOOGL", "QCOM"],
    PLTR: ["SNOW", "CRM", "AMZN"],
    TSLA: ["RIVN", "GM", "F"],
    AMZN: ["WMT", "SHOP", "MELI"],
    MSFT: ["GOOGL", "ORCL", "AMZN"],
  };

  if (!FINNHUB_API_KEY) {
    return (fallbackMap[normalizedSymbol] || ["MSFT", "GOOGL"]).slice(0, count);
  }

  try {
    const response = await axios.get("https://finnhub.io/api/v1/stock/peers", {
      params: { symbol: normalizedSymbol, token: FINNHUB_API_KEY },
      timeout: 10000,
    });

    const peers = (response.data || [])
      .map((item) => String(item || "").toUpperCase())
      .filter((item) => item && item !== normalizedSymbol && !item.includes("."));

    if (peers.length) {
      return peers.slice(0, count);
    }
  } catch (error) {
    // Swallow and use fallback peers.
  }

  return (fallbackMap[normalizedSymbol] || ["MSFT", "GOOGL"]).slice(0, count);
}

async function getHistoricalSeries(symbol) {
  try {
    const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
      params: { interval: "1d", range: "2y", includeAdjustedClose: "true" },
      timeout: 10000,
    });

    const result = response.data?.chart?.result?.[0];
    const timestamps = result?.timestamp || [];
    const closes = result?.indicators?.quote?.[0]?.close || [];

    return timestamps
      .map((timestamp, index) => ({
        label: new Date(timestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        value: closes[index],
      }))
      .filter((point) => Number.isFinite(point.value))
      .slice(-30);
  } catch (error) {
    return [];
  }
}

async function getCompanyNews(symbol, companyName) {
  const from = new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString().split("T")[0];
  const to = new Date().toISOString().split("T")[0];

  try {
    const response = await axios.get("https://finnhub.io/api/v1/company-news", {
      params: { symbol, token: FINNHUB_API_KEY, from, to },
      timeout: 10000,
    });

    const items = (response.data || []).filter((item) => {
      const haystack = `${item.headline || ""} ${item.summary || ""}`.toLowerCase();
      return haystack.includes(companyName.toLowerCase()) || haystack.includes(symbol.toLowerCase());
    });

    return (items.length ? items : response.data || []).slice(0, 5).map((item) => ({
      headline: item.headline,
      summary: item.summary,
      url: item.url,
      datetime: item.datetime,
    }));
  } catch (error) {
    return [];
  }
}

async function getQuote(symbol) {
  const normalizedSymbol = (symbol || "NVDA").toUpperCase();
  const cached = getCachedQuote(normalizedSymbol);
  if (cached) {
    return cached;
  }

  if (!FINNHUB_API_KEY) {
    throw buildError("FINNHUB_API_KEY is missing. Add it to the workspace .env file to enable live stock data.");
  }

  try {
    const [quoteResponse, profileResponse, recommendationResponse, metricsResponse, fearGreedResponse] = await Promise.allSettled([
      axios.get("https://finnhub.io/api/v1/quote", {
        params: { symbol: normalizedSymbol, token: FINNHUB_API_KEY },
      }),
      axios.get("https://finnhub.io/api/v1/stock/profile2", {
        params: { symbol: normalizedSymbol, token: FINNHUB_API_KEY },
      }),
      axios.get("https://finnhub.io/api/v1/stock/recommendation", {
        params: { symbol: normalizedSymbol, token: FINNHUB_API_KEY },
      }),
      axios.get("https://finnhub.io/api/v1/stock/metric", {
        params: { symbol: normalizedSymbol, token: FINNHUB_API_KEY, metric: "all" },
      }),
      axios.get("https://api.alternative.me/fng/?limit=1"),
    ]);

    if (quoteResponse.status !== "fulfilled" || profileResponse.status !== "fulfilled") {
      throw buildError("Finnhub quote request failed. Please try again shortly.");
    }

    const quoteData = quoteResponse.value.data;
    const profileData = profileResponse.value.data;
    const metricsData = metricsResponse.status === "fulfilled" ? metricsResponse.value.data?.metric || {} : {};

    if (!profileData?.name || !Number.isFinite(quoteData?.c)) {
      throw buildError("Ticker not found. Please enter a valid US stock ticker.", 404);
    }

    const baseQuote = {
      symbol: normalizedSymbol,
      price: quoteData.c || 0,
      change: quoteData.d || 0,
      // Finnhub's `d` is the absolute dollar change; `change` above is kept
      // as-is since existing screens already display it (mislabeled as %).
      // changePercent is the real day % change (Finnhub's `dp`), added for
      // Sprint 15's daily P/L calculation rather than propagating the
      // existing mislabeling into new financial math.
      changePercent: Number(quoteData.dp) || 0,
      trend: quoteData.d > 0 ? "Positive" : "Negative",
      marketCap: formatMarketCap(metricsData.marketCapitalization || profileData.marketCapitalization),
      pe: metricsData.peTTM || metricsData.peAnnual || profileData.pe || "--",
      volume: formatVolume(quoteData.v),
      weekHigh: metricsData["52WeekHigh"] ? `$${metricsData["52WeekHigh"].toFixed(2)}` : profileData.weekHigh ? `$${profileData.weekHigh.toFixed(2)}` : "--",
      weekLow: metricsData["52WeekLow"] ? `$${metricsData["52WeekLow"].toFixed(2)}` : profileData.weekLow ? `$${profileData.weekLow.toFixed(2)}` : "--",
      companyLogo: profileData.logo || "",
      companyDescription: profileData.name
        ? `${profileData.name} is a publicly traded company tracked through Finnhub.`
        : "Company description unavailable.",
    };

    const recommendationSeries = recommendationResponse.status === "fulfilled" ? recommendationResponse.value.data || [] : [];
    const recommendationData = recommendationSeries?.[0] || null;
    const companyName = profileData.name || normalizedSymbol;
    const [companyNews, chartData, fearGreedData] = await Promise.all([
      getCompanyNews(normalizedSymbol, companyName),
      getHistoricalSeries(normalizedSymbol),
      fearGreedResponse.status === "fulfilled" ? fearGreedResponse.value.data?.[0] : null,
    ]);

    const payload = {
      quote: baseQuote,
      company: {
        name: companyName,
        exchange: profileData.exchange || "Unknown",
        industry: profileData.finnhubIndustry || "Unknown",
        country: profileData.country || "US",
        currency: profileData.currency || "USD",
        website: profileData.weburl || "",
        marketCap: formatMarketCap(metricsData.marketCapitalization || profileData.marketCapitalization),
        ipo: profileData.ipo || "",
        employees: profileData.shareOutstanding ? `${profileData.shareOutstanding.toFixed(0)}M shares` : "",
      },
      recommendation: resolveRecommendation(recommendationData, baseQuote),
      recommendationTrend: buildRecommendationTrend(recommendationSeries),
      news: companyNews,
      chart: chartData,
      fearGreed: fearGreedData ? {
        value: fearGreedData.value,
        classification: fearGreedData.value_classification,
        timestamp: fearGreedData.timestamp,
      } : null,
    };

    setCachedQuote(normalizedSymbol, payload);
    return payload;
  } catch (error) {
    const status = error.response?.status;
    if (error.statusCode) {
      throw error;
    }
    const message = status === 401 || status === 403
      ? "FINNHUB_API_KEY is invalid or expired. Update the key in the workspace .env file."
      : "Finnhub quote request failed. Please try again shortly.";
    throw buildError(message);
  }
}

module.exports = { getQuote, getPeerSymbols };
