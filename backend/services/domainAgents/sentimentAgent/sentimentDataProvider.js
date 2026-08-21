// Phase SENTIMENT-AGENT-001 — the top-level provider abstraction the
// mission requires, composing the three real, independent sources this
// agent needs: real per-symbol news (newsSentimentDataProvider.js),
// honestly-unavailable social sentiment (socialSentimentDataProvider.js
// — never fabricated), and real daily price bars (the existing,
// already-real priceHistoryProvider.js, reused unmodified). Each source
// is fetched independently — a social-data absence never blocks a real
// news-based read, and vice versa.
//
// ## The interface
// A conforming provider is any object exposing:
//   async getSymbolSentimentData(symbol) -> SentimentMetrics
//
// `SentimentMetrics` shape (every field always present; a field that
// cannot really be computed is `null`/`false`, NEVER fabricated):
//   symbol, asOf, dataAvailable, unavailableReason
//   articles          real scored articles (articleSentimentScorer output), [] if unavailable
//   socialAvailable   boolean — always false in this environment (honest, disclosed)
//   socialUnavailableReason string|null
//   priceBars         real daily bars covering the same lookback window, [] if unavailable
//   lookbackDays      number
const priceHistoryProvider = require("../../intelligence/priceHistoryProvider");
const { createNewsSentimentDataProvider } = require("./newsSentimentDataProvider");
const { createSocialSentimentDataProvider } = require("./socialSentimentDataProvider");
const { scoreArticles } = require("./articleSentimentScorer");

const DEFAULT_LOOKBACK_DAYS = 14;

const defaultNewsProvider = createNewsSentimentDataProvider();
const defaultSocialProvider = createSocialSentimentDataProvider();

function createSentimentDataProvider({
  newsProvider = defaultNewsProvider,
  socialProvider = defaultSocialProvider,
  lookbackDays = DEFAULT_LOOKBACK_DAYS,
} = {}) {
  async function getSymbolSentimentData(symbol) {
    const [newsMetrics, socialMetrics, priceBars] = await Promise.all([
      newsProvider.getSymbolNews(symbol, { lookbackDays }),
      socialProvider.getSymbolSocialSentiment(symbol),
      priceHistoryProvider.getDailyBars(symbol, { range: "1mo" }).catch(() => []),
    ]);

    const asOf = new Date().toISOString();

    if (!newsMetrics.dataAvailable) {
      return {
        symbol,
        asOf,
        dataAvailable: false,
        unavailableReason: newsMetrics.unavailableReason,
        sourceProvider: newsMetrics.sourceProvider || null,
        queryIdentity: newsMetrics.queryIdentity || null,
        primaryUnavailableReason: newsMetrics.primaryUnavailableReason || null,
        articles: [],
        socialAvailable: socialMetrics.dataAvailable,
        socialUnavailableReason: socialMetrics.unavailableReason,
        priceBars,
        lookbackDays,
      };
    }

    return {
      symbol,
      asOf,
      dataAvailable: true,
      unavailableReason: null,
      sourceProvider: newsMetrics.sourceProvider || null,
      queryIdentity: newsMetrics.queryIdentity || null,
      primaryUnavailableReason: newsMetrics.primaryUnavailableReason || null,
      articles: scoreArticles(newsMetrics.articles),
      socialAvailable: socialMetrics.dataAvailable,
      socialUnavailableReason: socialMetrics.unavailableReason,
      priceBars: priceBars.slice(-lookbackDays),
      lookbackDays,
    };
  }

  return { getSymbolSentimentData };
}

module.exports = { createSentimentDataProvider, DEFAULT_LOOKBACK_DAYS };
