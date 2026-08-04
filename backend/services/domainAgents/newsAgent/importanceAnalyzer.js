// Phase NEWS-AGENT-001 — "News importance" → "Importance Score"
// (0-100). A disclosed, hand-set weighted combination (never a naive
// average) of: real freshness (30%), real multi-source confirmation
// (30%), and a real, disclosed keyword-severity hit rate (40%) — high-
// impact real-world event words (bankruptcy, lawsuit, recall,
// acquisition, merger, guidance cut, earnings miss, investigation,
// downgrade, fraud) found in real article titles/descriptions.
const SEVERITY_KEYWORDS = [
  "bankruptcy", "lawsuit", "recall", "acquisition", "merger", "guidance cut",
  "earnings miss", "investigation", "downgrade", "fraud", "restatement",
  "resign", "ceo", "sec probe", "data breach", "hack",
];

const FRESHNESS_WEIGHT = 0.3;
const CONFIRMATION_WEIGHT = 0.3;
const SEVERITY_WEIGHT = 0.4;

function normalize(text) {
  return (text || "").toLowerCase();
}

/**
 * @param {Array<{title:string|null, description:string|null}>} articles - real articles
 * @returns {{ severityScore: number, severityArticleCount: number }}
 */
function analyzeSeverity(articles) {
  if (!articles.length) return { severityScore: 0, severityArticleCount: 0 };

  const severityArticleCount = articles.filter((article) => {
    const text = `${normalize(article.title)} ${normalize(article.description)}`;
    return SEVERITY_KEYWORDS.some((keyword) => text.includes(keyword));
  }).length;

  const severityScore = Math.round((severityArticleCount / articles.length) * 100);
  return { severityScore, severityArticleCount };
}

/**
 * @param {number} freshnessScore - 0-100
 * @param {number} confirmationScore - 0-100
 * @param {Array<object>} articles - real articles
 * @returns {{ importanceScore: number, severityArticleCount: number }}
 */
function analyzeImportance(freshnessScore, confirmationScore, articles) {
  const { severityScore, severityArticleCount } = analyzeSeverity(articles);

  const importanceScore = Math.round(freshnessScore * FRESHNESS_WEIGHT + confirmationScore * CONFIRMATION_WEIGHT + severityScore * SEVERITY_WEIGHT);

  return { importanceScore, severityArticleCount };
}

module.exports = { analyzeImportance, analyzeSeverity, SEVERITY_KEYWORDS, FRESHNESS_WEIGHT, CONFIRMATION_WEIGHT, SEVERITY_WEIGHT };
