const priceAlertRepository = require("./priceAlertRepository");
const notificationService = require("./notificationService");
// Phase X2 — the alert-type extension point. Only PRICE_ABOVE/PRICE_BELOW
// are implemented; see alertTypeRegistry.js for the full documented
// architecture future alert types will plug into.
const alertTypeRegistry = require("./alertTypeRegistry");
// Same existing live-quote infrastructure the portfolio/grading pipeline
// already uses — no new price source, per the mission's explicit
// "use the existing live quote infrastructure" / "do not fabricate prices."
const finnhubService = require("./finnhubService");

const VALID_DIRECTIONS = ["ABOVE", "BELOW"];

function requireBetaUser(betaUserId) {
  if (!betaUserId) {
    const error = new Error("A beta user identity is required for price alerts.");
    error.statusCode = 400;
    throw error;
  }
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function notFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

async function requireOwnedAlert(betaUserId, alertId) {
  const alert = await priceAlertRepository.findAlert(betaUserId, alertId);
  if (!alert) {
    throw notFound("Alert not found.");
  }
  return alert;
}

async function createAlert(betaUserId, { symbol, direction, targetPrice }) {
  requireBetaUser(betaUserId);
  const normalizedSymbol = String(symbol || "").trim().toUpperCase();
  const normalizedDirection = String(direction || "").trim().toUpperCase();
  const normalizedTarget = Number(targetPrice);

  if (!normalizedSymbol) {
    throw badRequest("A symbol is required.");
  }
  if (!VALID_DIRECTIONS.includes(normalizedDirection)) {
    throw badRequest(`direction must be one of: ${VALID_DIRECTIONS.join(", ")}`);
  }
  if (!Number.isFinite(normalizedTarget) || normalizedTarget <= 0) {
    throw badRequest("targetPrice must be a positive number.");
  }

  // Multiple alerts per symbol are explicitly allowed (mission
  // requirement) — no uniqueness check here, by design.
  return priceAlertRepository.createAlert({
    betaUserId,
    symbol: normalizedSymbol,
    direction: normalizedDirection,
    targetPrice: normalizedTarget,
  });
}

async function deactivateAlert(betaUserId, alertId) {
  requireBetaUser(betaUserId);
  await requireOwnedAlert(betaUserId, alertId);
  return priceAlertRepository.deactivateAlert(alertId);
}

async function deleteAlert(betaUserId, alertId) {
  requireBetaUser(betaUserId);
  await requireOwnedAlert(betaUserId, alertId);
  await priceAlertRepository.deleteAlert(alertId);
}

// Enriches every alert with a REAL live quote (never fabricated — a quote
// fetch failure leaves currentPrice/distance honestly null, matching this
// codebase's established "never fabricate" convention throughout the
// D1-D1.8 grading pipeline). "Distance from target" is a real, computed
// number from that same live price, not a separate estimate.
async function listAlerts(betaUserId) {
  requireBetaUser(betaUserId);
  const alerts = await priceAlertRepository.listAlerts(betaUserId);
  const symbols = Array.from(new Set(alerts.map((alert) => alert.symbol)));
  const quotesBySymbol = {};
  await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const payload = await finnhubService.getQuote(symbol);
        quotesBySymbol[symbol] = Number(payload?.quote?.price);
      } catch {
        quotesBySymbol[symbol] = null;
      }
    })
  );

  return alerts.map((alert) => {
    const currentPrice = Number.isFinite(quotesBySymbol[alert.symbol]) ? quotesBySymbol[alert.symbol] : null;
    const targetPrice = Number(alert.targetPrice);
    const distanceFromTarget = currentPrice === null ? null : Number((currentPrice - targetPrice).toFixed(2));
    return {
      id: alert.id,
      symbol: alert.symbol,
      direction: alert.direction,
      targetPrice,
      status: alert.status,
      createdAt: alert.createdAt,
      triggeredAt: alert.triggeredAt,
      triggerPrice: alert.triggerPrice === null ? null : Number(alert.triggerPrice),
      currentPrice,
      distanceFromTarget,
    };
  });
}

// Phase H3 — the real trigger check. Iterates every ACTIVE alert across
// all beta users, fetches a real live quote, and one-time-triggers any
// alert whose condition is genuinely met. Best-effort per alert: one
// symbol's quote failure never blocks checking the rest. Called by
// alertScheduler.js on a cadence, and exposed via a manual endpoint for
// on-demand verification (see priceAlertController.js).
async function checkAndTriggerAlerts() {
  const activeAlerts = await priceAlertRepository.listActiveAlerts();
  const results = [];

  for (const alert of activeAlerts) {
    try {
      const quotePayload = await finnhubService.getQuote(alert.symbol);
      const currentPrice = Number(quotePayload?.quote?.price);
      if (!Number.isFinite(currentPrice)) {
        continue;
      }

      const targetPrice = Number(alert.targetPrice);

      // Phase X2 — routed through the alert-type registry rather than an
      // inline ternary; identical real behavior (PRICE_ABOVE/PRICE_BELOW
      // are the only implemented types), now going through the same
      // extension point future alert types will use.
      const alertTypeName = alert.direction === "ABOVE" ? "PRICE_ABOVE" : "PRICE_BELOW";
      const alertType = alertTypeRegistry.requireImplemented(alertTypeName);
      const triggered = alertType.evaluate({ alert, currentPrice });
      if (!triggered) {
        continue;
      }

      const updated = await priceAlertRepository.markTriggered(alert.id, currentPrice);
      await notificationService.notifyAlertTriggered({
        betaUserId: alert.betaUserId,
        priceAlertId: alert.id,
        symbol: alert.symbol,
        direction: alert.direction,
        targetPrice,
        triggerPrice: currentPrice,
        triggeredAt: updated.triggeredAt,
      });
      results.push({ alertId: alert.id, symbol: alert.symbol, triggerPrice: currentPrice });
    } catch {
      // One alert's quote failure must never block checking the rest.
    }
  }

  return results;
}

module.exports = { createAlert, deactivateAlert, deleteAlert, listAlerts, checkAndTriggerAlerts };
