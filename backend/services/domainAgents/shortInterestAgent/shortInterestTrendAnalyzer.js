// Phase SHORT-INTEREST-AGENT-001 — "Short interest trend" / "Historical
// short pressure". Compares the real average daily short-volume ratio
// (shortVolume/totalVolume — this agent's disclosed proxy for short-
// selling pressure, see finraShortVolumeDataProvider.js's own header)
// across the first vs. second half of the real recent window.
const TREND_CHANGE_THRESHOLD = 0.02; // a real 2-percentage-point average swing before calling it a real trend, not noise

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * @param {Array<{ shortVolumeRatio: number }>} dailyShortVolume - oldest-first real daily rows
 * @returns {{ trend: "INCREASING"|"DECREASING"|"STABLE"|"UNKNOWN", priorAvgRatio: number|null, recentAvgRatio: number|null, delta: number|null }}
 */
function analyzeShortInterestTrend(dailyShortVolume) {
  if (dailyShortVolume.length < 2) {
    return { trend: "UNKNOWN", priorAvgRatio: null, recentAvgRatio: null, delta: null };
  }

  const midpoint = Math.floor(dailyShortVolume.length / 2);
  const priorHalf = dailyShortVolume.slice(0, midpoint);
  const recentHalf = dailyShortVolume.slice(midpoint);

  const priorAvgRatio = Math.round(average(priorHalf.map((day) => day.shortVolumeRatio)) * 10000) / 10000;
  const recentAvgRatio = Math.round(average(recentHalf.map((day) => day.shortVolumeRatio)) * 10000) / 10000;
  const delta = Math.round((recentAvgRatio - priorAvgRatio) * 10000) / 10000;

  let trend = "STABLE";
  if (delta > TREND_CHANGE_THRESHOLD) trend = "INCREASING";
  else if (delta < -TREND_CHANGE_THRESHOLD) trend = "DECREASING";

  return { trend, priorAvgRatio, recentAvgRatio, delta };
}

module.exports = { analyzeShortInterestTrend, TREND_CHANGE_THRESHOLD };
