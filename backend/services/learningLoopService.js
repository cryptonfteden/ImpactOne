// Sprint 30 — Personal Intelligence Layer, Priority 3 (Learning Loop).
// "Use RecommendationFeedback. Use Outcome history. Use Theme evolution.
// Generate internal learning signals. Never allow immediate feedback to
// bias today's recommendations."
//
// This module is deliberately read-only and one-directional: it is never
// imported by autonomousRecommendationEngine.js (the actual recommendation
// generation/scoring path) or by personalIntelligenceService.js (the
// ranking path) — grep confirms zero references either direction. It
// exists purely to surface what the platform has learned, for internal
// (developer-console) visibility, exactly like qualityDashboardService,
// whose outcome aggregation it reuses rather than recomputing hit rate a
// second way.
const autonomousRecommendationRepository = require("./autonomousRecommendationRepository");
const qualityDashboardService = require("./qualityDashboardService");
const themeIntelligenceService = require("./themeIntelligenceService");

function aggregateFeedbackSignals(feedbackRows) {
  const byType = {};
  const bySymbol = new Map();

  for (const row of feedbackRows) {
    byType[row.feedbackType] = (byType[row.feedbackType] || 0) + 1;
    const symbol = row.recommendation?.symbol;
    if (!symbol) continue;
    if (!bySymbol.has(symbol)) bySymbol.set(symbol, { symbol, useful: 0, notUseful: 0, total: 0 });
    const entry = bySymbol.get(symbol);
    entry.total += 1;
    if (row.feedbackType === "USEFUL") entry.useful += 1;
    if (row.feedbackType === "NOT_USEFUL") entry.notUseful += 1;
  }

  const symbolEntries = Array.from(bySymbol.values());
  const mostUsefulSymbols = symbolEntries
    .filter((entry) => entry.useful > 0)
    .sort((a, b) => b.useful - a.useful)
    .slice(0, 5)
    .map((entry) => entry.symbol);
  const leastUsefulSymbols = symbolEntries
    .filter((entry) => entry.notUseful > 0)
    .sort((a, b) => b.notUseful - a.notUseful)
    .slice(0, 5)
    .map((entry) => entry.symbol);

  return {
    totalFeedback: feedbackRows.length,
    byType,
    mostUsefulSymbols,
    leastUsefulSymbols,
  };
}

async function computeThemeSignals() {
  const themeKeys = Object.keys(themeIntelligenceService.THEME_DEFINITIONS);
  const evolutions = await Promise.all(
    themeKeys.map((themeKey) => themeIntelligenceService.computeThemeEvolution(themeKey).catch(() => null))
  );

  const strengthenedThemes = [];
  const weakenedThemes = [];
  const disappearedThemes = [];
  for (const evolution of evolutions) {
    if (!evolution) continue;
    if (evolution.strengthened) strengthenedThemes.push(evolution.themeKey);
    if (evolution.weakened) weakenedThemes.push(evolution.themeKey);
    if (evolution.disappeared) disappearedThemes.push(evolution.themeKey);
  }
  return { strengthenedThemes, weakenedThemes, disappearedThemes };
}

async function computeLearningSignals() {
  const [feedbackRows, outcomeSignals, themeSignals] = await Promise.all([
    autonomousRecommendationRepository.listAllFeedback(),
    qualityDashboardService.computeQualityDashboard(),
    computeThemeSignals(),
  ]);

  return {
    feedbackSignals: aggregateFeedbackSignals(feedbackRows),
    outcomeSignals: {
      hitRate: outcomeSignals.hitRate,
      confidenceCalibration: outcomeSignals.confidenceCalibration,
      outcomeCompletion: outcomeSignals.outcomeCompletion,
    },
    themeSignals,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  computeLearningSignals,
  aggregateFeedbackSignals,
};
