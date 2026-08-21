// Phase AI-ENGINE-002.1 — Market Sentiment Engine foundation. The
// confidence-weighted rollup (mission §3) — the one place available
// dimension readings are combined into the canonical OVERALL reading.
// Pure functions only, deterministic given identical input (no
// randomness, no wall-clock reads beyond an explicitly-passed `now`).
const { clamp } = require("../../utils/portfolioRiskMetrics");
const { MIN_CONTRIBUTOR_BREADTH, MAX_SINGLE_DIMENSION_WEIGHT, TOTAL_DIMENSION_COUNT } = require("./marketSentimentDimensions");

/**
 * Caps any single weight at `maxWeight` and redistributes the excess
 * proportionally among the remaining (not yet capped) weights, then
 * repeats until no weight exceeds the cap or every weight is capped.
 * Deterministic and pure — same input always produces the same output,
 * regardless of input order (order only affects which array index holds
 * which value, not the resulting weight values themselves).
 */
function capAndRedistributeWeights(rawWeights, maxWeight) {
  const weights = [...rawWeights];
  const locked = weights.map(() => false);

  for (let iteration = 0; iteration < weights.length; iteration += 1) {
    const unlockedIdx = weights.map((_, index) => index).filter((index) => !locked[index]);
    if (!unlockedIdx.length) break;

    const lockedSum = weights.reduce((sum, weight, index) => (locked[index] ? sum + weight : sum), 0);
    const budget = 1 - lockedSum;
    const unlockedSum = unlockedIdx.reduce((sum, index) => sum + weights[index], 0);

    let anyNewlyCapped = false;
    for (const index of unlockedIdx) {
      const share = unlockedSum > 0 ? weights[index] / unlockedSum : 1 / unlockedIdx.length;
      const proposed = share * budget;
      if (proposed > maxWeight + 1e-9) {
        weights[index] = maxWeight;
        locked[index] = true;
        anyNewlyCapped = true;
      }
    }

    if (!anyNewlyCapped) {
      const finalUnlockedIdx = weights.map((_, index) => index).filter((index) => !locked[index]);
      const finalLockedSum = weights.reduce((sum, weight, index) => (locked[index] ? sum + weight : sum), 0);
      const finalBudget = 1 - finalLockedSum;
      const finalUnlockedSum = finalUnlockedIdx.reduce((sum, index) => sum + weights[index], 0);
      for (const index of finalUnlockedIdx) {
        weights[index] = finalUnlockedSum > 0 ? (weights[index] / finalUnlockedSum) * finalBudget : finalBudget / finalUnlockedIdx.length;
      }
      break;
    }
  }

  return weights;
}

/**
 * Combines whichever component readings are actually available this run
 * into one OVERALL reading. Enforces every rule in mission §3:
 *  - no single dimension may dominate (MAX_SINGLE_DIMENSION_WEIGHT cap)
 *  - minimum contributor breadth (MIN_CONTRIBUTOR_BREADTH available
 *    dimensions required, else the overall score is honestly null)
 *  - null-not-zero (an unavailable dimension contributes zero WEIGHT,
 *    never a zero SCORE blended in)
 *  - degraded confidence when inputs are missing (the (available/8)*60
 *    ceiling term)
 *  - deterministic output (dimensions sorted alphabetically before
 *    weighting, so identical input always produces identical contributors
 *    ordering and identical numbers)
 */
function computeRollup({ dimensionReadings = [] } = {}) {
  const sorted = [...dimensionReadings].sort((readingA, readingB) => readingA.dimension.localeCompare(readingB.dimension));
  const available = sorted.filter((reading) => !reading.unavailable && Number.isFinite(reading.score) && Number.isFinite(reading.confidence));
  const missingInputs = sorted.flatMap((reading) => [
    ...(reading.unavailable ? [`${reading.dimension}: ${reading.reason}`] : []),
    ...((reading.missingInputs || []).map((input) => `${reading.dimension}: ${input}`)),
  ]);

  if (available.length < MIN_CONTRIBUTOR_BREADTH) {
    return {
      score: null,
      confidence: null,
      contributors: [],
      missingInputs: [...missingInputs, `OVERALL: fewer than ${MIN_CONTRIBUTOR_BREADTH} dimensions are available (${available.length} available) — insufficient breadth to compute an honest overall score.`],
    };
  }

  const totalConfidence = available.reduce((sum, reading) => sum + reading.confidence, 0);
  const rawWeights = available.map((reading) => (totalConfidence > 0 ? reading.confidence / totalConfidence : 1 / available.length));
  const finalWeights = capAndRedistributeWeights(rawWeights, MAX_SINGLE_DIMENSION_WEIGHT);

  const score = clamp(Math.round(available.reduce((sum, reading, index) => sum + reading.score * finalWeights[index], 0)), 0, 100);
  const averageAvailableConfidence = totalConfidence / available.length;
  const confidence = clamp(Math.round((available.length / TOTAL_DIMENSION_COUNT) * 60 + averageAvailableConfidence * 0.4), 0, 100);

  const contributors = available.map((reading, index) => ({
    dimension: reading.dimension,
    score: reading.score,
    confidence: reading.confidence,
    weightApplied: Math.round(finalWeights[index] * 10000) / 10000,
    contributionToScore: Math.round(reading.score * finalWeights[index] * 100) / 100,
  }));

  return { score, confidence, contributors, missingInputs };
}

const TREND_STABLE_THRESHOLD = 2;

/**
 * Computes a trend from real persisted history — never interpolated.
 * `priorSnapshots` must already be sorted most-recent-first and contain
 * only real captured rows (the caller is the repository/service layer;
 * this function is a pure comparison).
 */
function computeTrendDirection(currentScore, referenceScore) {
  if (!Number.isFinite(currentScore) || !Number.isFinite(referenceScore)) {
    return { direction: "INSUFFICIENT_HISTORY", changeAbs: null, changePct: null };
  }
  const changeAbs = Math.round((currentScore - referenceScore) * 100) / 100;
  const changePct = referenceScore !== 0 ? Math.round((changeAbs / referenceScore) * 10000) / 100 : null;
  const direction = Math.abs(changeAbs) < TREND_STABLE_THRESHOLD ? "STABLE" : changeAbs > 0 ? "IMPROVING" : "DETERIORATING";
  return { direction, changeAbs, changePct };
}

function computeTrend(currentScore, priorSnapshotsSortedDesc = []) {
  if (!Number.isFinite(currentScore)) {
    return {
      daily: { direction: "INSUFFICIENT_HISTORY", changeAbs: null, changePct: null },
      weekly: { direction: "INSUFFICIENT_HISTORY", changeAbs: null, changePct: null },
    };
  }

  const withScore = priorSnapshotsSortedDesc.filter((snapshot) => Number.isFinite(snapshot.score));

  const daily = withScore.length >= 1 ? computeTrendDirection(currentScore, withScore[0].score) : { direction: "INSUFFICIENT_HISTORY", changeAbs: null, changePct: null };
  const weekly = withScore.length >= 5 ? computeTrendDirection(currentScore, withScore[4].score) : { direction: "INSUFFICIENT_HISTORY", changeAbs: null, changePct: null };

  return { daily, weekly };
}

module.exports = {
  capAndRedistributeWeights,
  computeRollup,
  computeTrendDirection,
  computeTrend,
  TREND_STABLE_THRESHOLD,
};
