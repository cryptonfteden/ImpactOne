const notificationRepository = require("./notificationRepository");
const watchlistFolderRepository = require("./watchlistFolderRepository");

function requireBetaUser(betaUserId) {
  if (!betaUserId) {
    const error = new Error("A beta user identity is required for notifications.");
    error.statusCode = 400;
    throw error;
  }
}

function notFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

function dayKey(date) {
  return new Date(date).toISOString().slice(0, 10); // real calendar date, UTC — stable, sortable
}

// Phase X4 — Professional Notification Center. Enriches every real
// notification with its real workspace membership (for grouping and
// deep-linking) and a real deep-link target — never fabricated; a
// notification whose symbol isn't tracked anywhere just has
// workspace: null, not a guessed folder.
async function enrichWithWorkspace(notifications, betaUserId) {
  const folders = await watchlistFolderRepository.listFolders(betaUserId);
  const symbolToFolder = new Map();
  for (const folder of folders) {
    for (const item of folder.items) {
      if (!symbolToFolder.has(item.symbol)) symbolToFolder.set(item.symbol, { id: folder.id, name: folder.name });
    }
  }

  return notifications.map((notification) => {
    const workspace = symbolToFolder.get(notification.symbol) || null;
    return {
      ...notification,
      workspace,
      deepLink: {
        symbol: notification.symbol,
        workspaceId: workspace?.id || null,
      },
    };
  });
}

function groupByDay(notifications) {
  return notifications.reduce((groups, notification) => {
    const key = dayKey(notification.triggeredAt);
    groups[key] = groups[key] || [];
    groups[key].push(notification);
    return groups;
  }, {});
}

function groupByWorkspace(notifications) {
  return notifications.reduce((groups, notification) => {
    const key = notification.workspace?.name || "Untracked";
    groups[key] = groups[key] || [];
    groups[key].push(notification);
    return groups;
  }, {});
}

function groupBySymbol(notifications) {
  return notifications.reduce((groups, notification) => {
    groups[notification.symbol] = groups[notification.symbol] || [];
    groups[notification.symbol].push(notification);
    return groups;
  }, {});
}

async function listNotifications(betaUserId, { groupBy } = {}) {
  requireBetaUser(betaUserId);
  const [rawNotifications, unreadCount] = await Promise.all([
    notificationRepository.listNotifications(betaUserId),
    notificationRepository.countUnread(betaUserId),
  ]);

  const enriched = await enrichWithWorkspace(rawNotifications, betaUserId);

  // Pinned always float to the top, most-recent within each group.
  const pinned = enriched.filter((notification) => notification.isPinned);
  const rest = enriched.filter((notification) => !notification.isPinned);
  const notifications = [...pinned, ...rest];

  let grouped = null;
  if (groupBy === "day") grouped = groupByDay(notifications);
  else if (groupBy === "workspace") grouped = groupByWorkspace(notifications);
  else if (groupBy === "symbol") grouped = groupBySymbol(notifications);

  return { notifications, grouped, unreadCount, pinnedCount: pinned.length };
}

async function markRead(betaUserId, notificationId) {
  requireBetaUser(betaUserId);
  const existing = await notificationRepository.findNotification(betaUserId, notificationId);
  if (!existing) throw notFound("Notification not found.");
  return notificationRepository.markRead(notificationId);
}

async function setPinned(betaUserId, notificationId, isPinned) {
  requireBetaUser(betaUserId);
  const existing = await notificationRepository.findNotification(betaUserId, notificationId);
  if (!existing) throw notFound("Notification not found.");
  return notificationRepository.setPinned(notificationId, isPinned);
}

async function clearNotification(betaUserId, notificationId) {
  requireBetaUser(betaUserId);
  const existing = await notificationRepository.findNotification(betaUserId, notificationId);
  if (!existing) throw notFound("Notification not found.");
  await notificationRepository.deleteNotification(notificationId);
}

// Called only from priceAlertService when a real alert actually triggers
// — never from user input, so message content here is always built from
// real, already-verified alert fields, never fabricated.
async function notifyAlertTriggered({ betaUserId, priceAlertId, symbol, direction, targetPrice, triggerPrice, triggeredAt }) {
  const directionWord = direction === "ABOVE" ? "rose above" : "fell below";
  const message = `${symbol} ${directionWord} your target of $${Number(targetPrice).toFixed(2)} — now $${Number(triggerPrice).toFixed(2)}.`;
  return notificationRepository.createNotification({
    betaUserId,
    priceAlertId,
    symbol,
    message,
    targetPrice,
    triggerPrice,
    triggeredAt,
  });
}

module.exports = { listNotifications, markRead, setPinned, clearNotification, notifyAlertTriggered };
