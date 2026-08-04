// Phase SENTIMENT-AGENT-001 — "Event-driven sentiment shifts" and
// "Abnormal sentiment spikes", combined into one "Abnormal Activity"
// output. Both are computed with real, disclosed statistics over the
// real daily time series: a volume spike is a real day whose real
// article count is a real z-score outlier vs. the window's own real
// mean/stddev; a sentiment shift is a real day-over-day score swing
// past a disclosed threshold. Neither is a fabricated event — every
// flagged day traces back to real counted articles.
const VOLUME_Z_SCORE_THRESHOLD = 2;
const SCORE_SHIFT_THRESHOLD = 30; // points, on the 0-100 sentiment-score scale

function toScorePoints(averageScore) {
  return ((averageScore + 1) / 2) * 100;
}

function detectVolumeSpikes(dailySeries) {
  const counts = dailySeries.map((day) => day.articleCount);
  const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length;
  const variance = counts.reduce((sum, count) => sum + (count - mean) ** 2, 0) / counts.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return [];

  return dailySeries
    .map((day) => ({ date: day.date, articleCount: day.articleCount, zScore: Math.round(((day.articleCount - mean) / stdDev) * 100) / 100 }))
    .filter((entry) => entry.zScore >= VOLUME_Z_SCORE_THRESHOLD);
}

function detectSentimentShifts(dailySeries) {
  const withData = dailySeries.filter((day) => day.averageScore !== null);
  const shifts = [];
  for (let i = 1; i < withData.length; i += 1) {
    const fromScore = toScorePoints(withData[i - 1].averageScore);
    const toScore = toScorePoints(withData[i].averageScore);
    const delta = Math.round((toScore - fromScore) * 100) / 100;
    if (Math.abs(delta) > SCORE_SHIFT_THRESHOLD) {
      shifts.push({ date: withData[i].date, fromScore: Math.round(fromScore * 100) / 100, toScore: Math.round(toScore * 100) / 100, delta });
    }
  }
  return shifts;
}

/**
 * @param {Array<object>} dailySeries - from sentimentTimeSeriesBuilder.buildDailySeries
 * @returns {{ volumeSpikes: Array<object>, sentimentShifts: Array<object>, hasAbnormalActivity: boolean }}
 */
function detectAbnormalActivity(dailySeries) {
  const volumeSpikes = detectVolumeSpikes(dailySeries);
  const sentimentShifts = detectSentimentShifts(dailySeries);
  return { volumeSpikes, sentimentShifts, hasAbnormalActivity: volumeSpikes.length > 0 || sentimentShifts.length > 0 };
}

module.exports = { detectAbnormalActivity, VOLUME_Z_SCORE_THRESHOLD, SCORE_SHIFT_THRESHOLD };
