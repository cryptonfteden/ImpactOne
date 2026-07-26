// Phase X7 — Part 3, Decision Timeline. One real, chronological merge of
// every event source the mission names, scoped to one beta user's real
// tracked/held symbols. Computes nothing new — every entry is read
// directly from an already-real, already-tested source (recommendation
// lifecycle events, real trades, real triggered alerts, real workspace
// activity, real Impact Graph causal links, real ingested news). Two of
// the eight named sources have no real historical data source in this
// codebase (Market Positioning changes, Opportunity Score changes — see
// decisionCenterService.js's identical, pre-existing disclosure for the
// same two gaps) and are honestly reported as unavailable, never faked.
const { getPrismaClient } = require("../db/prismaClient");
const watchlistFolderRepository = require("./watchlistFolderRepository");
const notificationRepository = require("./notificationRepository");
const workspaceNoteRepository = require("./workspaceNoteRepository");
const portfolioEngineService = require("./portfolioEngineService");
const canonicalEventRepository = require("./canonicalEventRepository");

const UNAVAILABLE_SOURCES = [
  { source: "marketPositioningChanges", reason: "Market Positioning is computed fresh on each request; no historical snapshot is persisted, so no real change-over-time can be reported yet." },
  { source: "opportunityScoreChanges", reason: "Opportunity Score is computed fresh on each request (see OPPORTUNITY_SCORE_SPEC.md); no historical snapshot is persisted, so no real 'change' can be reported yet." },
];

function requireBetaUser(betaUserId) {
  if (!betaUserId) {
    const error = new Error("A beta user identity is required for the Decision Timeline.");
    error.statusCode = 400;
    throw error;
  }
}

async function fromNews(trackedSymbols) {
  if (!trackedSymbols.size) return [];
  const recent = await canonicalEventRepository.listRecent({ limit: 200 });
  return recent
    .filter((event) => Array.isArray(event.symbols) && event.symbols.some((symbol) => trackedSymbols.has(symbol)))
    .map((event) => ({
      type: "NEWS",
      timestamp: event.publishedAt || event.ingestedAt,
      symbol: event.symbols.find((symbol) => trackedSymbols.has(symbol)),
      text: event.summary,
      source: event.sourceName || event.sourceType,
    }));
}

async function fromAiDecisions(trackedSymbols) {
  if (!trackedSymbols.size) return [];
  const prisma = getPrismaClient();
  const events = await prisma.recommendationLifecycleEvent.findMany({ orderBy: { occurredAt: "desc" }, take: 100 });
  if (!events.length) return [];
  const recommendationIds = events.map((event) => event.recommendationId);
  const recommendations = await prisma.recommendation.findMany({ where: { id: { in: recommendationIds } } });
  const recommendationsById = new Map(recommendations.map((recommendation) => [recommendation.id, recommendation]));

  return events
    .map((event) => {
      const recommendation = recommendationsById.get(event.recommendationId);
      if (!recommendation || !trackedSymbols.has(recommendation.symbol)) return null;
      return {
        type: "AI_DECISION",
        timestamp: event.occurredAt,
        symbol: recommendation.symbol,
        text: `${recommendation.action} recommendation — ${event.state}`,
      };
    })
    .filter(Boolean);
}

async function fromPortfolioActions(betaUserId) {
  const trades = await portfolioEngineService.getTradeHistory({ betaUserId, limit: 100 }).catch(() => []);
  return trades.map((trade) => ({
    type: "PORTFOLIO_ACTION",
    timestamp: trade.executedAt,
    symbol: trade.symbol,
    text: `${trade.side} ${trade.quantity} @ $${trade.price}`,
  }));
}

async function fromAlerts(betaUserId) {
  const notifications = await notificationRepository.listNotifications(betaUserId);
  return notifications.map((notification) => ({
    type: "ALERT",
    timestamp: notification.triggeredAt,
    symbol: notification.symbol,
    text: notification.message,
  }));
}

async function fromWorkspaceActivity(betaUserId) {
  const folders = await watchlistFolderRepository.listFolders(betaUserId);
  const events = [];
  for (const folder of folders) {
    for (const item of folder.items) {
      events.push({ type: "WORKSPACE_ACTIVITY", timestamp: item.addedAt, symbol: item.symbol, text: `Added to "${folder.name}"` });
    }
    const notes = await workspaceNoteRepository.listNotes(folder.id);
    for (const note of notes) {
      events.push({ type: "WORKSPACE_ACTIVITY", timestamp: note.createdAt, symbol: null, text: `Note added to "${folder.name}": ${note.text}` });
    }
  }
  return events;
}

async function fromImpactGraph(trackedSymbols) {
  if (!trackedSymbols.size) return [];
  const prisma = getPrismaClient();
  // No Prisma relation exists between WorldMemoryCausalLink and
  // WorldMemoryRecord (Sprint 21B's schema links them only by a plain
  // effectRecordId string) — fetched separately and joined in JS, the
  // same pattern impactGraphService.js already uses for the same reason.
  const links = await prisma.worldMemoryCausalLink.findMany({ orderBy: { recordedAt: "desc" }, take: 200 });
  if (!links.length) return [];
  const effectRecords = await prisma.worldMemoryRecord.findMany({ where: { id: { in: links.map((link) => link.effectRecordId) } } });
  const recordsById = new Map(effectRecords.map((record) => [record.id, record]));

  return links
    .map((link) => {
      const effectRecord = recordsById.get(link.effectRecordId);
      const symbols = Array.isArray(effectRecord?.symbols) ? effectRecord.symbols : [];
      const matchedSymbol = symbols.find((symbol) => trackedSymbols.has(symbol));
      if (!matchedSymbol) return null;
      return { type: "IMPACT_GRAPH_UPDATE", timestamp: link.recordedAt, symbol: matchedSymbol, text: link.explanation };
    })
    .filter(Boolean);
}

async function getDecisionTimeline(betaUserId, { limit = 100 } = {}) {
  requireBetaUser(betaUserId);

  const [folders, portfolioSummary] = await Promise.all([
    watchlistFolderRepository.listFolders(betaUserId),
    portfolioEngineService.getPortfolioSummary(betaUserId).catch(() => null),
  ]);
  const trackedSymbols = new Set([
    ...folders.flatMap((folder) => folder.items.map((item) => item.symbol)),
    ...(portfolioSummary?.positions || []).map((position) => position.symbol),
  ]);

  const [news, aiDecisions, portfolioActions, alerts, workspaceActivity, impactGraphUpdates] = await Promise.all([
    fromNews(trackedSymbols),
    fromAiDecisions(trackedSymbols),
    fromPortfolioActions(betaUserId),
    fromAlerts(betaUserId),
    fromWorkspaceActivity(betaUserId),
    fromImpactGraph(trackedSymbols),
  ]);

  const events = [...news, ...aiDecisions, ...portfolioActions, ...alerts, ...workspaceActivity, ...impactGraphUpdates]
    .filter((event) => event.timestamp)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);

  return {
    generatedAt: new Date().toISOString(),
    events,
    unavailableSources: UNAVAILABLE_SOURCES,
    counts: events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {}),
  };
}

module.exports = { getDecisionTimeline, UNAVAILABLE_SOURCES };
