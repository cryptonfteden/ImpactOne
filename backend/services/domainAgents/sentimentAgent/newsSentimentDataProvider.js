// Phase SENTIMENT-AGENT-001 — the real, per-symbol news provider
// abstraction. Deliberately does NOT reuse services/newsService.js:
// that service returns a static, fabricated fallback article when
// NEWS_API_KEY is unset (fine for a generic "finance news" widget, but
// this mission explicitly requires "Never fabricate ... news data.
// Return honest null/unavailable fields where no real source exists.")
// This provider calls NewsAPI first, then (only if configured and the
// primary source is unavailable) Finnhub's documented company-news endpoint.
// Both paths return only provider-supplied articles. It never substitutes a
// placeholder, scrapes a finance site, or turns a failed provider into news.
//
// ## The interface
// A conforming provider is any object exposing:
//   async getSymbolNews(symbol, { lookbackDays }) -> NewsMetrics
//
// `NewsMetrics` shape (every field always present; a field that cannot
// really be fetched is `null`/`[]`, NEVER fabricated):
//   symbol, asOf, dataAvailable, unavailableReason
//   articles   Array<{ title, description, source, publishedAt, url }>
const axios = require("axios");
const env = require("../../../config/env");
const cikResolver = require("../insiderAgent/cikResolver");

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_LOOKBACK_DAYS = 14;
const PAGE_SIZE = 100;
const SUCCESS_CACHE_TTL_MS = 15 * 60 * 1000;
const FAILURE_CACHE_TTL_MS = 5 * 60 * 1000;
// Shared by the news and sentiment agents in this process: a provider quota
// response for one symbol must not trigger the same requests again moments
// later from the other agent.
const symbolNewsCache = new Map();

