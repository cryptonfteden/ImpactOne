// Phase FIBONACCI-AGENT-001 — "Confluence Zones" / "Confluence Score" /
// "High Probability Zones": real levels from independent real sources
// (Fibonacci retracement, Fibonacci extension, dynamic pivot
// support/resistance) are clustered wherever they land within a real
// price tolerance of each other. A zone's `confluenceScore` is the
// count of distinct real sources agreeing there — never a fabricated
// probability, just an honest tally of real agreement. Optional real
// price-reaction data (from priceReactionHistory.js) raises a zone's
// score further only when it reflects real historical respect.
const DEFAULT_TOLERANCE_RATIO = 0.015; // 1.5% of price — levels within this band are treated as "the same zone"
const HIGH_PROBABILITY_MIN_SCORE = 2;

/**
 * @param {Array<{ price: number, source: string }>} levels - flattened from every real source
 * @param {{ toleranceRatio?: number }} [options]
 * @returns {Array<{ centerPrice: number, low: number, high: number, confluenceScore: number, sources: string[] }>}
 */
function findConfluenceZones(levels, { toleranceRatio = DEFAULT_TOLERANCE_RATIO } = {}) {
  const valid = levels.filter((level) => Number.isFinite(level?.price)).slice().sort((a, b) => a.price - b.price);
  if (!valid.length) return [];

  const zones = [];
  let currentCluster = [valid[0]];

  for (let i = 1; i < valid.length; i++) {
    const previous = currentCluster[currentCluster.length - 1];
    const tolerance = Math.abs(previous.price) * toleranceRatio;
    if (valid[i].price - previous.price <= tolerance) {
      currentCluster.push(valid[i]);
    } else {
      zones.push(currentCluster);
      currentCluster = [valid[i]];
    }
  }
  zones.push(currentCluster);

  return zones.map((cluster) => {
    const prices = cluster.map((level) => level.price);
    const distinctSources = Array.from(new Set(cluster.map((level) => level.source)));
    return {
      centerPrice: prices.reduce((sum, price) => sum + price, 0) / prices.length,
      low: Math.min(...prices),
      high: Math.max(...prices),
      confluenceScore: distinctSources.length,
      sources: distinctSources,
    };
  });
}

function selectHighProbabilityZones(zones, minScore = HIGH_PROBABILITY_MIN_SCORE) {
  return zones.filter((zone) => zone.confluenceScore >= minScore).sort((a, b) => b.confluenceScore - a.confluenceScore);
}

module.exports = { findConfluenceZones, selectHighProbabilityZones, HIGH_PROBABILITY_MIN_SCORE };
