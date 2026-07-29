// Phase SHORT-INTEREST-AGENT-001 — "Covering activity". Counts real
// day-over-day DECLINES in the real daily short-volume ratio across
// the recent window — a real, disclosed proxy for short covering
// (shorts closing out reduces real short-selling volume relative to
// total volume on subsequent days). Never a claim about actual
// buy-to-cover share counts, which no free real data source reports.
const HIGH_COVERING_THRESHOLD = 0.7;
const MODERATE_COVERING_THRESHOLD = 0.5;

/**
 * @param {Array<{ shortVolumeRatio: number }>} dailyShortVolume - oldest-first real daily rows
 * @returns {{ classification: "HIGH"|"MODERATE"|"LOW"|"UNKNOWN", decliningDayRatio: number|null, decliningDays: number, totalComparableDays: number }}
 */
function analyzeCoveringActivity(dailyShortVolume) {
  if (dailyShortVolume.length < 2) {
    return { classification: "UNKNOWN", decliningDayRatio: null, decliningDays: 0, totalComparableDays: 0 };
  }

  let decliningDays = 0;
  const totalComparableDays = dailyShortVolume.length - 1;
  for (let i = 1; i < dailyShortVolume.length; i += 1) {
    if (dailyShortVolume[i].shortVolumeRatio < dailyShortVolume[i - 1].shortVolumeRatio) decliningDays += 1;
  }

  const decliningDayRatio = Math.round((decliningDays / totalComparableDays) * 100) / 100;

  let classification = "LOW";
  if (decliningDayRatio >= HIGH_COVERING_THRESHOLD) classification = "HIGH";
  else if (decliningDayRatio >= MODERATE_COVERING_THRESHOLD) classification = "MODERATE";

  return { classification, decliningDayRatio, decliningDays, totalComparableDays };
}

module.exports = { analyzeCoveringActivity, HIGH_COVERING_THRESHOLD, MODERATE_COVERING_THRESHOLD };
