const crypto = require("crypto");
const env = require("../config/env");
const fibonacciEngine = require("./domainAgents/fibonacciAgent/fibonacciAgent");
const intelligenceBusService = require("./intelligenceBus/intelligenceBusService");
const { IMPACTONE_FIBONACCI_PROFILE } = require("./domainAgents/fibonacciAgent/impactOneFibonacciProfile");

const ALLOWED_EVENTS = new Set(["APPROACHING_0886", "ENTERED_0886_ZONE", "INVALIDATED", "LONG", "SHORT"]);
const receivedSignals = new Map();
const MAX_RECENT_SIGNALS = 200;

function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.status = statusCode;
  return error;
}

function normalizeSymbol(value) {
  const raw = String(value || "").trim().toUpperCase();
  const symbol = raw.includes(":") ? raw.split(":").at(-1) : raw;
  return /^[A-Z0-9][A-Z0-9.\-]{0,14}$/.test(symbol) ? symbol : null;
}

function authenticate(providedSecret, configuredSecret = env.TRADINGVIEW_WEBHOOK_SECRET) {
  if (!configuredSecret) throw httpError("TradingView webhook integration is not configured.", 503);
  const supplied = Buffer.from(String(providedSecret || ""));
  const expected = Buffer.from(String(configuredSecret));
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    throw httpError("TradingView webhook authentication failed.", 401);
  }
}

function normalizePayload(payload = {}) {
  const symbol = normalizeSymbol(payload.symbol);
  const event = String(payload.event || "").trim().toUpperCase();
  const timeframe = String(payload.timeframe || "").trim().toUpperCase();
  const barTime = new Date(payload.barTime || payload.time || "");
  const price = Number(payload.price);
  if (!symbol) throw httpError("A valid TradingView symbol is required.", 400);
  if (!ALLOWED_EVENTS.has(event)) throw httpError("The TradingView event is not supported.", 400);
  if (!IMPACTONE_FIBONACCI_PROFILE.allowedWebhookTimeframes.includes(timeframe)) throw httpError("The TradingView timeframe is not supported by the strategy contract.", 400);
  if (!Number.isFinite(price) || price <= 0) throw httpError("A positive TradingView price is required.", 400);
  if (Number.isNaN(barTime.getTime())) throw httpError("A valid TradingView barTime is required.", 400);
  const ageMs = Date.now() - barTime.getTime();
  if (ageMs < -5 * 60 * 1000 || ageMs > 8 * 24 * 60 * 60 * 1000) throw httpError("The TradingView signal is outside the accepted freshness window.", 422);
  return { symbol, event, timeframe, price, barTime: barTime.toISOString(), direction: payload.direction ? String(payload.direction).toUpperCase() : null };
}

function fingerprint(signal) {
  return crypto.createHash("sha256").update([signal.symbol, signal.event, signal.timeframe, signal.barTime].join("|")).digest("hex");
}

function findPoint886(report) {
  return (report?.retracementLevels || []).find((level) => Number(level.ratio) === 0.886) || null;
}

