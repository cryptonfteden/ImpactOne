require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const { getPrismaClient } = require("../db/prismaClient");
const betaMetricsService = require("./betaMetricsService");
const feedbackService = require("./feedbackService");
const errorReportService = require("./errorReportService");

test.beforeEach(async () => {
  await truncateAll();
});

async function seedEvent(eventName, sessionId, overrides = {}) {
  const prisma = getPrismaClient();
  return prisma.analyticsEvent.create({ data: { eventName, sessionId, properties: {}, ...overrides } });
}

test("getBetaMetrics returns honest zeros with no real data yet", async () => {
  const metrics = await betaMetricsService.getBetaMetrics();
  assert.equal(metrics.activationRate.rate, null);
  assert.equal(metrics.averageSession.avgDurationMs, null);
  assert.equal(metrics.crashFreeSessions.rate, null);
});

test("activation rate: a real session that opens and completes onboarding counts as activated", async () => {
  await seedEvent("app_opened", "s1");
  await seedEvent("onboarding_completed", "s1");
  await seedEvent("app_opened", "s2"); // opened, never activated
  const result = await betaMetricsService.computeActivationRate();
  assert.equal(result.openedSessions, 2);
  assert.equal(result.activatedSessions, 1);
  assert.equal(result.rate, 50);
});

test("crash-free sessions: a session with a real error_encountered event is excluded from the crash-free count", async () => {
  await seedEvent("app_opened", "s1");
  await seedEvent("error_encountered", "s1");
  await seedEvent("app_opened", "s2");
  const result = await betaMetricsService.computeCrashFreeSessions();
  assert.equal(result.totalSessions, 2);
  assert.equal(result.crashFreeSessions, 1);
  assert.equal(result.rate, 50);
});

test("feature adoption: real per-feature session counts, not blended into one number", async () => {
  await seedEvent("app_opened", "s1");
  await seedEvent("decision_center_viewed", "s1");
  await seedEvent("app_opened", "s2");
  const adoption = await betaMetricsService.computeFeatureAdoption();
  assert.equal(adoption.decision_center_viewed.adoptedSessions, 1);
  assert.equal(adoption.decision_center_viewed.totalSessions, 2);
  assert.equal(adoption.portfolio_viewed.adoptedSessions, 0);
});

test("average session uses real session_ended durations only", async () => {
  await seedEvent("session_ended", "s1", { durationMs: 60000 });
  await seedEvent("session_ended", "s2", { durationMs: 120000 });
  const result = await betaMetricsService.computeAverageSession();
  assert.equal(result.sampleSize, 2);
  assert.equal(result.avgDurationMs, 90000);
});

test("feedback per user reflects real distinct beta users who actually submitted feedback", async () => {
  await feedbackService.submitFeedback({ type: "BUG", message: "one", betaUserId: "beta-1" });
  await feedbackService.submitFeedback({ type: "PRAISE", message: "two", betaUserId: "beta-1" });
  await feedbackService.submitFeedback({ type: "QUESTION", message: "three", betaUserId: "beta-2" });
  const result = await betaMetricsService.computeFeedbackPerUser();
  assert.equal(result.totalFeedback, 3);
  assert.equal(result.distinctUsersWhoGaveFeedback, 2);
  assert.equal(result.feedbackPerUser, 1.5);
});

test("getBetaMetrics composes real crash count from ErrorReport, not AnalyticsEvent", async () => {
  await errorReportService.reportError({ source: "frontend", message: "real crash" });
  const metrics = await betaMetricsService.getBetaMetrics();
  assert.equal(metrics.totalErrorReports, 1);
});
