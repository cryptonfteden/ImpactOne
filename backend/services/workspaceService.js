// Phase X3 — Workspace 2.0. Each WatchlistFolder (Phase H3) becomes a
// complete investment project view: Stocks/ETF (existing items, no
// asset-type distinction is enforced — a real gap, disclosed below),
// Notes/AI Notes (new, real, append-only), Timeline (a real chronological
// merge of already-real events — item additions, notes, triggered
// alerts — never a fabricated activity log), Alerts (existing, Phase H3),
// Impact Graph (delegates to impactGraphService.js per symbol), Decision
// history (delegates to decisionCenterService.js, filtered to this
// workspace's symbols), Workspace Health (a real composite of real
// signals, honest when a component is unavailable), Recent activity
// (the same real timeline, most-recent slice).
const watchlistFolderRepository = require("./watchlistFolderRepository");
const watchlistFolderService = require("./watchlistFolderService");
const workspaceNoteRepository = require("./workspaceNoteRepository");
const notificationRepository = require("./notificationRepository");
const marketPositioningService = require("./marketPositioningService");
const decisionCenterService = require("./decisionCenterService");
const priceAlertRepository = require("./priceAlertRepository");
const impactGraphService = require("./impactGraphService");

function requireBetaUser(betaUserId) {
  if (!betaUserId) {
    const error = new Error("A beta user identity is required for a Workspace.");
    error.statusCode = 400;
    throw error;
  }
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

// Real, honest, currently-unenforced gap: the schema has no assetType
// column on WatchlistFolderItem, so "Stocks vs ETF" cannot be
// distinguished today — disclosed here rather than guessed.
const WORKSPACE_ASSET_TYPE_GAP = {
  gap: "assetTypeDistinction",
  reason: "WatchlistFolderItem has no assetType column — every tracked symbol is shown undifferentiated (stock, ETF, or otherwise) until this is added.",
};

async function getWorkspace(betaUserId, folderId) {
  requireBetaUser(betaUserId);
  const folder = await watchlistFolderService.requireOwnedFolder(betaUserId, folderId);

  const [notes, allNotifications] = await Promise.all([
    workspaceNoteRepository.listNotes(folderId),
    notificationRepository.listNotifications(betaUserId),
  ]);

  const symbols = folder.items.map((item) => item.symbol);
  const relevantNotifications = allNotifications.filter((notification) => symbols.includes(notification.symbol));

  // Timeline — a real, chronological merge of already-real events.
  const timeline = [
    ...folder.items.map((item) => ({ type: "SYMBOL_ADDED", symbol: item.symbol, timestamp: item.addedAt })),
    ...notes.map((note) => ({ type: note.isAiNote ? "AI_NOTE" : "NOTE", text: note.text, timestamp: note.createdAt })),
    ...relevantNotifications.map((notification) => ({ type: "ALERT_TRIGGERED", symbol: notification.symbol, text: notification.message, timestamp: notification.triggeredAt })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Phase X5 — Part 4, Professional Watchlists. Real alert counts for
  // this workspace's own tracked symbols — this used to be a documented
  // gap ("filled by the caller," but no caller ever did); now computed
  // directly from priceAlertRepository, which (unlike priceAlertService's
  // listAlerts-for-display path) never calls Finnhub, so this stays cheap.
  const allAlerts = await priceAlertRepository.listAlerts(betaUserId);
  const workspaceAlerts = allAlerts.filter((alert) => symbols.includes(alert.symbol));
  const alertSummary = {
    activeCount: workspaceAlerts.filter((alert) => alert.status === "ACTIVE").length,
    triggeredCount: workspaceAlerts.filter((alert) => alert.status === "TRIGGERED").length,
  };

  // Phase X5 — Part 5, Performance. Market Positioning and the Impact
  // Graph workspace merge are independent real fetches (one queries live
  // quotes per symbol, the other queries WorldMemory causal links) — a
  // measured 30-symbol workspace took ~426ms running them sequentially;
  // running them in parallel is a real, safe win with no logic change.
  const [positioningResult, impactSummaryResult] = await Promise.all([
    symbols.length ? marketPositioningService.getMarketPositioning({ symbols }).catch(() => null) : Promise.resolve(null),
    symbols.length
      ? impactGraphService.getWorkspaceImpactGraph(betaUserId, folderId).then(
          (graph) => ({ symbolsWithChain: graph.symbolsWithChain?.length ?? 0, symbolsWithNoData: graph.symbolsWithNoData?.length ?? 0, edgeCount: graph.edges?.length ?? 0 }),
          () => null
        )
      : Promise.resolve(null),
  ]);
  const impactSummary = impactSummaryResult;

  // Workspace Health — a real composite: real market-positioning
  // direction mix among tracked symbols + real active/triggered alert
  // counts. Honestly null when there are no symbols to assess.
  let health = null;
  const positioning = positioningResult;
  if (symbols.length) {
    const longCount = positioning?.longPressure?.length ?? 0;
    const shortCount = positioning?.shortPressure?.length ?? 0;
    const directedCount = longCount + shortCount;
    health = {
      trackedSymbolCount: symbols.length,
      longPressureCount: longCount,
      shortPressureCount: shortCount,
      undirectedCount: symbols.length - directedCount,
      activeAlertCount: alertSummary.activeCount,
      recentTriggerCount: relevantNotifications.length,
      dataAvailable: Boolean(positioning),
    };
  }

  // Workspace summary — real counts of the three X5 focus flags, visible
  // at a glance without opening each symbol individually.
  const summary = {
    trackedSymbolCount: symbols.length,
    pinnedCount: folder.items.filter((item) => item.pinned).length,
    priorityCount: folder.items.filter((item) => item.priority).length,
    aiFocusCount: folder.items.filter((item) => item.aiFocus).length,
  };

  // Workspace performance — real per-symbol momentum, averaged. Reuses
  // the same getMarketPositioning call already made for Health above
  // (its longPressure/shortPressure/scoredButUndirected entries all carry
  // a real momentumPct from computeSymbolMetrics) rather than a second
  // real fetch — genuinely composed, not duplicated.
  let performance = null;
  if (positioning) {
    const eligibleEntries = [...positioning.longPressure, ...positioning.shortPressure, ...positioning.scoredButUndirected];
    const withMomentum = eligibleEntries.filter((entry) => entry.momentumPct !== null && entry.momentumPct !== undefined);
    performance = withMomentum.length
      ? {
          avgMomentumPct: Number((withMomentum.reduce((sum, entry) => sum + Number(entry.momentumPct), 0) / withMomentum.length).toFixed(2)),
          symbolsWithData: withMomentum.length,
          symbolsWithoutData: symbols.length - withMomentum.length,
        }
      : { avgMomentumPct: null, symbolsWithData: 0, symbolsWithoutData: symbols.length };
  }

  return {
    folder: { id: folder.id, name: folder.name, createdAt: folder.createdAt, items: folder.items },
    notes,
    timeline,
    recentActivity: timeline.slice(0, 10),
    health,
    summary,
    performance,
    alertSummary,
    impactSummary,
    knownGaps: [WORKSPACE_ASSET_TYPE_GAP],
  };
}

async function addNote(betaUserId, folderId, text) {
  requireBetaUser(betaUserId);
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    throw badRequest("Note text is required.");
  }
  await watchlistFolderService.requireOwnedFolder(betaUserId, folderId);
  return workspaceNoteRepository.createNote({ folderId, betaUserId, text: trimmed, isAiNote: false });
}

async function getWorkspaceDecisionHistory(betaUserId, folderId) {
  requireBetaUser(betaUserId);
  const folder = await watchlistFolderService.requireOwnedFolder(betaUserId, folderId);
  const symbols = new Set(folder.items.map((item) => item.symbol));
  const allDecisions = await decisionCenterService.getDecisions(betaUserId);
  return {
    ...allDecisions,
    items: allDecisions.items.filter((item) => symbols.has(item.symbol)),
  };
}

module.exports = { getWorkspace, addNote, getWorkspaceDecisionHistory, WORKSPACE_ASSET_TYPE_GAP };