function emptyMetrics(symbol, reason) {
  return { symbol, asOf: new Date().toISOString(), dataAvailable: false, unavailableReason: reason, sourceProvider: null, articles: [] };
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function normalizeNewsApiArticles(rawArticles) {
  return (Array.isArray(rawArticles) ? rawArticles : [])
    .filter((article) => article && (article.title || article.description) && article.publishedAt)
    .map((article) => ({
      title: article.title || null,
      description: article.description || null,
      source: article.source?.name || "Unknown source",
      publishedAt: article.publishedAt,
      url: article.url || null,
    }));
}

const COMPANY_SUFFIXES = new Set([
  "inc", "incorporated", "corp", "corporation", "company", "co", "ltd", "limited",
  "plc", "holdings", "holding", "group", "the", "class", "common", "stock",
]);

function normalizeIdentityText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildCompanyIdentityTerms(symbol, companyTitle) {
  const normalizedSymbol = normalizeIdentityText(symbol).replace(/\s+/g, "");
  const terms = normalizeIdentityText(companyTitle)
    .split(/\s+/)
    .filter((token) => token && !COMPANY_SUFFIXES.has(token) && (token.length >= 4 || /\d/.test(token)));

  // A ticker is useful supporting evidence for conventional symbols such as
  // AAPL, but common English words (NOW, ALL, ON, CAT...) are deliberately not
  // accepted on their own. The verified company-name terms remain mandatory
  // whenever the ticker is ambiguous.
  const tickerIsDistinctive = normalizedSymbol.length >= 3 && !/^(all|are|can|cat|for|has|now|on|or|so|it|a|an)$/i.test(normalizedSymbol);
  return { companyTerms: [...new Set(terms)], ticker: tickerIsDistinctive ? normalizedSymbol : null };
}

function isArticleRelevantToCompany(article, symbol, companyTitle) {
  const haystack = ` ${normalizeIdentityText(`${article?.title || ""} ${article?.description || ""}`)} `;
  const { companyTerms, ticker } = buildCompanyIdentityTerms(symbol, companyTitle);
  if (companyTerms.some((term) => haystack.includes(` ${term} `))) return true;
  return Boolean(ticker && haystack.includes(` ${ticker} `));
}

function normalizeFinnhubArticles(rawArticles) {
  return (Array.isArray(rawArticles) ? rawArticles : [])
    .filter((article) => article && (article.headline || article.summary) && Number.isFinite(Number(article.datetime)))
    .map((article) => ({
      title: article.headline || null,
      description: article.summary || null,
      source: article.source || "Finnhub",
      publishedAt: new Date(Number(article.datetime) * 1000).toISOString(),
      url: article.url || null,
    }))
    .slice(0, PAGE_SIZE);
}

function normalizeGdeltArticles(rawArticles) {
  return (Array.isArray(rawArticles) ? rawArticles : [])
    .filter((article) => article?.title && article?.url && article?.seendate)
    .map((article) => {
      const rawDate = String(article.seendate);
      const publishedAt = /^\d{14}$/.test(rawDate)
        ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}T${rawDate.slice(8, 10)}:${rawDate.slice(10, 12)}:${rawDate.slice(12, 14)}Z`
        : new Date(rawDate).toISOString();
      return { title: article.title, description: null, source: article.domain || "GDELT indexed source", publishedAt, url: article.url };
    })
    .slice(0, PAGE_SIZE);
}

async function fetchGdeltCompanyNews(symbol, lookbackDays, timeoutMs) {
  if (!env.GDELT_NEWS_ENABLED) return { articles: [], reason: "GDELT news fallback is disabled." };
  let companyTitle = (await cikResolver.resolveCik(symbol))?.title || null;
  if (!companyTitle && env.FINNHUB_API_KEY) {
    try {
      const profile = await axios.get("https://finnhub.io/api/v1/stock/profile2", {
        params: { symbol: String(symbol || "").toUpperCase(), token: env.FINNHUB_API_KEY },
        timeout: timeoutMs,
      });
      companyTitle = String(profile.data?.name || "").trim() || null;
    } catch {
      // Identity verification is best-effort; an unverified ticker is never
      // sent to GDELT because ticker-only searches are too ambiguous.
    }
  }
  if (!companyTitle) return { articles: [], reason: `No verified company identity is available for GDELT query "${symbol}".` };
  try {
    const response = await axios.get("https://api.gdeltproject.org/api/v2/doc/doc", {
      params: { query: `\"${companyTitle.replace(/\"/g, "")}\" sourcelang:english`, mode: "artlist", format: "json", maxrecords: PAGE_SIZE, timespan: `${Math.max(1, Math.min(90, Number(lookbackDays) || DEFAULT_LOOKBACK_DAYS))}d`, sort: "DateDesc" },
      timeout: timeoutMs,
    });
    const articles = normalizeGdeltArticles(response.data?.articles);
    return articles.length ? { articles, sourceProvider: "GDELT 2.0", reason: null } : { articles: [], reason: `GDELT returned zero usable indexed articles for verified company "${companyTitle}".` };
  } catch (error) {
    return { articles: [], reason: `GDELT request failed: ${error.message}` };
  }
}

async function fetchNewsApiNews(symbol, companyTitle, now, from, timeoutMs) {
  if (!env.NEWS_API_KEY) {
    return { articles: [], reason: "No NEWS_API_KEY configured." };
  }
  if (!companyTitle) {
    return { articles: [], reason: `No verified company identity is available for NewsAPI query "${symbol}"; ticker-only search was skipped as ambiguous.` };
  }

  try {
    const response = await axios.get("https://newsapi.org/v2/everything", {
      params: {
        q: `"${String(companyTitle).replace(/"/g, "")}"`,
        language: "en",
        sortBy: "publishedAt",
        from: toIsoDate(from),
        to: toIsoDate(now),
        pageSize: PAGE_SIZE,
        apiKey: env.NEWS_API_KEY,
      },
      timeout: timeoutMs,
    });
    const articles = normalizeNewsApiArticles(response.data?.articles)
      .filter((article) => isArticleRelevantToCompany(article, symbol, companyTitle));
    return articles.length
      ? { articles, sourceProvider: "NewsAPI", reason: null }
      : { articles: [], reason: `NewsAPI returned zero real articles with usable fields for "${symbol}".` };
  } catch (error) {
    return { articles: [], reason: `NewsAPI request failed: ${error.message}` };
  }
}

