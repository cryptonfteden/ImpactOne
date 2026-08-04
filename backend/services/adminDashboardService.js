// Phase X9 — Part 5, Admin Dashboard. Composes already-real data from
// analyticsEventRepository, feedbackRepository, errorReportRepository,
// and betaMetricsService's averageSession — nothing recomputed twice,
// nothing fabricated when a sample is empty.
const analyticsEventRepository = require("./analyticsEventRepository");
const feedbackRepository = require("./feedbackRepository");
const errorReportRepository = require("./errorReportRepository");
const betaMetricsService = require("./betaMetricsService");

async function getAdminDashboard() {
  const [
    dailyActiveUsers,
    weeklySessions,
    averageSession,
    mostUsedScreens,
    mostUsedFeatures,
    errorsBySource,
    totalErrorReports,
    feedbackByType,
    feedbackCount,
    topRecommendationsViewed,
    decisionCenterUsage,
  ] = await Promise.all([
    analyticsEventRepository.countActiveInWindow({ days: 1 }),
    analyticsEventRepository.countActiveInWindow({ days: 7 }),
    betaMetricsService.computeAverageSession(),
    analyticsEventRepository.countByScreen(),
    analyticsEventRepository.countByEventName(),
    errorReportRepository.countBySource(),
    errorReportRepository.count(),
    feedbackRepository.countByType(),
    feedbackRepository.count(),
    analyticsEventRepository.countSymbolPropertyForEvent("recommendation_viewed"),
    analyticsEventRepository.countByEventName().then((rows) => rows.find((row) => row.eventName === "decision_center_viewed")?.count || 0),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    dailyActiveUsers,
    weeklySessions,
    averageSessionLength: averageSession,
    mostUsedScreens,
    mostUsedFeatures: mostUsedFeatures.sort((a, b) => b.count - a.count),
    errors: errorsBySource,
    crashes: totalErrorReports,
    feedbackByType,
    feedbackCount,
    topRecommendationsViewed,
    decisionCenterUsage,
  };
}

module.exports = { getAdminDashboard };
