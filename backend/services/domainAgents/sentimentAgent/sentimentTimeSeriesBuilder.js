// Phase SENTIMENT-AGENT-001 — buckets real, already-scored articles by
// their real `publishedAt` date into a real daily time series over the
// requested lookback window. This is what "Sentiment Trend" and
// "Sentiment Velocity" are computed from — no persistence layer is
// needed since every article already carries its own real timestamp.
function dateKeyOf(isoTimestamp) {
  return isoTimestamp.slice(0, 10);
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * @param {Array<object>} scoredArticles - from articleSentimentScorer.scoreArticles
 * @param {{ lookbackDays?: number, asOf?: Date }} [options]
 * @returns {Array<{ date: string, articleCount: number, averageScore: number|null }>} oldest-first, one entry per real calendar day in the window
 */
function buildDailySeries(scoredArticles, { lookbackDays = 14, asOf = new Date() } = {}) {
  const byDate = new Map();
  for (const article of scoredArticles) {
    if (!article.publishedAt) continue;
    const key = dateKeyOf(article.publishedAt);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key).push(article.score);
  }

  const series = [];
  for (let i = lookbackDays - 1; i >= 0; i -= 1) {
    const day = new Date(asOf.getTime() - i * 86400000);
    const key = toIsoDate(day);
    const scores = byDate.get(key) || [];
    series.push({
      date: key,
      articleCount: scores.length,
      averageScore: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null,
    });
  }
  return series;
}

module.exports = { buildDailySeries };
