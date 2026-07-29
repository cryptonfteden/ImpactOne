// Phase SENTIMENT-AGENT-001 — "Source credibility" and "Source
// diversity", combined into one "Source Quality" output field per the
// mission's own Output list. `TIER1_SOURCES` is a disclosed, hand-set
// list of well-established financial/general news outlets (not a
// claim of any outlet's actual editorial quality — a transparent,
// documented allowlist used consistently, never per-article judgment
// calls). Every count below is real: it only tallies the real
// `source` field NewsAPI returned on each real article.
const TIER1_SOURCES = new Set([
  "Reuters", "Bloomberg", "The Wall Street Journal", "CNBC", "MarketWatch",
  "Barron's", "Financial Times", "Forbes", "Yahoo Finance", "Associated Press",
  "Business Insider", "The New York Times", "Fortune", "Axios",
]);

/**
 * @param {Array<{source:string}>} articles - real articles (pre- or post-scoring, only `source` is used)
 * @returns {{ distinctSourceCount: number, sources: string[], tier1ArticleCount: number, totalArticleCount: number, credibilityScore: number }}
 */
function analyzeSourceQuality(articles) {
  const sources = Array.from(new Set(articles.map((article) => article.source).filter(Boolean)));
  const tier1ArticleCount = articles.filter((article) => TIER1_SOURCES.has(article.source)).length;
  const totalArticleCount = articles.length;

  return {
    distinctSourceCount: sources.length,
    sources,
    tier1ArticleCount,
    totalArticleCount,
    credibilityScore: totalArticleCount > 0 ? Math.round((tier1ArticleCount / totalArticleCount) * 100) : 0,
  };
}

module.exports = { analyzeSourceQuality, TIER1_SOURCES };
