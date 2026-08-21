// Phase NEWS-AGENT-001 — the top-level provider abstraction this
// mission requires. Per the mission's own "Reuse existing news
// infrastructure wherever possible," this deliberately REUSES
// SENTIMENT-AGENT-001's own real, already-tested, already-honest
// NewsAPI provider (createNewsSentimentDataProvider from
// ../sentimentAgent/newsSentimentDataProvider.js) rather than building
// a competing NewsAPI client — the exact same real articles this
// mission's own objectives (breaking news, importance, freshness,
// event classification, etc.) are computed over. Adds a real company-
// profile fetch (this agent's own companyProfileProvider.js) in
// parallel, for "Affected Sectors" — one failing never blocks the
// other. Overall `dataAvailable` reflects the real news fetch only
// (the only data this agent's core analysis is built on).
const { createNewsSentimentDataProvider } = require("../sentimentAgent/newsSentimentDataProvider");
const companyProfileProvider = require("./companyProfileProvider");

const defaultNewsSentimentDataProvider = createNewsSentimentDataProvider();

function createNewsDataProvider({ newsProvider = defaultNewsSentimentDataProvider, lookbackDays } = {}) {
  async function getSymbolNewsData(symbol) {
    const [news, profile] = await Promise.all([
      newsProvider.getSymbolNews(symbol, { lookbackDays }),
      companyProfileProvider.getCompanyProfile(symbol),
    ]);

    return {
      symbol: news.symbol,
      asOf: news.asOf,
      dataAvailable: news.dataAvailable,
      unavailableReason: news.dataAvailable ? null : news.unavailableReason,
      sourceProvider: news.sourceProvider || null,
      primaryUnavailableReason: news.primaryUnavailableReason || null,
      articles: news.articles,
      profile,
    };
  }

  return { getSymbolNewsData };
}

module.exports = { createNewsDataProvider };