async function receiveWebhook(payload, {
  configuredSecret = env.TRADINGVIEW_WEBHOOK_SECRET,
  generateReport = fibonacciEngine.generateReport,
  publishEvent = intelligenceBusService.publishEvent,
} = {}) {
  authenticate(payload?.secret, configuredSecret);
  const signal = normalizePayload(payload);
  const id = fingerprint(signal);
  if (receivedSignals.has(id)) return { ...receivedSignals.get(id), duplicate: true };

  const report = await generateReport(signal.symbol);
  const point886 = findPoint886(report);
  const point886Price = point886 ? Number(point886.price) : null;
  const distancePct = point886Price ? ((signal.price - point886Price) / point886Price) * 100 : null;
  const { minDistancePct, maxDistancePct } = IMPACTONE_FIBONACCI_PROFILE.entryZone;
  const insideApprovedApproachZone = Number.isFinite(distancePct)
    && distancePct >= minDistancePct
    && distancePct <= maxDistancePct;
  const hasIndependentCalculation = Boolean(report?.dataAvailable && point886);
  const result = {
    accepted: true,
    duplicate: false,
    signalId: id,
    receivedAt: new Date().toISOString(),
    signal,
    strategy: IMPACTONE_FIBONACCI_PROFILE,
    verification: {
      status: hasIndependentCalculation
        ? insideApprovedApproachZone ? "CALCULATED_NOT_CERTIFIED" : "OUTSIDE_APPROVED_ZONE"
        : "INSUFFICIENT_DATA",
      reason: hasIndependentCalculation
        ? insideApprovedApproachZone
          ? "Price is within the approved zone: from the 0.886 point through 5% above it. Pine parity remains pending."
          : "Price is outside the approved zone of 0% through 5% above the 0.886 point."
        : report?.unavailableReason || "ImpactOne could not independently calculate the 0.886 point.",
      point886: point886Price,
      distancePct,
      insideApprovedApproachZone,
      approvedZone: { minDistancePct, maxDistancePct, approachDirection: "FROM_ABOVE" },
      impactOneGeneratedAt: report?.generatedAt || null,
    },
  };
  try {
    const persisted = await publishEvent({
      engineId: "tradingview-fibonacci",
      eventType: signal.event,
      symbols: [signal.symbol],
      confidence: null,
      payload: {
        summary: `TradingView emitted ${signal.event} for ${signal.symbol} on ${signal.timeframe}.`,
        timeframe: signal.timeframe,
        price: signal.price,
        barTime: signal.barTime,
        direction: signal.direction,
        verificationStatus: result.verification.status,
        impactOnePoint886: result.verification.point886,
        distancePct: result.verification.distancePct,
        insideApprovedApproachZone: result.verification.insideApprovedApproachZone,
      },
      provenance: { sourceEngine: "TradingView Pine webhook", sourceUrl: null, signalId: id },
      evidenceRefs: [{ type: "tradingview-alert", id }],
      publishedAt: signal.barTime,
      methodologyVersion: IMPACTONE_FIBONACCI_PROFILE.strategyVersion,
      deduplicationKey: id,
    });
    result.persistence = { status: "PERSISTED", eventId: persisted.id || null, duplicate: Boolean(persisted.duplicate) };
  } catch (error) {
    result.persistence = { status: "FAILED", reason: error.message };
  }
  receivedSignals.set(id, result);
  while (receivedSignals.size > MAX_RECENT_SIGNALS) receivedSignals.delete(receivedSignals.keys().next().value);
  return result;
}

function getStatus() {
  return {
    webhookConfigured: Boolean(env.TRADINGVIEW_WEBHOOK_SECRET),
    datafeedReady: true,
    datafeedResolutions: ["1", "5", "30", "1D", "1W"],
    advancedChartsEnabled: Boolean(env.TRADINGVIEW_CHART_LIBRARY_ENABLED && env.TRADINGVIEW_CHART_LIBRARY_PATH),
    pineParity: IMPACTONE_FIBONACCI_PROFILE.status,
    strategy: IMPACTONE_FIBONACCI_PROFILE,
    recentSignals: receivedSignals.size,
    requirements: {
      advancedChartsAccess: !env.TRADINGVIEW_CHART_LIBRARY_ENABLED,
      libraryPath: !env.TRADINGVIEW_CHART_LIBRARY_PATH,
      webhookSecret: !env.TRADINGVIEW_WEBHOOK_SECRET,
      pineSourceAndGoldenExamples: true,
    },
  };
}

function getInMemoryRecentSignals(limit = 50) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  return [...receivedSignals.values()]
    .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt))
    .slice(0, safeLimit)
    .map((item) => ({ ...item, signal: { ...item.signal } }));
}

async function getRecentSignals(limit = 50, getEvents = intelligenceBusService.getEvents) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  try {
    const events = await getEvents({ engineId: "tradingview-fibonacci", limit: safeLimit });
    if (events.length) {
      return events.slice().reverse().map((event) => ({
        signalId: event.provenance?.signalId || event.deduplicationKey,
        receivedAt: event.ingestedAt,
        signal: {
          symbol: event.symbols?.[0] || null,
          event: event.eventType,
          timeframe: event.payload?.timeframe || null,
          price: event.payload?.price ?? null,
          barTime: event.payload?.barTime || event.publishedAt,
          direction: event.payload?.direction || null,
        },
        verification: {
          status: event.payload?.verificationStatus || "UNKNOWN",
          point886: event.payload?.impactOnePoint886 ?? null,
          distancePct: event.payload?.distancePct ?? null,
        },
        persistence: { status: "PERSISTED", eventId: event.id },
      }));
    }
  } catch {
    // The in-memory accepted alert list remains available during a DB outage.
  }
  return getInMemoryRecentSignals(safeLimit);
}

function resetForTests() { receivedSignals.clear(); }

module.exports = { receiveWebhook, getStatus, getRecentSignals, getInMemoryRecentSignals, normalizePayload, authenticate, resetForTests };
