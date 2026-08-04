// Phase SENTIMENT-AGENT-001 — the real, per-symbol news provider
// abstraction. Deliberately does NOT reuse services/newsService.js:
// that service returns a static, fabricated fallback article when
// NEWS_API_KEY is unset (fine for a generic "finance news" widget, but
// this mission explicitly requires "Never fabricate ... news data.
// Return honest null/unavailable fields where no real source exists.")
// This provider instead calls NewsAPI directly and honestly reports
// `dataAvailable: false` whenever a key is missing, the request fails,
// or zero real articles come back — never substituting a placeholder.
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

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_LOOKBACK_DAYS = 14;
const PAGE_SIZE = 100;

function emptyMetrics(symbol, reason) {
  return { symbol, asOf: new Date().toISOString(), dataAvailable: false, unavailableReason: reason, articles: [] };
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function createNewsSentimentDataProvider({ timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  async function getSymbolNews(symbol, { lookbackDays = DEFAULT_LOOKBACK_DAYS } = {}) {
    if (!env.NEWS_API_KEY) {
      return emptyMetrics(symbol, "No NEWS_API_KEY configured — real per-symbol news sentiment cannot be computed.");
    }

    const now = new Date();
    const from = new Date(now.getTime() - lookbackDays * 86400000);

    try {
      const response = await axios.get("https://newsapi.org/v2/everything", {
        params: {
          q: symbol,
          language: "en",
          sortBy: "publishedAt",
          from: toIsoDate(from),
          to: toIsoDate(now),
          pageSize: PAGE_SIZE,
          apiKey: env.NEWS_API_KEY,
        },
        timeout: timeoutMs,
      });

      const rawArticles = response.data?.articles || [];
      if (!rawArticles.length) {
        return emptyMetrics(symbol, `NewsAPI returned zero real articles for "${symbol}" in the last ${lookbackDays} days.`);
      }

      const articles = rawArticles
        .filter((article) => article && (article.title || article.description) && article.publishedAt)
        .map((article) => ({
          title: article.title || null,
          description: article.description || null,
          source: article.source?.name || "Unknown source",
          publishedAt: article.publishedAt,
          url: article.url || null,
        }));

      if (!articles.length) {
        return emptyMetrics(symbol, `NewsAPI returned articles for "${symbol}" but none had usable title/description/publishedAt fields.`);
      }

      return { symbol, asOf: now.toISOString(), dataAvailable: true, unavailableReason: null, articles };
    } catch (error) {
      return emptyMetrics(symbol, `NewsAPI request failed: ${error.message}`);
    }
  }

  return { getSymbolNews };
}

module.exports = { createNewsSentimentDataProvider, emptyMetrics };
