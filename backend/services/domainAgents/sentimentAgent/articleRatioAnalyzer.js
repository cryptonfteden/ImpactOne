// Phase SENTIMENT-AGENT-001 — "Positive/negative article ratio",
// counted directly from each real article's own classification
// (articleSentimentScorer.js). Honestly reports `ratio: null` (never a
// fabricated Infinity or 0) when there are zero real negative articles
// to divide by — the counts themselves are always real and always
// present regardless.
/**
 * @param {Array<{classification:string}>} scoredArticles
 * @returns {{ positiveCount: number, negativeCount: number, neutralCount: number, ratio: number|null }}
 */
function analyzeArticleRatio(scoredArticles) {
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;

  for (const article of scoredArticles) {
    if (article.classification === "POSITIVE") positiveCount += 1;
    else if (article.classification === "NEGATIVE") negativeCount += 1;
    else neutralCount += 1;
  }

  return {
    positiveCount,
    negativeCount,
    neutralCount,
    ratio: negativeCount > 0 ? Math.round((positiveCount / negativeCount) * 100) / 100 : null,
  };
}

module.exports = { analyzeArticleRatio };
