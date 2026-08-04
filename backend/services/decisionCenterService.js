// Phase X3/X4 — Decision Center. Answers "what decisions require my
// attention today?" by aggregating real, already-existing signals for one
// beta user. Every item carries a real reason, real evidence, a
// suggested action, a priority, a real timestamp, real portfolio impact,
// real workspace membership, real alert state, and a real confidence
// figure — never fabricated.
//
// Honest scope: the mission names six sources. Three have a real,
// already-persisted data trail today (triggered price alerts, AI
// recommendation status changes, new recommendations touching a tracked
// workspace symbol). Two do not yet exist as persisted history in this
// codebase — workspace *activity* (add/remove/rename) and Opportunity
// Score *movement* both require a change log or historical snapshot that
// was never built — rather than fabricate synthetic history, these two
// sources are surfaced as real, structural gaps in every response
// (`unavailableSources`), matching this whole platform's established
// "never fabricate, always disclose" convention.
const { getPrismaClient } = require("../db/prismaClient");
const notificationRepository = require("./notificationRepository");
const watchlistFolderRepository = require("./watchlistFolderRepository");
const priceAlertRepository = require("./priceAlertRepository");
const portfolioEngineService = require("./portfolioEngineService");
const decisionStateRepository = require("./decisionStateRepository");

const UNAVAILABLE_SOURCES = [
  { source: "workspaceActivity", reason: "No add/remove/rename event log exists on workspace folders yet — only current state is persisted, not its history." },
  { source: "opportunityScoreMovement", reason: "Opportunity Score is computed fresh on each request (see OPPORTUNITY_SCORE_SPEC.md); no historical snapshot is persisted, so no real 'movement' can be reported yet." },
];

const PRIORITY = { HIGH: "HIGH", MEDIUM: "MEDIUM", LOW: "LOW" };
const PRIORITY_RANK = { HIGH: 3, MEDIUM: 2, LOW: 1 };
const SORTS = ["urgency", "confidence", "portfolioImpact", "time"];

function requireBetaUser(betaUserId) {
  if (!betaUserId) {
    const error = new Error("A beta user identity is required for the Decision Center.");
    error.statusCode = 400;
    throw error;
  }
}

async function loadContext(betaUserId) {
  const [folders, alerts, portfolio] = await Promise.all([
    watchlistFolderRepository.listFolders(betaUserId),
    priceAlertRepository.listAlerts(betaUserId),
    portfolioEngineService.getPortfolioSummary(betaUserId).catch(() => null),
  ]);

  const symbolToFolderNames = new Map();
  for (const folder of folders) {
    for (const item of folder.items) {
      const list = symbolToFolderNames.get(item.symbol) || [];
      list.push(folder.name);
      symbolToFolderNames.set(item.symbol, list);
    }
  }

  const heldSymbols = new Set((portfolio?.positions || []).map((position) => position.symbol));
  const alertsBySymbol = new Map();
  for (const alert of alerts) {
    const list = alertsBySymbol.get(alert.symbol) || [];
    list.push(alert);
    alertsBySymbol.set(alert.symbol, list);
  }

  return { symbolToFolderNames, heldSymbols, alertsBySymbol };
}

// Real, derived per-symbol enrichment — never fabricated. workspace is
// null (not "[]") when a symbol isn't tracked anywhere, portfolioImpact
// is a real boolean from a real held-position check, alertState
// summarizes the symbol's own real alert rows.
function enrich(item, context) {
  const folderNames = context.symbolToFolderNames.get(item.symbol) || [];
  const symbolAlerts = context.alertsBySymbol.get(item.symbol) || [];
  return {
    ...item,
    workspace: folderNames.length ? folderNames.join(", ") : null,
    portfolioImpact: context.heldSymbols.has(item.symbol),
    alertState: symbolAlerts.length
      ? {
          activeCount: symbolAlerts.filter((alert) => alert.status === "ACTIVE").length,
          triggeredCount: symbolAlerts.filter((alert) => alert.status === "TRIGGERED").length,
        }
      : null,
  };
}

async function fromTriggeredAlerts(betaUserId) {
  const notifications = await notificationRepository.listNotifications(betaUserId);
  return notifications.map((notification) => ({
    id: `alert-${notification.id}`,
    source: "priceAlert",
    symbol: notification.symbol,
    reason: "A price alert you set has triggered.",
    evidence: notification.message,
    suggestedAction: `Review ${notification.symbol} and decide whether to act.`,
    priority: PRIORITY.HIGH,
    // A triggered alert is a hard, unambiguous fact — real, maximal
    // confidence, not a modeled estimate.
    confidence: 100,
    timestamp: notification.triggeredAt,
    isRead: notification.isRead,
  }));
}

