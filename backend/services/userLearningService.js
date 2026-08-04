// Phase X10 — Part 1, User Learning Engine. Computes one real, always-
// fresh "learning profile" per beta user directly from real
// AnalyticsEvent rows — no second, duplicate tracking pipe, and no
// materialized snapshot that could go stale. "Continuously evolving"
// here means "recomputed from the real, growing event log on every
// read," not "incrementally updated in place" — simpler, and never at
// risk of drifting from the real underlying data.
const { getPrismaClient } = require("../db/prismaClient");

function requireBetaUser(betaUserId) {
  if (!betaUserId) {
    const error = new Error("A beta user identity is required for the User Learning Engine.");
    error.statusCode = 400;
    throw error;
  }
}

function countBySymbol(events) {
  const counts = new Map();
  for (const event of events) {
    const symbol = event.properties?.symbol;
    if (typeof symbol !== "string") continue;
    counts.set(symbol, (counts.get(symbol) || 0) + 1);
  }
  return Array.from(counts.entries()).map(([symbol, count]) => ({ symbol, count })).sort((a, b) => b.count - a.count);
}

function averageDuration(events) {
  const withDuration = events.filter((event) => Number.isFinite(event.durationMs));
  if (!withDuration.length) return null;
  return Math.round(withDuration.reduce((sum, event) => sum + event.durationMs, 0) / withDuration.length);
}

// Real recommendations viewed but never opened, saved, or dismissed
// within this profile's own event window — "ignored" is a derived
// signal, not a raw event, since a user never explicitly declares
// "I'm ignoring this."
function computeIgnoredRecommendations(eventsByRecommendationId) {
  let ignored = 0;
  for (const events of eventsByRecommendationId.values()) {
    const names = new Set(events.map((event) => event.eventName));
    if (names.has("recommendation_viewed") && !names.has("recommendation_opened") && !names.has("recommendation_saved") && !names.has("recommendation_dismissed")) {
      ignored += 1;
    }
  }
  return ignored;
}

async function getUserLearningProfile(betaUserId) {
  requireBetaUser(betaUserId);
  const prisma = getPrismaClient();
  const events = await prisma.analyticsEvent.findMany({
    where: { betaUserId },
    orderBy: { createdAt: "asc" },
    select: { eventName: true, properties: true, durationMs: true, createdAt: true, screen: true },
  });

  const byRecommendationId = new Map();
  for (const event of events) {
    const recommendationId = event.properties?.recommendationId;
    if (typeof recommendationId !== "string") continue;
    if (!byRecommendationId.has(recommendationId)) byRecommendationId.set(recommendationId, []);
    byRecommendationId.get(recommendationId).push(event);
  }

  const countOf = (eventName) => events.filter((event) => event.eventName === eventName).length;

  return {
    generatedAt: new Date().toISOString(),
    betaUserId,
    totalInteractions: events.length,
    recommendationsViewed: countOf("recommendation_viewed"),
    recommendationsOpened: countOf("recommendation_opened"),
    recommendationsSaved: countOf("recommendation_saved"),
    recommendationsDismissed: countOf("recommendation_dismissed"),
    recommendationsIgnored: computeIgnoredRecommendations(byRecommendationId),
    explanationsExpanded: countOf("recommendation_expanded"),
    explanationsCollapsed: countOf("explanation_collapsed"),
    chartsOpened: countOf("chart_opened"),
    averageChartWatchTimeMs: averageDuration(events.filter((event) => event.eventName === "chart_opened")),
    decisionCenterInteractions: countOf("decision_center_viewed"),
    portfolioActions: countOf("portfolio_viewed"),
    notificationsOpened: countOf("notification_clicked"),
    mostEngagedSymbols: countBySymbol(events.filter((event) => ["recommendation_viewed", "recommendation_opened", "recommendation_saved"].includes(event.eventName))),
    lastActiveAt: events.length ? events[events.length - 1].createdAt : null,
  };
}

module.exports = { getUserLearningProfile };
