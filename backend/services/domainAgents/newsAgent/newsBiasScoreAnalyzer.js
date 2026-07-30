// Phase NEWS-AGENT-001 — "News Bias" + "News Score". Reuses
// SENTIMENT-AGENT-001's own real, deterministic, keyword-lexicon-based
// `scoreArticles()` (per "reuse existing news infrastructure wherever
// possible") to classify each real article POSITIVE/NEGATIVE/NEUTRAL,
// then combines real hit counts across every real article into a
// disclosed News Score (-100..100) — never a naive average of each
// article's own already-computed score, since that would let a handful
// of high-magnitude articles dominate; this instead weighs by real
// article-level classification counts.
const { scoreArticles } = require("../sentimentAgent/articleSentimentScorer");

const NEUTRAL_BAND = 15;

function biasFromScore(score) {
  if (score > NEUTRAL_BAND) return "BULLISH";
  if (score < -NEUTRAL_BAND) return "BEARISH";
  return "NEUTRAL";
}

/**
 * @param {Array<{title:string|null, description:string|null}>} articles - real articles
 * @returns {{ newsBias: "BULLISH"|"NEUTRAL"|"BEARISH"|"UNKNOWN", newsScore: number|null, positiveCount: number, negativeCount: number, neutralCount: number }}
 */
function analyzeNewsBiasScore(articles) {
  if (!articles.length) {
    return { newsBias: "UNKNOWN", newsScore: null, positiveCount: 0, negativeCount: 0, neutralCount: 0 };
  }

  const scored = scoreArticles(articles);
  const positiveCount = scored.filter((article) => article.classification === "POSITIVE").length;
  const negativeCount = scored.filter((article) => article.classification === "NEGATIVE").length;
  const neutralCount = scored.filter((article) => article.classification === "NEUTRAL").length;

  const newsScore = Math.round(((positiveCount - negativeCount) / articles.length) * 100);

  return { newsBias: biasFromScore(newsScore), newsScore, positiveCount, negativeCount, neutralCount };
}

module.exports = { analyzeNewsBiasScore, NEUTRAL_BAND };