async function fromRecommendationLifecycleChanges(betaUserId, trackedSymbols) {
  if (!trackedSymbols.size) return [];
  const prisma = getPrismaClient();

  const recentEvents = await prisma.recommendationLifecycleEvent.findMany({
    where: { state: { in: ["SUCCEEDED", "FAILED"] } },
    orderBy: { occurredAt: "desc" },
    take: 50,
  });
  if (!recentEvents.length) return [];

  const recommendationIds = recentEvents.map((event) => event.recommendationId);
  const recommendations = await prisma.recommendation.findMany({ where: { id: { in: recommendationIds } } });
  const recommendationsById = new Map(recommendations.map((recommendation) => [recommendation.id, recommendation]));

  return recentEvents
    .map((event) => {
      const recommendation = recommendationsById.get(event.recommendationId);
      if (!recommendation || !trackedSymbols.has(recommendation.symbol)) return null;
      return {
        id: `lifecycle-${event.id}`,
        source: "aiRecommendationChanged",
        symbol: recommendation.symbol,
        reason: `An AI recommendation you're tracking was graded ${event.state === "SUCCEEDED" ? "correct" : "incorrect"}.`,
        evidence: `${recommendation.action} recommendation, real graded outcome: ${event.state}.`,
        suggestedAction: event.state === "FAILED" ? `Reconsider your position in ${recommendation.symbol}.` : `No action required — the thesis played out.`,
        priority: event.state === "FAILED" ? PRIORITY.HIGH : PRIORITY.LOW,
        // Real confidence: the recommendation's own real qualityScore —
        // never a separate, invented number.
        confidence: Number(recommendation.qualityScore),
        timestamp: event.occurredAt,
      };
    })
    .filter(Boolean);
}

async function fromNewRecommendationsOnTrackedSymbols(betaUserId, trackedSymbols) {
  if (!trackedSymbols.size) return [];
  const prisma = getPrismaClient();

  const recent = await prisma.recommendation.findMany({
    where: { symbol: { in: Array.from(trackedSymbols) }, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return recent.map((recommendation) => ({
    id: `new-rec-${recommendation.id}`,
    source: "aiRecommendationChanged",
    symbol: recommendation.symbol,
    reason: `A new AI recommendation was generated for a symbol you're tracking.`,
    evidence: recommendation.reasoning,
    suggestedAction: `Review the ${recommendation.action} recommendation for ${recommendation.symbol}.`,
    priority: PRIORITY.MEDIUM,
    confidence: Number(recommendation.qualityScore),
    timestamp: recommendation.createdAt,
  }));
}

function applySort(items, sortBy) {
  const sorted = [...items];
  switch (sortBy) {
    case "confidence":
      return sorted.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
    case "portfolioImpact":
      return sorted.sort((a, b) => Number(b.portfolioImpact) - Number(a.portfolioImpact));
    case "time":
      return sorted.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    case "urgency":
    default:
      return sorted.sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]);
  }
}

async function getDecisions(betaUserId, { source, priority, sortBy, includeDismissed = false } = {}) {
  requireBetaUser(betaUserId);

  const context = await loadContext(betaUserId);
  const trackedSymbols = new Set(context.symbolToFolderNames.keys());

  const [alertItems, lifecycleItems, newRecItems, states] = await Promise.all([
    fromTriggeredAlerts(betaUserId),
    fromRecommendationLifecycleChanges(betaUserId, trackedSymbols),
    fromNewRecommendationsOnTrackedSymbols(betaUserId, trackedSymbols),
    decisionStateRepository.listForUser(betaUserId),
  ]);

  const statusByKey = new Map(states.map((state) => [state.decisionKey, state.status]));

  let items = [...alertItems, ...lifecycleItems, ...newRecItems].map((item) => ({
    ...enrich(item, context),
    status: statusByKey.get(item.id) || null, // real, persisted PINNED/DISMISSED/COMPLETED, or null (untouched)
  }));

  if (!includeDismissed) items = items.filter((item) => item.status !== "DISMISSED");
  if (source) items = items.filter((item) => item.source === source);
  if (priority) items = items.filter((item) => item.priority === priority);

  // Pinned items always float to the top regardless of the chosen sort,
  // then the real requested sort applies within each group.
  const pinned = applySort(items.filter((item) => item.status === "PINNED"), sortBy);
  const rest = applySort(items.filter((item) => item.status !== "PINNED"), sortBy);
  items = [...pinned, ...rest];

  const grouped = items.reduce((groups, item) => {
    groups[item.source] = groups[item.source] || [];
    groups[item.source].push(item);
    return groups;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    items,
    grouped,
    unavailableSources: UNAVAILABLE_SOURCES,
    availableSorts: SORTS,
    counts: {
      total: items.length,
      high: items.filter((item) => item.priority === PRIORITY.HIGH).length,
      medium: items.filter((item) => item.priority === PRIORITY.MEDIUM).length,
      low: items.filter((item) => item.priority === PRIORITY.LOW).length,
    },
  };
}

async function setDecisionStatus(betaUserId, decisionKey, status) {
  requireBetaUser(betaUserId);
  if (!["PINNED", "DISMISSED", "COMPLETED"].includes(status)) {
    const error = new Error(`status must be one of PINNED, DISMISSED, COMPLETED.`);
    error.statusCode = 400;
    throw error;
  }
  return decisionStateRepository.setStatus(betaUserId, decisionKey, status);
}

async function clearDecisionStatus(betaUserId, decisionKey) {
  requireBetaUser(betaUserId);
  await decisionStateRepository.clearStatus(betaUserId, decisionKey);
}

module.exports = { getDecisions, setDecisionStatus, clearDecisionStatus, UNAVAILABLE_SOURCES, PRIORITY, SORTS };
