// Phase SENTIMENT-AGENT-001 — scores each real article's title+
// description via the disclosed keyword lexicon, classifying it
// POSITIVE/NEGATIVE/NEUTRAL from real word-hit counts (never from the
// raw score's sign alone, which would call a 0/0 article "neutral" but
// also miscall a tiny nonzero score "directional" — comparing hit
// counts directly is the more honest rule).
const { scoreText } = require("./sentimentLexicon");

/**
 * @param {{ title: string|null, description: string|null }} article
 * @returns {{ classification: "POSITIVE"|"NEGATIVE"|"NEUTRAL", score: number, positiveHits: number, negativeHits: number }}
 */
function scoreArticle(article) {
  const text = [article.title, article.description].filter(Boolean).join(". ");
  const { positiveHits, negativeHits, score } = scoreText(text);

  let classification = "NEUTRAL";
  if (positiveHits > negativeHits) classification = "POSITIVE";
  else if (negativeHits > positiveHits) classification = "NEGATIVE";

  return { classification, score, positiveHits, negativeHits };
}

/**
 * @param {Array<object>} articles - real articles from newsSentimentDataProvider
 * @returns {Array<object>} each article merged with its real scoring fields
 */
function scoreArticles(articles) {
  return articles.map((article) => ({ ...article, ...scoreArticle(article) }));
}

module.exports = { scoreArticle, scoreArticles };