async function fetchFinnhubCompanyNews(symbol, now, from, timeoutMs) {
  if (!env.FINNHUB_API_KEY) {
    return { articles: [], reason: "FINNHUB_API_KEY is not configured." };
  }

  try {
    const response = await axios.get("https://finnhub.io/api/v1/company-news", {
      params: {
        symbol: String(symbol || "").toUpperCase(),
        from: toIsoDate(from),
        to: toIsoDate(now),
        token: env.FINNHUB_API_KEY,
      },
      timeout: timeoutMs,
    });
    const articles = normalizeFinnhubArticles(response.data);
    return articles.length
      ? { articles, sourceProvider: "Finnhub company news", reason: null }
      : { articles: [], reason: `Finnhub company-news returned zero usable real articles for "${symbol}".` };
  } catch (error) {
    return { articles: [], reason: `Finnhub company-news request failed: ${error.message}` };
  }
}

async function resolveCompanyTitle(symbol) {
  try {
    return String((await cikResolver.resolveCik(symbol))?.title || "").trim() || null;
  } catch {
    return null;
  }
}

function createNewsSentimentDataProvider({ timeoutMs = DEFAULT_TIMEOUT_MS, identityResolver = resolveCompanyTitle } = {}) {
  async function getSymbolNews(symbol, { lookbackDays = DEFAULT_LOOKBACK_DAYS } = {}) {
    const normalizedSymbol = String(symbol || "").trim().toUpperCase();
    const cacheKey = `${normalizedSymbol}:${lookbackDays}:${env.NEWS_API_KEY}:${env.FINNHUB_API_KEY}:${env.GDELT_NEWS_ENABLED}`;
    const cached = symbolNewsCache.get(cacheKey);
    if (cached && Date.now() - cached.createdAt < cached.ttlMs) {
      return await cached.value;
    }

    const request = (async () => {
    const now = new Date();
    const from = new Date(now.getTime() - lookbackDays * 86400000);
    const companyTitle = env.NEWS_API_KEY ? await identityResolver(normalizedSymbol) : null;
    const primary = await fetchNewsApiNews(normalizedSymbol, companyTitle, now, from, timeoutMs);
    if (primary.articles.length) {
      return { symbol: normalizedSymbol, asOf: now.toISOString(), dataAvailable: true, unavailableReason: null, sourceProvider: primary.sourceProvider, queryIdentity: companyTitle, articles: primary.articles };
    }

    const fallback = await fetchFinnhubCompanyNews(normalizedSymbol, now, from, timeoutMs);
    if (fallback.articles.length) {
      return {
        symbol: normalizedSymbol,
        asOf: now.toISOString(),
        dataAvailable: true,
        unavailableReason: null,
        sourceProvider: fallback.sourceProvider,
        primaryUnavailableReason: primary.reason,
        articles: fallback.articles,
      };
    }

    const publicFallback = await fetchGdeltCompanyNews(normalizedSymbol, lookbackDays, timeoutMs);
    if (publicFallback.articles.length) {
      return {
        symbol: normalizedSymbol, asOf: now.toISOString(), dataAvailable: true, unavailableReason: null,
        sourceProvider: publicFallback.sourceProvider,
        primaryUnavailableReason: `${primary.reason} Finnhub fallback unavailable: ${fallback.reason}`,
        articles: publicFallback.articles,
      };
    }

    return emptyMetrics(normalizedSymbol, `${primary.reason} Finnhub fallback unavailable: ${fallback.reason} Public fallback unavailable: ${publicFallback.reason}`);
    })();

    symbolNewsCache.set(cacheKey, { createdAt: Date.now(), ttlMs: FAILURE_CACHE_TTL_MS, value: request });
    const result = await request;
    symbolNewsCache.set(cacheKey, {
      createdAt: Date.now(),
      ttlMs: result.dataAvailable ? SUCCESS_CACHE_TTL_MS : FAILURE_CACHE_TTL_MS,
      value: Promise.resolve(result),
    });
    return result;
  }

  return { getSymbolNews };
}

module.exports = {
  createNewsSentimentDataProvider,
  emptyMetrics,
  normalizeNewsApiArticles,
  normalizeFinnhubArticles,
  normalizeGdeltArticles,
  buildCompanyIdentityTerms,
  isArticleRelevantToCompany,
};
