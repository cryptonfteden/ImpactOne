// Phase X7 — Part 4, Market Dashboard. A curated, high-signal view —
// exactly six real lists, nothing else, per the mission's explicit "no
// information overload." Every list is a real sort/filter over an
// already-real, already-tested data source; nothing here recomputes a
// score a value that lives elsewhere (see MARKET_INTELLIGENCE_ENGINE.md).
const { getPrismaClient } = require("../db/prismaClient");
const portfolioEngineService = require("./portfolioEngineService");
const canonicalEventRepository = require("./canonicalEventRepository");

const LIMIT = 5;

// "Largest positioning changes" has no real historical data source, for
// the same reason decisionCenterService.js and decisionTimelineService.js
// already disclose for Market Positioning/Opportunity Score — no
// snapshot history is persisted. Honestly reported, never fabricated.
const UNAVAILABLE_SOURCES = [
  { source: "largestPositioningChanges", reason: "Market Positioning is computed fresh on each request; no historical snapshot is persisted, so no real 'largest change' can be ranked yet." },
];

function toNumber(value) {
  return value === null || value === undefined ? null : Number(value);
}

async function highestConvictionOpportunities() {
  const prisma = getPrismaClient();
  const recommendations = await prisma.recommendation.findMany({
    where: { status: "ACTIVE", action: "BUY" },
    orderBy: { qualityScore: "desc" },
    take: LIMIT,
  });
  return recommendations.map((recommendation) => ({
    symbol: recommendation.symbol,
    action: recommendation.action,
    qualityScore: toNumber(recommendation.qualityScore),
    reasoning: recommendation.reasoning,
  }));
}

async function highestMarketRisks() {
  const prisma = getPrismaClient();
  const recommendations = await prisma.recommendation.findMany({
    where: { status: "ACTIVE" },
    orderBy: { riskScore: "desc" },
    take: LIMIT,
  });
  return recommendations.map((recommendation) => ({
    symbol: recommendation.symbol,
    riskScore: toNumber(recommendation.riskScore),
    riskLabel: recommendation.riskLabel,
    expectedDownside: recommendation.expectedDownside,
  }));
}

async function largestPortfolioImpacts(betaUserId) {
  const summary = await portfolioEngineService.getPortfolioSummary(betaUserId).catch(() => null);
  const positions = summary?.positions || [];
  return positions
    .slice()
    .sort((a, b) => Math.abs(Number(b.unrealizedPnl || 0)) - Math.abs(Number(a.unrealizedPnl || 0)))
    .slice(0, LIMIT)
    .map((position) => ({ symbol: position.symbol, unrealizedPnl: toNumber(position.unrealizedPnl), quantity: position.quantity }));
}

// "Major macro events" — honestly scoped: real CanonicalEvent category/
// eventType data is too sparse in this codebase today to reliably
// classify "macro" specifically (most providers don't populate a
// consistent category taxonomy yet), so this surfaces the highest-
// credibility recent events overall rather than fabricating a macro
// classifier. Documented, not silently narrowed.
async function majorMarketEvents() {
  const events = await canonicalEventRepository.listRecent({ limit: 50 });
  return events
    .filter((event) => event.credibilityScore !== null)
    .sort((a, b) => Number(b.credibilityScore) - Number(a.credibilityScore))
    .slice(0, LIMIT)
    .map((event) => ({ headline: event.summary, sourceName: event.sourceName, publishedAt: event.publishedAt, credibilityScore: toNumber(event.credibilityScore) }));
}

async function highestAiConfidence() {
  const prisma = getPrismaClient();
  const recommendations = await prisma.recommendation.findMany({
    where: { status: "ACTIVE" },
    orderBy: { confidenceScore: "desc" },
    take: LIMIT,
  });
  return recommendations.map((recommendation) => ({
    symbol: recommendation.symbol,
    action: recommendation.action,
    confidenceScore: toNumber(recommendation.confidenceScore),
  }));
}

async function getExecutiveDashboard(betaUserId) {
  const [opportunities, risks, portfolioImpacts, macroEvents, confidence] = await Promise.all([
    highestConvictionOpportunities(),
    highestMarketRisks(),
    largestPortfolioImpacts(betaUserId),
    majorMarketEvents(),
    highestAiConfidence(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    highestConvictionOpportunities: opportunities,
    highestMarketRisks: risks,
    largestPortfolioImpacts: portfolioImpacts,
    majorMarketEvents: macroEvents,
    largestPositioningChanges: null, // honestly unavailable — see unavailableSources
    highestAiConfidence: confidence,
    unavailableSources: UNAVAILABLE_SOURCES,
  };
}

module.exports = { getExecutiveDashboard };
