// Phase NEWS-AGENT-001 — "Breaking news" + "News freshness" →
// "Freshness Score" (0-100). Disclosed time-decay bands over the real
// most-recent real article's `publishedAt` timestamp — never a
// fabricated recency; an empty real article list scores 0.
const BANDS = [
  { maxHours: 6, score: 100 },
  { maxHours: 24, score: 80 },
  { maxHours: 72, score: 50 },
  { maxHours: 168, score: 25 },
];
const STALE_SCORE = 10;

/**
 * @param {Array<{publishedAt:string}>} articles - real articles
 * @param {Date} [now]
 * @returns {{ freshnessScore: number, hoursSinceLatest: number|null, isBreaking: boolean }}
 */
function analyzeFreshness(articles, now = new Date()) {
  if (!articles.length) {
    return { freshnessScore: 0, hoursSinceLatest: null, isBreaking: false };
  }

  const latestTimestamp = Math.max(...articles.map((article) => new Date(article.publishedAt).getTime()).filter(Number.isFinite));
  if (!Number.isFinite(latestTimestamp)) {
    return { freshnessScore: 0, hoursSinceLatest: null, isBreaking: false };
  }

  const hoursSinceLatest = Math.round(((now.getTime() - latestTimestamp) / 3600000) * 100) / 100;
  const band = BANDS.find((candidate) => hoursSinceLatest <= candidate.maxHours);
  const freshnessScore = band ? band.score : STALE_SCORE;
  const isBreaking = hoursSinceLatest <= BANDS[0].maxHours;

  return { freshnessScore, hoursSinceLatest, isBreaking };
}

module.exports = { analyzeFreshness, BANDS, STALE_SCORE };
