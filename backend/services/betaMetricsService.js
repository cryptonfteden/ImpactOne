// Phase X9 — Part 7, Beta Metrics. Every number below is computed fresh
// from real, already-persisted rows (AnalyticsEvent, ErrorReport,
// Feedback) — nothing here is a second data pipeline, and nothing is
// estimated when the real sample is empty (an empty/zero metric is
// reported honestly, with its real sample size, never hidden).
const analyticsEventRepository = require("./analyticsEventRepository");
const ttvMetricsService = require("./ttvMetricsService");
const feedbackRepository = require("./feedbackRepository");
const errorReportRepository = require("./errorReportRepository");
const { getPrismaClient } = require("../db/prismaClient");

const FEATURE_EVENTS = [
  "decision_center_viewed", "portfolio_viewed", "market_dashboard_viewed",
  "impact_graph_viewed", "ai_analysis_opened", "workspace_created",
];

function groupBySession(events) {
  const bySession = new Map();
  for (const event of events) {
    if (!event.sessionId) continue;
    if (!bySession.has(event.sessionId)) bySession.set(event.sessionId, []);
    bySession.get(event.sessionId).push(event);
  }
  return bySession;
}

function pct(numerator, denominator) {
  if (!denominator) return null;
  return Math.round((numerator / denominator) * 1000) / 10; // one decimal
}

async function computeActivationRate() {
  const events = await analyticsEventRepository.listEventsWithSession();
  const bySession = groupBySession(events);
  let opened = 0;
  let activated = 0;
  for (const sessionEvents of bySession.values()) {
    const names = new Set(sessionEvents.map((event) => event.eventName));
    if (names.has("first_open") || names.has("app_opened")) {
      opened += 1;
      if (names.has("onboarding_completed")) activated += 1;
    }
  }
  return { rate: pct(activated, opened), activatedSessions: activated, openedSessions: opened };
}

async function computeRetention() {
  const events = await analyticsEventRepository.listEventsWithSession();
  const bySession = groupBySession(events);
  let totalSessions = 0;
  let returningSessions = 0;
  for (const sessionEvents of bySession.values()) {
    totalSessions += 1;
    const days = new Set(sessionEvents.map((event) => new Date(event.createdAt).toISOString().slice(0, 10)));
    if (days.size > 1 || sessionEvents.some((event) => event.eventName === "returning_user")) {
      returningSessions += 1;
    }
  }
  return { rate: pct(returningSessions, totalSessions), returningSessions, totalSessions };
}

async function computeDailyUsage({ days = 14 } = {}) {
  const prisma = getPrismaClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const events = await prisma.analyticsEvent.findMany({
    where: { createdAt: { gte: since }, sessionId: { not: null } },
    select: { sessionId: true, createdAt: true },
  });
  const byDay = new Map();
  for (const event of events) {
    const day = new Date(event.createdAt).toISOString().slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, new Set());
    byDay.get(day).add(event.sessionId);
  }
  return Array.from(byDay.entries())
    .map(([day, sessions]) => ({ day, activeSessions: sessions.size }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

async function computeFeatureAdoption() {
  const events = await analyticsEventRepository.listEventsWithSession();
  const bySession = groupBySession(events);
  const totalSessions = bySession.size;
  const adoption = {};
  for (const featureEvent of FEATURE_EVENTS) {
    let adopted = 0;
    for (const sessionEvents of bySession.values()) {
      if (sessionEvents.some((event) => event.eventName === featureEvent)) adopted += 1;
    }
    adoption[featureEvent] = { rate: pct(adopted, totalSessions), adoptedSessions: adopted, totalSessions };
  }
  return adoption;
}

async function computeAverageSession() {
  const prisma = getPrismaClient();
  const rows = await prisma.analyticsEvent.findMany({
    where: { eventName: "session_ended", durationMs: { not: null } },
    select: { durationMs: true },
  });
  if (!rows.length) return { avgDurationMs: null, sampleSize: 0 };
  const avg = rows.reduce((sum, row) => sum + row.durationMs, 0) / rows.length;
  return { avgDurationMs: Math.round(avg), sampleSize: rows.length };
}

async function computeFeedbackPerUser() {
  const totalFeedback = await feedbackRepository.count();
  const prisma = getPrismaClient();
  const distinctUsers = await prisma.feedback.findMany({ where: { betaUserId: { not: null } }, distinct: ["betaUserId"], select: { betaUserId: true } });
  const userCount = distinctUsers.length;
  return { totalFeedback, distinctUsersWhoGaveFeedback: userCount, feedbackPerUser: userCount ? Math.round((totalFeedback / userCount) * 10) / 10 : null };
}

async function computeCrashFreeSessions() {
  const events = await analyticsEventRepository.listEventsWithSession();
  const bySession = groupBySession(events);
  const totalSessions = bySession.size;
  let crashFree = 0;
  for (const sessionEvents of bySession.values()) {
    if (!sessionEvents.some((event) => event.eventName === "error_encountered")) crashFree += 1;
  }
  return { rate: pct(crashFree, totalSessions), crashFreeSessions: crashFree, totalSessions };
}

async function getBetaMetrics() {
  const [activation, retention, dailyUsage, featureAdoption, timeToValue, averageSession, feedbackPerUser, crashFreeSessions, totalErrorReports] =
    await Promise.all([
      computeActivationRate(),
      computeRetention(),
      computeDailyUsage(),
      computeFeatureAdoption(),
      ttvMetricsService.computeTimeToValueMetrics(),
      computeAverageSession(),
      computeFeedbackPerUser(),
      computeCrashFreeSessions(),
      errorReportRepository.count(),
    ]);

  return {
    generatedAt: new Date().toISOString(),
    activationRate: activation,
    retention,
    dailyUsage,
    featureAdoption,
    timeToFirstValue: timeToValue,
    averageSession,
    feedbackPerUser,
    crashFreeSessions,
    totalErrorReports,
  };
}

module.exports = { getBetaMetrics, computeActivationRate, computeRetention, computeDailyUsage, computeFeatureAdoption, computeAverageSession, computeFeedbackPerUser, computeCrashFreeSessions };
