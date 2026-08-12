const axios = require("axios");
const { FINNHUB_API_KEY } = require("../config/env");
const { getCachedQuote, setCachedQuote } = require("./finnhubCache");
const { getDailyBars } = require("./intelligence/priceHistoryProvider");
const { createFinraShortVolumeDataProvider } = require("./domainAgents/shortInterestAgent/finraShortVolumeDataProvider");
const insiderAgent = require("./domainAgents/insiderAgent/insiderAgent");
const { createInsiderDataProvider } = require("./domainAgents/insiderAgent/insiderDataProvider");
const symbolSentimentAgent = require("./domainAgents/sentimentAgent/sentimentAgent");

const finraShortVolumeProvider = createFinraShortVolumeDataProvider({ lookbackTradingDays: 20 });
const oneYearInsiderProvider = createInsiderDataProvider({ lookbackDays: 365 });

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
    counts: data ? { buy, hold, sell } : null,
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
  const bars = await getDailyBars(symbol, { range: "2y" });
  return bars
    .map((bar) => ({
      label: new Date(`${bar.date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: bar.close,
    }))
    .filter((point) => Number.isFinite(point.value))
    .slice(-30);
}

function formatWholeVolume(value) {
  return Number.isFinite(value) ? new Intl.NumberFormat("en-US").format(value) : "--";
}

function buildVolumeActivity(history) {
  if (!Array.isArray(history) || history.length < 2) {
    return { available: false, averageVolume: null, ratio: null, state: null };
  }
  const latest = Number(history.at(-1)?.totalVolume);
  const baselineRows = history.slice(0, -1).map((row) => Number(row.totalVolume)).filter(Number.isFinite);
  const averageVolume = baselineRows.reduce((total, value) => total + value, 0) / baselineRows.length;
  if (!Number.isFinite(latest) || !Number.isFinite(averageVolume) || averageVolume <= 0) {
    return { available: false, averageVolume: null, ratio: null, state: null };
  }
  const ratio = latest / averageVolume;
  return {
    available: true,
    averageVolume,
    ratio,
    state: ratio >= 1.35 ? "Unusually high" : ratio <= 0.7 ? "Below normal" : "Normal",
  };
}

function buildAnalystPriceFit(currentPrice, targetMean, pe) {
  const price = Number(currentPrice);
  const target = Number(targetMean);
  if (Number.isFinite(price) && price > 0 && Number.isFinite(target) && target > 0) {
    const deviationPercent = Math.abs(price - target) / target * 100;
    return {
      available: true,
      score: Math.max(0, Math.min(10, Math.round((10 - deviationPercent / 5) * 10) / 10)),
      targetMean: target,
      deviationPercent,
      source: "analyst-target",
    };
  }
  const peValue = Number(pe);
  if (!Number.isFinite(peValue) || peValue <= 0) {
    return { available: false, score: null, targetMean: null, deviationPercent: null, source: null };
  }
  return {
    available: true,
    score: Math.max(0, Math.min(10, Math.round((10 - peValue / 12) * 10) / 10)),
    targetMean: null,
    deviationPercent: null,
    source: "pe-context",
  };
}

function summarizeInsiderBuys(report) {
  if (!report?.dataAvailable) return { available: false, reason: report?.unavailableReason || "SEC Form 4 data is unavailable." };
  const buys = (report.inputs?.transactions || []).filter((transaction) => transaction.transactionCode === "P" && Number.isFinite(transaction.shares) && Number.isFinite(transaction.pricePerShare));
  const shares = buys.reduce((total, transaction) => total + transaction.shares, 0);
  const value = buys.reduce((total, transaction) => total + transaction.shares * transaction.pricePerShare, 0);
  return { available: true, buyCount: buys.length, shares, averagePrice: shares > 0 ? value / shares : null };
}

async function getFinnhubInsiderBuys(symbol) {
  try {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
    const response = await axios.get("https://finnhub.io/api/v1/stock/insider-transactions", {
      params: { symbol, from, to, token: FINNHUB_API_KEY }, timeout: 12000,
    });
    const rows = Array.isArray(response.data?.data) ? response.data.data : [];
    const buys = rows.filter((row) => String(row.transactionCode || "").toUpperCase() === "P" && Number.isFinite(Number(row.change)) && Number(row.change) > 0 && Number.isFinite(Number(row.transactionPrice)) && Number(row.transactionPrice) > 0);
    const shares = buys.reduce((total, row) => total + Number(row.change), 0);
    const value = buys.reduce((total, row) => total + Number(row.change) * Number(row.transactionPrice), 0);
    return { available: true, buyCount: buys.length, shares, averagePrice: shares > 0 ? value / shares : null, source: "Finnhub insider transactions" };
  } catch {
    return null;
  }
}

async function getSnapshotSignals(symbol) {
  const [shortResult, insiderResult, sentimentResult] = await Promise.allSettled([
    finraShortVolumeProvider.getSymbolShortVolumeData(symbol),
    insiderAgent.generateReport(symbol, { provider: oneYearInsiderProvider }),
    symbolSentimentAgent.generateReport(symbol),
  ]);
  const latestShort = shortResult.status === "fulfilled" && shortResult.value?.dataAvailable
    ? shortResult.value.dailyShortVolume.at(-1)
    : null;
  const shortHistory = shortResult.status === "fulfilled" && shortResult.value?.dataAvailable
    ? shortResult.value.dailyShortVolume.map((entry) => ({
      date: entry.date,
      shortVolume: entry.shortVolume,
      nonShortVolume: Math.max(0, entry.totalVolume - entry.shortVolume),
      totalVolume: entry.totalVolume,
    }))
    : [];
  let insider = insiderResult.status === "fulfilled" ? summarizeInsiderBuys(insiderResult.value) : { available: false, reason: "SEC Form 4 data is unavailable." };
  if (!insider.available) insider = await getFinnhubInsiderBuys(symbol) || insider;
  const sentiment = sentimentResult.status === "fulfilled" ? sentimentResult.value : null;
  return {
    shortLongVolume: latestShort ? {
      available: true,
      date: latestShort.date,
      shortVolume: latestShort.shortVolume,
      nonShortVolume: Math.max(0, latestShort.totalVolume - latestShort.shortVolume),
      totalVolume: latestShort.totalVolume,
      shortRatio: latestShort.shortVolumeRatio,
      shortVolumeFormatted: formatWholeVolume(latestShort.shortVolume),
      nonShortVolumeFormatted: formatWholeVolume(Math.max(0, latestShort.totalVolume - latestShort.shortVolume)),
      dailyHistory: shortHistory,
    } : { available: false, reason: "FINRA daily short-volume data is unavailable." },
    insider,
    sentiment: sentiment?.dataAvailable ? {
      available: true,
      state: sentiment.sentimentState,
      score: sentiment.sentimentScore,
      newsScore: Math.round((sentiment.sentimentScore / 10) * 10) / 10,
      articleCount: sentiment.sourceQuality?.totalArticleCount || 0,
    } : { available: false, reason: sentiment?.unavailableReason || "Symbol news sentiment is unavailable." },
  };
}

async function getShortVolumeRange(symbol, lookbackTradingDays) {
  const normalizedSymbol = String(symbol || "").trim().toUpperCase();
  const days = Number(lookbackTradingDays);
  if (!normalizedSymbol) throw buildError("A stock symbol is required.", 400);
  if (!Number.isInteger(days) || ![5, 20, 60, 252].includes(days)) {
    throw buildError("Unsupported short-volume range.", 400);
  }

  const report = await finraShortVolumeProvider.getSymbolShortVolumeData(normalizedSymbol, { lookbackTradingDays: days });
  const history = report?.dataAvailable ? report.dailyShortVolume.map((entry) => ({
    date: entry.date,
    shortVolume: entry.shortVolume,
    nonShortVolume: Math.max(0, entry.totalVolume - entry.shortVolume),
    totalVolume: entry.totalVolume,
  })) : [];
  const shortVolume = history.reduce((total, item) => total + item.shortVolume, 0);
  const nonShortVolume = history.reduce((total, item) => total + item.nonShortVolume, 0);

  return {
    symbol: normalizedSymbol,
    available: history.length > 0,
    requestedSessions: days,
    sessions: history.length,
    shortVolume,
    nonShortVolume,
    totalVolume: shortVolume + nonShortVolume,
    dailyHistory: history,
    source: "FINRA Reg SHO daily short-volume files",
    reason: history.length ? null : report?.unavailableReason || "FINRA daily short-volume data is unavailable.",
  };
}

function buildHeadlineSentimentFallback(newsItems = []) {
  const positive = /beat|growth|accelerat|expand|launch|win|record|raise|upgrade|strong|surge|outperform/i;
  const negative = /fall|cut|miss|risk|weak|decline|drop|lawsuit|breach|downgrade|layoff|concern/i;
  const texts = newsItems.map((item) => `${item.headline || ""} ${item.summary || ""}`.trim()).filter(Boolean);
  if (!texts.length) return null;
  let score = 50;
  for (const text of texts) {
    if (positive.test(text)) score += 6;
    if (negative.test(text)) score -= 6;
  }
  score = Math.max(0, Math.min(100, score));
  return {
    available: true,
    state: score >= 60 ? "BULLISH" : score <= 40 ? "BEARISH" : "NEUTRAL",
    score,
    newsScore: Math.round(score) / 10,
    articleCount: texts.length,
    source: "Finnhub company-news headlines",
  };
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
    const [quoteResponse, profileResponse, recommendationResponse, metricsResponse, fearGreedResponse, priceTargetResponse] = await Promise.allSettled([
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
      axios.get("https://finnhub.io/api/v1/stock/price-target", {
        params: { symbol: normalizedSymbol, token: FINNHUB_API_KEY },
      }),
    ]);

    if (quoteResponse.status !== "fulfilled" || profileResponse.status !== "fulfilled") {
      throw buildError("Finnhub quote request failed. Please try again shortly.");
    }

    const quoteData = quoteResponse.value.data;
    const profileData = profileResponse.value.data;
    const metricsData = metricsResponse.status === "fulfilled" ? metricsResponse.value.data?.metric || {} : {};
    const priceTargetData = priceTargetResponse.status === "fulfilled" ? priceTargetResponse.value.data || {} : {};
    const pe = metricsData.peTTM || metricsData.peAnnual || profileData.pe || null;

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
      pe: pe || "--",
      analystPriceFit: buildAnalystPriceFit(quoteData.c, priceTargetData.targetMean, pe),
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
    const [companyNews, chartData, fearGreedData, snapshotSignals] = await Promise.all([
      getCompanyNews(normalizedSymbol, companyName),
      getHistoricalSeries(normalizedSymbol),
      fearGreedResponse.status === "fulfilled" ? fearGreedResponse.value.data?.data?.[0] : null,
      getSnapshotSignals(normalizedSymbol),
    ]);

    if (!snapshotSignals.sentiment.available) {
      const fallbackSentiment = buildHeadlineSentimentFallback(companyNews);
      if (fallbackSentiment) snapshotSignals.sentiment = fallbackSentiment;
    }
    if (snapshotSignals.shortLongVolume.available && baseQuote.volume === "--") {
      baseQuote.volume = formatVolume(snapshotSignals.shortLongVolume.totalVolume);
    }
    baseQuote.volumeActivity = buildVolumeActivity(snapshotSignals.shortLongVolume.dailyHistory);

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
      snapshotSignals,
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

module.exports = { getQuote, getPeerSymbols, getShortVolumeRange };
