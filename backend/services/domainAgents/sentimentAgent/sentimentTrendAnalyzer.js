// Phase SENTIMENT-AGENT-001 — "Sentiment State", "Sentiment Score",
// "Sentiment Trend", "Sentiment Velocity" — all computed from real,
// already-scored articles and the real daily time series
// (sentimentTimeSeriesBuilder.js). Disclosed, hand-set thresholds
// throughout (documented here, never silently assumed).
const POSITIVE_STATE_THRESHOLD = 60;
const NEGATIVE_STATE_THRESHOLD = 40;
const TREND_CHANGE_THRESHOLD = 5; // points (0-100 scale) — smaller real moves count as STABLE

/**
 * @param {Array<{score:number}>} scoredArticles
 * @returns {number} 0-100, higher = more positive
 */
function computeSentimentScore(scoredArticles) {
  if (!scoredArticles.length) return 50; // no real lean — the honest midpoint, not a guess toward either side
  const avg = scoredArticles.reduce((sum, article) => sum + article.score, 0) / scoredArticles.length;
  return Math.round(((avg + 1) / 2) * 100 * 100) / 100;
}

/**
 * @param {number} sentimentScore
 * @returns {"POSITIVE"|"NEUTRAL"|"NEGATIVE"}
 */
function computeSentimentState(sentimentScore) {
  if (sentimentScore >= POSITIVE_STATE_THRESHOLD) return "POSITIVE";
  if (sentimentScore <= NEGATIVE_STATE_THRESHOLD) return "NEGATIVE";
  return "NEUTRAL";
}

function daysWithData(dailySeries) {
  return dailySeries.filter((day) => day.averageScore !== null);
}

function averageOf(days) {
  return days.reduce((sum, day) => sum + day.averageScore, 0) / days.length;
}

/**
 * @param {Array<object>} dailySeries - from sentimentTimeSeriesBuilder.buildDailySeries, oldest-first
 * @returns {{ trend: "IMPROVING"|"STABLE"|"DETERIORATING", velocity: { value: number|null, unit: string, insufficientData: boolean } }}
 */
function analyzeTrendAndVelocity(dailySeries) {
  const withData = daysWithData(dailySeries);
  if (withData.length < 2) {
    return { trend: "STABLE", velocity: { value: null, unit: "score points per day", insufficientData: true } };
  }

  const midpoint = Math.floor(withData.length / 2);
  const priorHalf = withData.slice(0, midpoint);
  const recentHalf = withData.slice(midpoint);
  if (!priorHalf.length || !recentHalf.length) {
    return { trend: "STABLE", velocity: { value: null, unit: "score points per day", insufficientData: true } };
  }

  // Convert [-1,1] averages to the same 0-100 scale computeSentimentScore uses, for an intuitive real unit.
  const priorScore = ((averageOf(priorHalf) + 1) / 2) * 100;
  const recentScore = ((averageOf(recentHalf) + 1) / 2) * 100;
  const delta = recentScore - priorScore;

  // Normalize the delta by the real half-window length (in days) it
  // spans, so velocity is an honest "points per day" rate regardless of
  // how long the overall lookback window is.
  const spanDays = Math.max(1, midpoint);
  const velocityValue = Math.round((delta / spanDays) * 100) / 100;

  let trend = "STABLE";
  if (delta > TREND_CHANGE_THRESHOLD) trend = "IMPROVING";
  else if (delta < -TREND_CHANGE_THRESHOLD) trend = "DETERIORATING";

  return { trend, velocity: { value: velocityValue, unit: "score points per day", insufficientData: false } };
}

module.exports = { computeSentimentScore, computeSentimentState, analyzeTrendAndVelocity, POSITIVE_STATE_THRESHOLD, NEGATIVE_STATE_THRESHOLD, TREND_CHANGE_THRESHOLD };
