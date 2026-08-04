// Phase EARNINGS-AGENT-001 — pure, deterministic scoring over real,
// already-reported quarterly EPS actual/estimate/surprise figures
// (EarningsMetrics.epsHistory). No projection, no fabricated trend
// beyond what the real reported history actually shows.
const SURPRISE_CAP_PERCENT = 20; // a +/-20% EPS surprise is treated as maximal for scoring purposes

function average(numbers) {
  if (!numbers.length) return null;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

function stdDev(numbers) {
  if (numbers.length < 2) return 0;
  const mean = average(numbers);
  const variance = average(numbers.map((n) => (n - mean) ** 2));
  return Math.sqrt(variance);
}

/**
 * "Historical earnings consistency" — a real, rule-based rating from
 * the real beat rate and real surprise dispersion (standard deviation)
 * across whatever reported quarters are available. `UNKNOWN` when no
 * real surprise history exists, never a guessed default.
 */
function analyzeConsistency(surprisePercents) {
  if (!surprisePercents.length) {
    return { rating: "UNKNOWN", beatRate: null, missRate: null, stdDev: null, sampleSize: 0 };
  }
  const beats = surprisePercents.filter((value) => value > 0).length;
  const misses = surprisePercents.filter((value) => value < 0).length;
  const beatRate = beats / surprisePercents.length;
  const missRate = misses / surprisePercents.length;
  const deviation = stdDev(surprisePercents);

  let rating = "LOW";
  if (beatRate >= 0.75 && deviation <= 10) rating = "HIGH";
  else if (beatRate >= 0.5) rating = "MODERATE";

  return { rating, beatRate, missRate, stdDev: deviation, sampleSize: surprisePercents.length };
}

/**
 * @param {import("./earningsDataProvider").EarningsMetrics} metrics
 * @returns {{ surpriseScore: number|null, consistency: object, contributions: object }}
 */
function analyzeSurprise(metrics) {
  if (!metrics?.dataAvailable) {
    return { surpriseScore: null, consistency: { rating: "UNKNOWN", beatRate: null, missRate: null, stdDev: null, sampleSize: 0 }, contributions: {} };
  }

  const surprisePercents = metrics.epsHistory.map((quarter) => quarter.surprisePercent).filter((value) => Number.isFinite(value));
  const consistency = analyzeConsistency(surprisePercents);

  if (!surprisePercents.length) {
    return { surpriseScore: null, consistency, contributions: {} };
  }

  const avgSurprise = average(surprisePercents);
  const clamped = Math.max(-SURPRISE_CAP_PERCENT, Math.min(SURPRISE_CAP_PERCENT, avgSurprise));
  const mappedAvg = ((clamped + SURPRISE_CAP_PERCENT) / (SURPRISE_CAP_PERCENT * 2)) * 100;
  const beatRateComponent = (consistency.beatRate ?? 0) * 100;

  const surpriseScore = Math.round(0.7 * mappedAvg + 0.3 * beatRateComponent);
  return {
    surpriseScore,
    consistency,
    contributions: { avgSurprisePercent: avgSurprise, beatRate: consistency.beatRate },
  };
}

module.exports = { analyzeSurprise, analyzeConsistency, SURPRISE_CAP_PERCENT };
