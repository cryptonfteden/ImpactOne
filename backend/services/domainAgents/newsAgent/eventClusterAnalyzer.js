const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "in", "is", "it", "its",
  "of", "on", "or", "that", "the", "this", "to", "was", "will", "with", "after", "amid", "says", "said",
  "stock", "stocks", "shares", "company", "inc", "corp", "corporation",
]);

function tokenize(article) {
  return `${article?.title || ""} ${article?.description || ""}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.replace(/^-+|-+$/g, ""))
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

function overlapScore(left, right) {
  const a = new Set(left);
  const b = new Set(right);
  if (!a.size || !b.size) return { shared: 0, score: 0 };
  const shared = [...a].filter((token) => b.has(token)).length;
  return { shared, score: shared / Math.min(a.size, b.size) };
}

function sameEvent(leftTokens, rightTokens) {
  const { shared, score } = overlapScore(leftTokens, rightTokens);
  return shared >= 3 && score >= 0.3;
}

function buildEventClusters(articles = []) {
  const clusters = [];

  for (const article of articles) {
    const tokens = tokenize(article);
    let cluster = clusters.find((candidate) => candidate.tokenSets.some((known) => sameEvent(tokens, known)));
    if (!cluster) {
      cluster = { articles: [], tokenSets: [] };
      clusters.push(cluster);
    }
    cluster.articles.push(article);
    cluster.tokenSets.push(tokens);
  }

  return clusters
    .map((cluster) => {
      const sources = [...new Set(cluster.articles.map((article) => article.source).filter(Boolean))];
      const sourceLinks = cluster.articles.filter((article) => /^https?:\/\//i.test(String(article.url || ""))).length;
      const latestAt = cluster.articles
        .map((article) => Date.parse(article.publishedAt || article.published_at || ""))
        .filter(Number.isFinite)
        .sort((a, b) => b - a)[0];
      return {
        articleCount: cluster.articles.length,
        sourceCount: sources.length,
        sources,
        sourceLinkedCount: sourceLinks,
        latestAt: Number.isFinite(latestAt) ? new Date(latestAt).toISOString() : null,
        articles: cluster.articles,
      };
    })
    .sort((a, b) => b.sourceCount - a.sourceCount || b.articleCount - a.articleCount);
}

module.exports = { buildEventClusters, tokenize, sameEvent };
