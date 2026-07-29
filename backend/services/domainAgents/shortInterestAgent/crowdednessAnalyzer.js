// Phase SHORT-INTEREST-AGENT-001 — "Crowded short positioning" →
// "Crowdedness Score" (0-100). Real, disclosed classification of how
// elevated the most recent real short-volume ratio is versus a fixed,
// disclosed reference scale — never a claim about the true crowd of
// distinct short sellers (which no free data source reports), only
// about how much of real recent trading volume was real short-sale
// volume.
const REFERENCE_MAX_RATIO = 0.6; // a disclosed, hand-set reference ceiling: a 60%+ short-volume ratio is treated as maximally crowded

/**
 * @param {Array<{ shortVolumeRatio: number }>} dailyShortVolume - oldest-first real daily rows
 * @returns {{ crowdednessScore: number, mostRecentRatio: number|null }}
 */
function analyzeCrowdedness(dailyShortVolume) {
  if (!dailyShortVolume.length) {
    return { crowdednessScore: 0, mostRecentRatio: null };
  }

  const mostRecentRatio = dailyShortVolume[dailyShortVolume.length - 1].shortVolumeRatio;
  const crowdednessScore = Math.round(Math.max(0, Math.min(1, mostRecentRatio / REFERENCE_MAX_RATIO)) * 100);

  return { crowdednessScore, mostRecentRatio };
}

module.exports = { analyzeCrowdedness, REFERENCE_MAX_RATIO };
