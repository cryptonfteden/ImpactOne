// Sprint 42 — CIO Scorecard.
//
// Tracks the recommendation engine's overall real accuracy, broken down by
// action, plus false positives/negatives and average alpha — all derived
// from real graded outcomes, never a synthesized number. This codebase's
// recommendation engine only ever generates BUY/REDUCE/EXIT (see
// RecommendationAction) — it has never produced a HOLD recommendation, so
// holdAccuracy is honestly reported as unavailable rather than a
// fabricated 0 or N/A dressed up as a real metric.
const { loadGradedRows } = require("./scorecardDataSource");

function round(value, decimals = 2) {
  return Number.isFinite(value) ? Number(value.toFixed(decimals)) : null;
}

function accuracyFor(byAction, action) {
  const bucket = byAction[action];
  return bucket && bucket.total ? round((bucket.wins / bucket.total) * 100) : null;
}

async function getCioScorecard({ windowDays } = {}) {
  const rows = await loadGradedRows({ sinceDays: windowDays });

  let correct = 0;
  let total = 0;
  let falsePositives = 0; // BUY that went the wrong way (predicted up, price fell)
  let falseNegatives = 0; // REDUCE/EXIT that went the wrong way (predicted down, price rose)
  let alphaSum = 0;
  let alphaCount = 0;
  const byAction = {};

  for (const { outcome, recommendation } of rows) {
    const windowReturnPct = Number(outcome.windowReturnPct);
    if (!Number.isFinite(windowReturnPct) || outcome.directionCorrect === null) continue;

    total += 1;
    const action = recommendation.action;
    byAction[action] = byAction[action] || { wins: 0, total: 0 };
    byAction[action].total += 1;
    if (outcome.directionCorrect) {
      correct += 1;
      byAction[action].wins += 1;
    } else if (action === "BUY") {
      falsePositives += 1;
    } else if (action === "REDUCE" || action === "EXIT") {
      falseNegatives += 1;
    }

    const signedReturn = action === "BUY" ? windowReturnPct : -windowReturnPct;
    alphaSum += signedReturn;
    alphaCount += 1;
  }

  return {
    windowDays: windowDays || null,
    generatedAt: new Date().toISOString(),
    sampleSize: total,
    overallAccuracy: total ? round((correct / total) * 100) : null,
    buyAccuracy: accuracyFor(byAction, "BUY"),
    holdAccuracy: null, // honest — this engine has never generated a HOLD recommendation
    reduceAccuracy: accuracyFor(byAction, "REDUCE"),
    exitAccuracy: accuracyFor(byAction, "EXIT"),
    falsePositives,
    falseNegatives,
    averageAlphaPct: alphaCount ? round(alphaSum / alphaCount) : null,
  };
}

module.exports = { getCioScorecard };
