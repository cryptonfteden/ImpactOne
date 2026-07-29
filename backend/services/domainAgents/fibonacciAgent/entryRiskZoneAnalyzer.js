// Phase FIBONACCI-AGENT-001 — "Entry Zone" / "Risk Zone": derived
// entirely from real confluence zones (confluenceZoneAnalyzer.js) that
// sit on the real, trend-consistent side of the real current price —
// never an invented level. For an UP-direction swing, the Entry Zone
// is the nearest real confluence zone BELOW current price (a pullback
// buy zone) and the Risk Zone is the next real zone further below it
// (a natural stop-placement reference); for DOWN, both are mirrored
// above current price. Prefers real high-probability (multi-source)
// zones over single-source ones, falling back honestly when none exist.
const { HIGH_PROBABILITY_MIN_SCORE } = require("./confluenceZoneAnalyzer");

function candidateZones(zones, currentPrice, direction) {
  if (direction === "UP") {
    return zones.filter((zone) => zone.high < currentPrice).sort((a, b) => b.high - a.high); // nearest below, first
  }
  return zones.filter((zone) => zone.low > currentPrice).sort((a, b) => a.low - b.low); // nearest above, first
}

/**
 * @param {{ zones: Array, currentPrice: number|null, direction: "UP"|"DOWN"|null }} params
 * @returns {{ entryZone: object|null, riskZone: object|null, reason: string }}
 */
function determineZones({ zones, currentPrice, direction }) {
  if (!Number.isFinite(currentPrice) || (direction !== "UP" && direction !== "DOWN") || !Array.isArray(zones) || !zones.length) {
    return { entryZone: null, riskZone: null, reason: "Insufficient real data to determine entry/risk zones." };
  }

  const candidates = candidateZones(zones, currentPrice, direction);
  if (!candidates.length) {
    return { entryZone: null, riskZone: null, reason: "No real confluence zone exists on the trend-consistent side of the current price." };
  }

  const highProbability = candidates.filter((zone) => zone.confluenceScore >= HIGH_PROBABILITY_MIN_SCORE);
  const ordered = highProbability.length ? highProbability : candidates;

  const entryZone = ordered[0];
  const riskZone = candidates.find((zone) => zone !== entryZone && (direction === "UP" ? zone.high < entryZone.low : zone.low > entryZone.high)) || null;

  return {
    entryZone,
    riskZone,
    reason: highProbability.length
      ? "Entry zone selected from a real, multi-source high-probability confluence zone."
      : "No multi-source confluence zone was available on this side of price — entry zone falls back to the nearest single-source level.",
  };
}

module.exports = { determineZones };
